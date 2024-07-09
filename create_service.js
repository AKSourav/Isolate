const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);

async function createDeploymentAndService(namespace, deploymentName, imageName, serviceName, containerPort) {
  // Define the deployment manifest
  const deploymentManifest = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: deploymentName,
      namespace: namespace,
    },
    spec: {
      replicas: 1,
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
          containers: [
            {
              name: deploymentName,
              image: imageName,
              ports: [
                {
                  containerPort: containerPort, // Adjust the port based on your application
                },
              ],
            },
          ],
        },
      },
    },
  };

  // Define the service manifest
  const serviceManifest = {
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
      ports: [
        {
          protocol: 'TCP',
          port: containerPort,
          targetPort: containerPort, // Adjust the port based on your application
        },
      ],
      type: 'ClusterIP', // Change to 'NodePort' or 'LoadBalancer' if needed
    },
  };

  try {
    // Create the deployment
    const createDeploymentResponse = await k8sAppsApi.createNamespacedDeployment(namespace, deploymentManifest);
    console.log('Deployment created:', createDeploymentResponse.body);

    // Create the service
    const createServiceResponse = await k8sCoreApi.createNamespacedService(namespace, serviceManifest);
    console.log('Service created:', createServiceResponse.body);
  } catch (err) {
    console.error('Error creating resources:', err);
  }
}

// Replace these values with your desired settings
const namespace = 'default';
const deploymentName = 'v3';
const imageName = 'aksourav/subdomain:v3'; // Replace with your image
const serviceName = 'v3';
const containerPort = 3000

createDeploymentAndService(namespace, deploymentName, imageName, serviceName,containerPort);
