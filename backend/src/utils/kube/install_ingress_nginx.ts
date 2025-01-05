import * as k8s from '@kubernetes/client-node';
import axios from 'axios';

async function applyYaml(yaml: string, k8sApi:any) {
  const yamlDocuments = k8s.loadAllYaml(yaml);

  for (const doc of yamlDocuments) {
    try {
      // Create or update the resource
      await k8sApi.create(doc as k8s.KubernetesObject);
      console.log(`Created resource: ${doc.metadata?.name}`);
    } catch (err:any) {
      if (err.body && err.body.reason === 'AlreadyExists') {
        // If resource already exists, update it
        await k8sApi.patch(
          doc as k8s.KubernetesObject,
          undefined,
          undefined,
          undefined,
          {
            headers: { 'Content-Type': 'application/merge-patch+json' },
          }
        );
        console.log(`Updated resource: ${doc.metadata?.name}`);
      } else {
        console.error(`Failed to apply resource: ${doc.metadata?.name}`, err);
        throw err;
      }
    }
  }
}

export async function install_ingress(
    kubeConfigText: string,
) {
    const kc = new k8s.KubeConfig();
    kc.loadFromString(kubeConfigText);
    const k8sApi = kc.makeApiClient(k8s.KubernetesObjectApi);
    const nginxIngressUrl = 'https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml';

    try {
        // Fetch the NGINX Ingress Controller manifest
        const response = await axios.get(nginxIngressUrl);
        const manifestYaml = response.data;

        // Apply the manifest to the cluster
        await applyYaml(manifestYaml, k8sApi);
        console.log('NGINX Ingress Controller applied successfully.');
        return {
            "success" : true,
            "message" : "NGINX Ingress Controller applied successfully."
        };
    } catch (error) {
        console.error('Failed to apply NGINX Ingress Controller:', error);
        return {
            "success" : false,
            "message" : `Failed to apply NGINX Ingress Controller: ${error}`
        };
    }
}
