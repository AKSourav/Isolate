import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";

import {install_ingress} from '../utils/kube/install_ingress_nginx';
import {createDeploymentAndService} from '../utils/kube/create_service';
import {pushRule} from '../utils/kube/ingress_resource'


export const create_service= expressAsyncHandler(
    async (req: Request, res: Response)=>{
        const kubeconfig=`apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJT0ZuMjlLRGxwRGd3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBeE1qWXhOREExTWpKYUZ3MHpOREF4TWpNeE5ERXdNakphTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURGWHI2ZEVpK21YTE5DMlFSR2JGMml5UWczUWVxYW9icHdMVllMUEhCY1lzQWRCV1YzMExlUHVET3cKMFh4Vk9xeVFZZUJxTHdESXhGalRMSXEzNldiMHp6NUw1ZW15SWtwZDJjRGpBdUhqWVVYa0Q0THlKcGVWTHNBNwpqeCtvWUJmd1NEelByTUl5dFpwdFl5dkt0RDRkVTRqTTdVZlE4cXFTbkhvOXEzcHI4ZWRMdnRmMHdJWXE1cUI3CktMeFpXdzZ1d0NWT1hrZDIzU1VqbGdGcFczOGJ1SW50L0pkRVR3b210REU1cWNqNHJoMVZERjByQm9BV3dsVXUKQno3K2RJT2JLNWdpclV1UU04Z1FKOWFIVHJQS3BnTTc5eVBwVTNNMDFMUnVkVmhSNVdhbkZnUzhLd0U4NU9NUQppMHFjaEVkVkUvRGYyQ2NuWk54SEw0QmRLYjZ2QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJUSmxEUXBVTkQ5MFdDS044ekJ5NDM0TzBvcVZ6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQnFmUUwwMW1uNgpvWmdtMmkxNGxxSisxZFJhVjBNaTluUDBibW5xMlhMZW5xdExQREFiTXZvQzhua1I1RGcyKzA5UWJDOElSRDlsCmxFL0djQ25wRG5YaHNKQmNSZi9EU3JvSk5KNGxzZUFzd2dCc3k2eVZCNUsyeVJzdVMxTURhOUVZV051Sm5QT0wKcUNuTUZPZURDNC9tbkdPUnROV0tSdkZPYXVXNGI0d3V4SjNGWktrSnhXa0FRRDZ6dSt0N3NuSW9QZno1dHFOVgpwKzA2SkRmc0NFSmtpYm5Tcmx1eHhSeUU2YklKVHAzM3QrWWhVK2JlYld2dmhuYjVTbzU2MVBmMVZWN3hpUHEwCjYwV0lJcGNiVmd0cEEvUFdFUUNpTWxxWk90K3hSc1BLblRrUFNwbkltbnVydjhVaXdVOEZ1VVM0WTdhVUJCK2EKcVVwZXJ1YTVHSWlyCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K
    server: https://B3025D6D7877A52A4A5952AFC56BAB31.gr7.ap-south-1.eks.amazonaws.com
  name: arn:aws:eks:ap-south-1:232191043520:cluster/TestCluster
contexts:
- context:
    cluster: arn:aws:eks:ap-south-1:232191043520:cluster/TestCluster
    user: arn:aws:eks:ap-south-1:232191043520:cluster/TestCluster
  name: arn:aws:eks:ap-south-1:232191043520:cluster/TestCluster
current-context: arn:aws:eks:ap-south-1:232191043520:cluster/TestCluster
kind: Config
preferences: {}
users:
- name: arn:aws:eks:ap-south-1:232191043520:cluster/TestCluster
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      args:
      - --region
      - ap-south-1
      - eks
      - get-token
      - --cluster-name
      - TestCluster
      - --output
      - json
      command: aws
`
        const {serviceName, imagURL, kubeConfigText, host } = req.body();
        const deploymentName = serviceName;
        const namespace = 'default';
        const containers= [
            {
                name: serviceName,
                namespace: 'default',
                imageName: imagURL,
                containerPort: 80,
                servicePort: 80
            }
        ]
        const serviceData = await createDeploymentAndService(namespace,serviceName,deploymentName,containers,kubeConfigText);
        const ingressName = 'api-gateway'
        const optional_host = 'anupamkumarsourav.site';
        const subdomain = serviceName
        const servicePort = 80;
        const ingressData = await pushRule(namespace,ingressName,host || optional_host,serviceName,kubeConfigText,subdomain,servicePort);
        res.status(201).json({service:serviceData,ingressData:ingressData});
    }
)