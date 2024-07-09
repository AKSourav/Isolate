const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sNetworkingApi = kc.makeApiClient(k8s.NetworkingV1Api);

async function createOrUpdateIngress(namespace, ingressName, host, serviceName, servicePort = 80) {
  // Define the new rule to append
  const newRule = {
    host: `${serviceName}.${host}`,
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

  try {
    // Check if the Ingress resource already exists
    let ingressExists = false;
    let ingress;
    try {
      ingress = await k8sNetworkingApi.readNamespacedIngress(ingressName, namespace);
      ingressExists = true;
    } catch (err) {
      if (err.response && err.response.statusCode === 404) {
        ingressExists = false;
      } else {
        throw err;
      }
    }

    if (ingressExists) {
      // Ingress exists, append the new rule
      ingress.body.spec.rules.push(newRule);

      // Update the existing Ingress resource
      const res = await k8sNetworkingApi.replaceNamespacedIngress(
        ingressName,
        namespace,
        ingress.body
      );
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
            'kubernetes.io/ingress.class': 'nginx'
          }
        },
        spec: {
          rules: [newRule],
        },
      };

      // Create the Ingress resource
      const res = await k8sNetworkingApi.createNamespacedIngress(namespace, ingressManifest);
      console.log('Ingress created:\n');
      const ingress = res.body;
  
      console.log(`Ingress Name: ${ingress.metadata.name}`);
      console.log(`Namespace: ${ingress.metadata.namespace}`);
      console.log(`Ingress Class: ${ingress.spec.ingressClassName || '<none>'}`);
      console.log(`Default Backend: ${ingress.spec.defaultBackend ? `${ingress.spec.defaultBackend.service.name}:${ingress.spec.defaultBackend.service.port.number}` : '<default>'}`);
      console.log('Rules:');
      ingress.spec.rules.forEach((rule, index) => {
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
  
      console.log(`Annotations: ${JSON.stringify(ingress.metadata.annotations || {}, null, 2)}`);
    }
  } catch (err) {
    console.error('Error creating/updating Ingress resource:', err);
  }
}

// Replace these values with your desired settings
const namespace = 'default';
const ingressName = 'api-gateway';
const host = 'docker.internal'; // The base domain
const serviceName = 'v2';
const servicePort = 3000; // The service port

createOrUpdateIngress(namespace, ingressName, host, serviceName, servicePort);
