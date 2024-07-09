## Upgrading the CRDs
kubectl apply -f https://raw.githubusercontent.com/nginxinc/kubernetes-ingress/v3.6.1/deploy/crds.yaml
## install ingress controller
helm install nginx-ingress-controller oci://ghcr.io/nginxinc/charts/nginx-ingress --version 1.3.1 --namespace ingress-nginx