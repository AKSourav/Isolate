import { createDeploymentAndService } from "./k8s/create_service";
import { pushRule } from "./k8s/ingress_resource";
import Kube from "./models/kubeConfigs";

type Message={
    type: string,
    data:DeployServiceData | null
}

type ContainerInfo = {
    name?: string | null | undefined;
    namespace: string;
    imageName: string;
    containerPort: number;
    servicePort?: number;
    env?: { [key: string]: string }; // Environment variables for the container
  };

interface DeployServiceData {
    serviceName: string;
    host: string;
    namespace: string;
    containers:ContainerInfo[];
    ingressName: string;
    kubeId: string;
}

const deploy_service_example ={
    type:"DEPLOY_SERVICE",
    data: {
        serviceName:"v1",
        host:"localhost",
        namespace: "default",
        containers: [
            {
                imageName: "aksourav/one-to-one-webrtc",
                containerPort: 80,
                namespace: "default"
            }
        ],
        ingressName:"api-gateway",
        kubeId: "6777f7d65c4f7d4d3020350f"
    }
}

const deploy_service =async (data: DeployServiceData)=>{
    console.log("Hola")
    const namespace = data?.namespace;
    const serviceName = data?.serviceName;
    const deploymentName = data?.serviceName;
    const host = data?.host;
    const containers = data?.containers;
    const kubeId = data.kubeId;
    const kubeInfo = await Kube.findById(kubeId);
    if (!kubeInfo?.configText) throw new Error("Kube Config is absent")
    const kubeConfigText = kubeInfo?.configText;
    // console.log("konfig Text:", kubeConfigText);
    const serviceData = await createDeploymentAndService(namespace,serviceName,deploymentName,containers,kubeConfigText);
    const ingressName = 'api-gateway'
    const optional_host = 'anupamkumarsourav.site';
    const subdomain = serviceName
    const servicePort = 80;
    const ingressData = await pushRule(namespace,ingressName,host || optional_host,serviceName,kubeConfigText,subdomain,servicePort);
        
}

export const handleMessage= async (message : string)=>{
    const parsed_message: Message = JSON.parse(JSON.parse(String(message)));
    console.log("parsed_message:",parsed_message.type, parsed_message.data?.containers, typeof(parsed_message));
    switch(parsed_message.type)
    {
        case "DEPLOY_SERVICE": 
            if(parsed_message.data) await deploy_service(parsed_message.data);
            break;
        default: console.log("NO MATCH for Action");

    }
}