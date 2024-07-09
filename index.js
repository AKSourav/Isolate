// const k8s = require('@kubernetes/client-node');

// const kc = new k8s.KubeConfig();
// kc.loadFromDefault();

// const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

// const main = async () => {
//     try {
//         const podsRes = await k8sApi.listServiceForAllNamespaces('default');
//         console.log(podsRes.body.items[0].metadata);
//     } catch (err) {
//         console.error(err);
//     }
// };

// main();

const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);

const namespace = 'ingress-nginx';  // The namespace where the NGINX Ingress Controller is deployed
const deploymentName = 'nginx-ingress-controller';  // Adjust based on your Helm release name

async function describeIngressControllerDeployment() {
  try {
    const res = await k8sAppsApi.readNamespacedDeployment(deploymentName, namespace);
    console.log(JSON.stringify(res.body, null, 2));
  } catch (err) {
    console.error('Error fetching NGINX Ingress Controller deployment description:', err);
  }
}

describeIngressControllerDeployment();
