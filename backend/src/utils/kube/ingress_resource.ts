import { KubeConfig, NetworkingV1Api } from '@kubernetes/client-node';

// Define the types for the Ingress manifest
interface IngressRule {
  host: string;
  http: {
    paths: Array<{
      path: string;
      pathType: string;
      backend: {
        service: {
          name: string;
          port: {
            number: number;
          };
        };
      };
    }>;
  };
}

async function pushRule(
  namespace: string,
  ingressName: string,
  host: string,
  serviceName: string,
  kubeConfigText: string,
  subdomain?: string,
  servicePort: number = 80
): Promise<any> {
  try {
    if (!subdomain) subdomain = serviceName;

    // Define the new rule to append
    const newRule: IngressRule = {
      host: `${subdomain}.${host}`,
      http: {
        paths: [
          {
            path: '/',
            pathType: 'Prefix',
            backend: {
              service: {
                name: serviceName,
                port: {
                  number: servicePort,
                },
              },
            },
          },
        ],
      },
    };

    const kc = new KubeConfig();
    kc.loadFromString(kubeConfigText);
    const k8sNetworkingApi = kc.makeApiClient(NetworkingV1Api);

    // Check if the Ingress resource already exists
    let ingressExists = false;
    let ingress;

    try {
      ingress = await k8sNetworkingApi.readNamespacedIngress(ingressName, namespace);
      ingressExists = true;
    } catch (err: any) {
      if (err.response?.statusCode === 404) {
        ingressExists = false;
      } else {
        throw err;
      }
    }

    if (ingressExists) {
      // Ingress exists, append the new rule
      if (ingress?.body?.spec?.rules) {
        ingress.body.spec.rules.push(newRule);
      } else {
        throw new Error('Ingress spec or rules are undefined.');
      }

      // Update the existing Ingress resource
      const res = await k8sNetworkingApi.replaceNamespacedIngress(ingressName, namespace, ingress.body);
      console.log('Ingress updated:', res.body);
    } else {
      // Ingress does not exist, create a new one with the new rule
      const ingressManifest = {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: {
          name: ingressName,
          namespace: namespace,
          annotations: {
            'kubernetes.io/ingress.class': 'nginx',
          },
        },
        spec: {
          rules: [newRule],
        },
      };

      // Create the Ingress resource
      const res = await k8sNetworkingApi.createNamespacedIngress(namespace, ingressManifest);
      console.log('Ingress created:\n');
      const createdIngress: any = res.body;

      if (!createdIngress) throw new Error('Created Ingress is undefined or null.');

      console.log(`Ingress Name: ${createdIngress.metadata.name}`);
      console.log(`Namespace: ${createdIngress.metadata.namespace}`);
      console.log(`Ingress Class: ${createdIngress.spec.ingressClassName || '<none>'}`);
      console.log(`Default Backend: ${createdIngress.spec.defaultBackend ? `${createdIngress.spec.defaultBackend.service.name}:${createdIngress.spec.defaultBackend.service.port.number}` : '<default>'}`);
      console.log('Rules:');
      createdIngress.spec.rules.forEach((rule: IngressRule, index: number) => {
        console.log(`  Rule ${index + 1}:`);
        console.log(`    Host: ${rule.host}`);
        rule.http.paths.forEach((path, pathIndex) => {
          console.log(`      Path ${pathIndex + 1}:`);
          console.log(`        Path: ${path.path}`);
          console.log(`        PathType: ${path.pathType}`);
          console.log(`        Backend Service Name: ${path.backend.service.name}`);
          console.log(`        Backend Service Port: ${path.backend.service.port.number}`);
        });
      });

      console.log(`Annotations: ${JSON.stringify(createdIngress.metadata.annotations || {}, null, 2)}`);
      return {
        "success" : true,
        "metadata" : createdIngress?.metadata,
        "rules" : createdIngress?.spec.rules
      };
    }
  } catch (err: any) {
    console.error('Error creating/updating Ingress resource:', err);
    return {
      "success" : false,
      "message" : `${err?.message}`
    };
  }
}

async function removeRule(
  ingressName: string,
  namespace :string, 
  serviceToRemove: string, 
  kubeConfigText: string
) {
  try {
      // Load kubeconfig (assumes running inside a Kubernetes cluster)
      const kc = new KubeConfig();
      kc.loadFromString(kubeConfigText);

      // Create Kubernetes API client
      const k8sApi = kc.makeApiClient(NetworkingV1Api);

      // Get the existing Ingress object
      const { body: ingress } = await k8sApi.readNamespacedIngress(ingressName, namespace);

      // Modify the Ingress object to remove the specified rule
      if (ingress && ingress.spec && ingress.spec.rules) {
          ingress.spec.rules = ingress.spec.rules.filter(rule => rule?.host?.split('.')[0] !== serviceToRemove);

          // Update the modified Ingress object
          await k8sApi.replaceNamespacedIngress(ingressName, namespace, ingress);
          console.log(`Ingress rule for ${serviceToRemove} removed successfully.`);
          return {
              "success" : true,
              "message" : `Ingress rule for ${serviceToRemove} removed successfully.`
          }
      } else {
          console.log(`Ingress ${ingressName} or its rules not found.`);
          return {
              "success" : false,
              "message" : `Ingress ${ingressName} or its rules not found.`
          }
      }
  } catch (err: any) {
      console.error('Error removing Ingress rule:', err);
      return {
          "success" : false,
          "message" : `${err.message}`
      }
  }
}

async function listRule(
  ingressName: string,
  namespace :string,
  kubeConfigText: string
) {
  try {
      // Load kubeconfig (assumes running inside a Kubernetes cluster)
      const kc = new KubeConfig();
      kc.loadFromString(kubeConfigText);

      // Create Kubernetes API client
      const k8sApi = kc.makeApiClient(NetworkingV1Api);

      // Get the existing Ingress object
      const { body: ingress } = await k8sApi.readNamespacedIngress(ingressName, namespace);

      // Modify the Ingress object to remove the specified rule
      if (ingress && ingress.spec) {
          return {
              "success" : true,
              "rules" : ingress.spec.rules
          }
      } else {
          console.log(`Ingress ${ingressName} not found.`);
          return {
            "success" : false,
            "message" : `Ingress ${ingressName} not found.`
          }
      }
  } catch (err: any) {
      console.error('Error removing Ingress rule:', err);
      return {
          "success" : false,
          "message" : `${err.message}`
      }
  }
}

export { pushRule, removeRule, listRule};

// Example usage (uncomment and replace with your values if needed)
// const namespace = 'default';
// const ingressName = 'api-gateway';
// const host = 'docker.internal'; // The base domain
// const serviceName = 'v2';
// const subdomain = 'v2'; // Optional
// const servicePort = 80; // The service port
// const kubeConfigText = '...'; // Replace with your kubeconfig content

// pushRule(namespace, ingressName, host, serviceName, kubeConfigText, subdomain, servicePort);
