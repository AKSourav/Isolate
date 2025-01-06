# ISOLATE

## SYSTEM DIAGRAM
![Diagram](/assets/Diagram.png)

## Upgrading the CRDs
kubectl apply -f https://raw.githubusercontent.com/nginxinc/kubernetes-ingress/v3.6.1/deploy/crds.yaml
## install ingress controller
echo <your-github-token> | helm registry login ghcr.io -u <your-github-username> --password-stdin

```
helm install nginx-ingress-controller oci://ghcr.io/nginxinc/charts/nginx-ingress --version 1.3.1 --namespace ingress-nginx
```

OR

```
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx --namespace default --create-namespace
```