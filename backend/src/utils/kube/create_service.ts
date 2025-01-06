import { AppsV1Api, CoreV1Api, KubeConfig } from '@kubernetes/client-node';

type ContainerInfo = {
  name?: string | null | undefined;
  namespace: string;
  imageName: string;
  containerPort: number;
  servicePort?: number; // Make servicePort optional
  env?: { [key: string]: string }; // Environment variables for the container
};

async function createDeploymentAndService(
  namespace: string,
  serviceName: string | undefined | null,
  deploymentName: string,
  containers: ContainerInfo[],
  kubeConfigText: string,
  imagePullSecretName?: string, // Optional imagePullSecretName
  imagePullSecretData?: { // Optional imagePullSecretData
    server: string;
    username: string;
    password: string;
    email: string;
  },
  replicas: number = 1
): Promise<any> {
  const kc = new KubeConfig();
  kc.loadFromString(kubeConfigText);
  
  const k8sAppsApi = kc.makeApiClient(AppsV1Api);
  const k8sCoreApi = kc.makeApiClient(CoreV1Api);

  // Define the image pull secret manifest if provided
  const imagePullSecretManifest : any = imagePullSecretData ? {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: imagePullSecretName || deploymentName,
      namespace: namespace,
    },
    type: 'kubernetes.io/docker-configjson',
    data: {
      '.dockerconfigjson': Buffer.from(JSON.stringify({
        auths: {
          [imagePullSecretData.server]: {
            username: imagePullSecretData.username,
            password: imagePullSecretData.password,
            email: imagePullSecretData.email,
            auth: Buffer.from(`${imagePullSecretData.username}:${imagePullSecretData.password}`).toString('base64'),
          },
        },
      })).toString('base64'),
    },
  } : undefined;

  // Define the deployment manifest
  const deploymentManifest :any = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: deploymentName,
      namespace: namespace,
    },
    spec: {
      replicas: replicas,
      selector: {
        matchLabels: {
          app: deploymentName,
        },
      },
      template: {
        metadata: {
          labels: {
            app: deploymentName,
          },
        },
        spec: {
          containers: containers.map((container:ContainerInfo) => ({
            name: container.name || deploymentName + '-' + container.containerPort,
            image: container.imageName,
            ports: [
              {
                containerPort: container.containerPort,
              },
            ],
            env: container.env ? Object.keys(container.env).map(key => ({
              name: key,
              value: container.env![key],
            })) : undefined,
          })),
          imagePullSecrets: imagePullSecretName ? [
            {
              name: imagePullSecretName,
            },
          ] : undefined,
        },
      },
    },
  };

  // Define the service manifest
  const serviceManifest : any = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: serviceName,
      namespace: namespace,
    },
    spec: {
      selector: {
        app: deploymentName,
      },
      ports: containers.map((container) => ({
        protocol: 'TCP',
        port: container.servicePort ?? container.containerPort,
        targetPort: container.containerPort,
      })),
      type: 'ClusterIP',
    },
  };

  // Track created resources
  const createdResources: Array<() => Promise<any>> = [];

  try {
    // Handle image pull secret if provided
    if (imagePullSecretName && imagePullSecretManifest) {
      try {
        await k8sCoreApi.readNamespacedSecret(imagePullSecretName, namespace);
        console.log('Image pull secret already exists. Overwriting...');
        await k8sCoreApi.deleteNamespacedSecret(imagePullSecretName, namespace);
        console.log('Existing image pull secret deleted.');
      } catch (err: any) {
        if (err.response?.statusCode !== 404) {
          throw err; // Re-throw if the error is not a 404
        }
        console.log('Image pull secret does not exist. Creating new secret...');
      }

      const createSecretResponse = await k8sCoreApi.createNamespacedSecret(namespace, imagePullSecretManifest);
      createdResources.push(() => k8sCoreApi.deleteNamespacedSecret(imagePullSecretName, namespace)); // Track for rollback
      console.log('Image pull secret created:', createSecretResponse.body);
    }

    // Create the deployment
    const createDeploymentResponse = await k8sAppsApi.createNamespacedDeployment(namespace, deploymentManifest);
    createdResources.push(() => k8sAppsApi.deleteNamespacedDeployment(namespace, deploymentName)); // Track for rollback
    console.log('Deployment created:', createDeploymentResponse.body);

    // Create the service
    const createServiceResponse = await k8sCoreApi.createNamespacedService(namespace, serviceManifest);
    //@ts-ignore
    createdResources.push(() => k8sCoreApi.deleteNamespacedService(namespace, serviceName || deploymentName)); // Track for rollback
    console.log('Service created:', createServiceResponse.body);

    return {
      "success": true,
      "message" : "Service Created Successfully"
    }

  } catch (err) {
    console.error('Error creating resources:', err);

    // Rollback created resources
    for (const rollback of createdResources) {
      try {
        await rollback();
        console.log('Rolled back resource.');
      } catch (rollbackErr) {
        console.error('Error rolling back resource:', rollbackErr);
      }
    }

    throw err; // Re-throw the original error after rollback
  }
}
const listServices = async (kubeConfigText: string)=>{
  const kc = new KubeConfig();
  kc.loadFromString(kubeConfigText);
  
  const k8sAppsApi = kc.makeApiClient(AppsV1Api);
  const k8sCoreApi = kc.makeApiClient(CoreV1Api);
  try{
    const response = k8sCoreApi.listServiceForAllNamespaces();
    return response;
  }
  catch( err: any)
  {
    console.log(err);
    throw err
  }
}

export { createDeploymentAndService, listServices };

// Example usage
// const namespace = 'default';
// const deploymentName = 'my-deployment';
// const serviceName = 'my-service';
// const containers: ContainerInfo[] = [
//   {
//     namespace: 'default',
//     imageName: 'aksourav/one-to-one-webrtc:latest',
//     containerPort: 80,
//     servicePort: 8080, // Optional; can be omitted
//     env: { // Environment variables specific to this container
//       NODE_ENV: 'production',
//       PORT: '8080',
//     },
//   },
//   {
//     namespace: 'default',
//     imageName: 'aksourav/subdomain',
//     containerPort: 3000,
//     // servicePort is not provided, so it will default to containerPort
//     env: { // Environment variables specific to this container
//       API_URL: 'http://api.example.com',
//     },
//   },
// ];
// const kubeConfigText = `apiVersion: v1
// clusters:
// - cluster:
//     certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQzM4aERQN3crZ2N3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1qWXhOelV4TWpCYUZ3MHpOREEyTWpReE56VTJNakJhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURUM2s0b3FnVnZlSHZsNjJSZjZEdW0rb3FpcXVqaVJvZjd3ZlRuTHlCS2N3NkNRQVNUdkNqNFRlMk0KbnI0U2tRVUhqS2JhN25XV1dKYUhoWVJNa0puTVh2T2V2elk4VXZmQzhhV3A3cnpReTl1VjZMWjcrTVZTcUNZRQpvQTBGZG1nRlhqN1c3T2FRTlQ4NVozTElnckZEQjlmUTNsNVlJN2VJVDBQa25uWk5pQlJzVUxteWl1cTFZYkRyClhreHp4V2Z6N1dDMXBsVUNrNHBIQXdxanlMNjg2OWE1ZDZJOEVMK1VIYnNid0g0SDQxWU03YUEwY0FrR2U2ZFEKdGhvYVJyNHNhdElYNDk2SmdiK3A0SDJ3NXNVTlhNZ2xSVXppaktHYnR0YUcwVG5yVUxSczUzRVN0RStXTTZQTAo0SHNGM0hGREUxcnRCTW1RREljbTZST2xxT3JmQWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJRdXVCQWxnczFZb3lDNjZMM28wQ21VaFF6ekJqQVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQ0gwOXEyNWdZZgpTL01aTTBtSE1rY2RLaFhKM0hVV2JEUVRhWE5Zc1JKS0lXazdSdTRwU3l4ZWt1OW5RWGpROXJUYlExYzR0SWZUClhydnRiTjFrYW9PYUdqdk9RYXZzLzBjYlQyS3BZMThiWk12NWdhQWhnSGxka24yV24zeWxjOXgvMzVvRUc1UDYKY1Y1RVMrdGNZQzhacGtqNXQwVFprYVh3eGhTb0thQ0RoZFk0cjVGWmhxbUNKQ3hwV0orc0RxUXB2SXZmK3dtdQo2UGNtVnhHbURXamR2UXpTSkpYWkJlNCtPTE1tM3VqY2NVRmlCRDRLNFdPNmR2a2E3YnpzaFZQRHg4cUxHSTg0CnJBVTlwZlBEMWJpUlpySjkxbExWdDByaGI2YWRLeDU1dUJaOXVORWVic09XYnJOa1lyRXNxcVh4WmNMcWlIL1UKRituUmVuSVFZUzlOCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K
//     server: https://kubernetes.docker.internal:6443
//   name: docker-desktop
// contexts:
// - context:
//     cluster: docker-desktop
//     user: docker-desktop
//   name: docker-desktop
// current-context: docker-desktop
// kind: Config
// preferences: {}
// users:
// - name: docker-desktop
//   user:
//     client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURRakNDQWlxZ0F3SUJBZ0lJZkZtcEQ4VERPaE13RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1qWXhOelV4TWpCYUZ3MHlOVEEyTWpZeE56VTJNakZhTURZeApGekFWQmdOVkJBb1REbk41YzNSbGJUcHRZWE4wWlhKek1Sc3dHUVlEVlFRREV4SmtiMk5yWlhJdFptOXlMV1JsCmMydDBiM0F3Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLQW9JQkFRRGU1am5INWdFaVVDSk8KRmp5eTNTbVFZWWZ5UkJCdW0wOE8vZjduY0lhdXlMQlZtREdXTXRkaUcwbElUOUs5VFRlWmpPY3IxN3o5Umplego2L0ZUNFhoV01UOTIzK1dweXM2T1YzaC9OaDlXQm45RHU3NlhEMGl6VE9qRkx2dk1KcXplLzEvZjJYNlcwc0pYClNSbkhTVGJZL2lSakdITVdZb2pKNm9WdlhHVXdNeVArN1BiZkFiNU45TExBY0ZJaGNjNHo0MDViSjJid3hiQ2IKTE04WGIweUVxRVdnUUFEYkVOTUdxM2RGQ1ByWElYVzY4WDNRL3pIdWdiMGdFZ2FRSDhKQnZWcnVhTWNoMnJMWApIbWQ0Z2NXY1hBbnUrNkpDOFo5WDBlMDYrSzR0dFpzcGcwV1dTVXRldUdVTTZXZVpSZ1hjY1dRTmhHbzlpQW13CkxwVmgzQTVYQWdNQkFBR2pkVEJ6TUE0R0ExVWREd0VCL3dRRUF3SUZvREFUQmdOVkhTVUVEREFLQmdnckJnRUYKQlFjREFqQU1CZ05WSFJNQkFmOEVBakFBTUI4R0ExVWRJd1FZTUJhQUZDNjRFQ1dDelZpaklMcm92ZWpRS1pTRgpEUE1HTUIwR0ExVWRFUVFXTUJTQ0VtUnZZMnRsY2kxbWIzSXRaR1Z6YTNSdmNEQU5CZ2txaGtpRzl3MEJBUXNGCkFBT0NBUUVBenFZMUdEZUxRV2RKeW1aZ3BDM3ZKODl5OUM5bzRJVHZYNzJLK2xPVWZhY2ZlVkc1OENOSTE3T28KNjBVSnZQZ08rRE5pVERWa3o2NE1RTkhEWG1aTWN5V1RIWEp6Y2JpVkk2SWlwcVNkQnJ4eDlEM2VtblpTdkpwdgpQOHpGa3hDdFlMVS90ZVBmeHpoUVhNWWxtajNQbWVTWE1zNnBKU2IxeUxRNjQrUi9BRklMbVZoYjQrYUxBeHJ3CmlkemxQYzI4c1ZxVUY1TWs0Um5PV2JMT3BjTDhlR2p0M3Z0a25nNHpjNjBXWjZSTlNhdzRCcXBjaFdOakkzS3gKRGFFRXNJSENqYTA0OVF1dlFzRkJDUkp2dXlWTlF3UWNLVUlyL25saWxvbnZ4WWhZZWJyT3lnSWxuUDJzYWE0eQpMbm11NXArK1FUQzNKZDJsblZmOUxuaDlwMXNFd3c9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
//     client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBM3VZNXgrWUJJbEFpVGhZOHN0MHBrR0dIOGtRUWJwdFBEdjMrNTNDR3JzaXdWWmd4CmxqTFhZaHRKU0UvU3ZVMDNtWXpuSzllOC9VWTNzK3Z4VStGNFZqRS9kdC9scWNyT2psZDRmellmVmdaL1E3dSsKbHc5SXMwem94Uzc3ekNhczN2OWYzOWwrbHRMQ1Ywa1p4MGsyMlA0a1l4aHpGbUtJeWVxRmIxeGxNRE1qL3V6Mgozd0crVGZTeXdIQlNJWEhPTStOT1d5ZG04TVd3bXl6UEYyOU1oS2hGb0VBQTJ4RFRCcXQzUlFqNjF5RjF1dkY5CjBQOHg3b0c5SUJJR2tCL0NRYjFhN21qSElkcXkxeDVuZUlIRm5Gd0o3dnVpUXZHZlY5SHRPdml1TGJXYktZTkYKbGtsTFhyaGxET2xubVVZRjNIRmtEWVJxUFlnSnNDNlZZZHdPVndJREFRQUJBb0lCQUg4UEliVFBhYW9UbjlwLwpWbzVtLzhCcnVFRGpoN0psR2NYa0I2QUtSdHZ2VG9VY1FuZnA5MWpYVVFqRlo4Mjg3SXE5QlRHNnd1SmxXbTlYCmViTmsvV0cwcFFhd1RveGhMU2w2dHhkYzFMUUc5Qmk2TnNTSlU5blJaNGF2WjUxU0ZvenZhY21DZzJTYU0ybnEKSTZXMEdHM05RUlN6NVRiSGFFNGhQM3JoWWxUOFlaWnJBblRrYWZUdCtoVFJ5eXh0R2VPV1JzeDRwVC9ZalN4awpMZzZkRWp0d1dGVmpaVXBDaVo4dkFzNktnNE5xRWNzK2psMUlNbTlNWGw5aEhMN0lwSVRZYzBuY3NEMTJ4OThQCkN3Wkx1WDJGS2t1Mms2MXVjenRJRjlpRjVtK3VydjJuMVJtTytLN1FZc2d5SGxXVU5rak9EdzY2dHduYkRoRksKb2FjNVU3RUNnWUVBNitEbVJ5cGlTUE4rWlVRUXltcHNvTHFlSnF6VXJtODRUbDlYdHBzelBOVzdDb2FESmhQRwpYaWlxU0xXai9veDJxaFNWbFZwRkhudDEvWUl3V2RNVThVRk1FbU03L2FtMnBSQUQzQWRQL0VPejI3QUhsNWxICkhVQ2gvYlpJSk5QclllWURyZ211aDBzb3R0dmhINDlWK3NKYmM2eUdST3Bwc2VubzMrSk9hSXNDZ1lFQThlbmoKS0FuRWUrKzJhS2hvcjI1aGNHZkVkZEt6VzdSZlpVd1hXM3dXL3h3MVR1Z0xYZ0luN3hDZ25XaytaNml3R3RmbQpxWmxYcVNDdmh6d3h0bU04YnlMZENIRXdvekNHSlk2elRYaTlyV0VOdzl3aDhkUXR4YmJLRHBIMVAzdC9RK0lGCmF4dDdLUFpMRXlkck4wQ0NGbFZOdStIbjNOajJraUVHQnlzdzN1VUNnWUVBbEFwMi9MdFJMRkFHU0RCTUNYNTUKNXZhNVE3UzlWeTFldlhHQmI0NUF2akcyVG9qVnp4UWlMLzU5d1Z5ZkxLZWo0bU5BN3BmVlFhaGpDVlNvVy9mcQo4Ty8yZXFQbGh2TDVPdWV1Ukc0aWVVVlVvTkQrTXR0MGtwdDZEKzVUb1NtUVZjVXpFZ3ZwaWVoV0NVNC9JTHVwClR0U2s2UmlpdktZUzZDTFNrWkZMZkxrQ2dZQWNxWjZkZnRMRjhIZ0hYSFRTM0Z3MUtrWlB3NEEyekY5RkxFZlUKTWhhemNVOHJvemk5a2JuVGpIL0xSczM3RURTVmFhRk4xUHBhOHFGNWYzdFFaZCtpTjFwREJzNUJkNTFkVTlRUQp5TTZJZldoWkhYcjBJVFN2S1dJMWFidktJc0xJY3o0N0c0MXpKQU52S0l0K2gya2laa2NJak5LaEN4L2ozbi9OClY2TzV0UUtCZ1FDZGN1cHBqNTQzbFNuakRlbHkvcDlEK3NGR0l6U0pEem13NFdwOHJpTVRkWkdpYWpENzFOQ00KWjZUb2NyTWtSZEZwYUk0OC9ycW1LNXRtMU93VlI3VFU1SkwxQ1krVDlxK3EweTJ6dTNDMS9jeHJEemJSYVRwTwpsMHpWR2VJeThzZ1lmV0ROcnhhditJUlNCdEFUaFBFRklBbzlzWk5NMUloZHYyNEFLRUpUVEE9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=
// `; // Replace with your kubeconfig content
// const imagePullSecretName = 'my-image-pull-secret'; // Optional; pass if needed
// const imagePullSecretData = {
//   server: 'https://index.docker.io/v1/', // Docker Hub or other registry URL
//   username: 'myusername',
//   password: 'mypassword',
//   email: 'myemail@example.com',
// };
// createDeploymentAndService(namespace, serviceName, deploymentName, containers, kubeConfigText, imagePullSecretName, imagePullSecretData);
