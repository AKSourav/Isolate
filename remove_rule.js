const k8s = require('@kubernetes/client-node');

async function removeIngressRule(ingressName,namespace,serviceToRemove) {
    try {
        // Load kubeconfig (assumes running inside a Kubernetes cluster)
        const kc = new k8s.KubeConfig();
        kc.loadFromDefault();

        // Create Kubernetes API client
        const k8sApi = kc.makeApiClient(k8s.NetworkingV1Api);

        // Get the existing Ingress object
        const { body: ingress } = await k8sApi.readNamespacedIngress(ingressName, namespace);

        // Modify the Ingress object to remove the specified rule
        if (ingress && ingress.spec && ingress.spec.rules) {
            ingress.spec.rules = ingress.spec.rules.filter(rule => rule.host.split('.')[0] !== serviceToRemove);

            // Update the modified Ingress object
            await k8sApi.replaceNamespacedIngress(ingressName, namespace, ingress);
            console.log(`Ingress rule for ${serviceToRemove} removed successfully.`);
        } else {
            console.log(`Ingress ${ingressName} or its rules not found.`);
        }
    } catch (err) {
        console.error('Error removing Ingress rule:', err);
    }
}

// Usage example: specify the host and subdomain you want to remove
const serviceToRemove = 'v2';
const namespace = 'default';
const ingressName = 'api-gateway';
removeIngressRule(ingressName,namespace,serviceToRemove);
