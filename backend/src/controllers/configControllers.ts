import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import Kube from "../models/kubeConfigs";
import { randomUUID } from 'crypto';

export interface IReq extends Request{
    user?: any;
}

export const addKubeConfig = expressAsyncHandler(async (req: IReq, res: Response)=>{
    var {name,configText,description} = req.body;
    const user = req.user;
    if(!configText) throw new Error("Kube Config Required");
    if(!name) name = `${user.name}-${randomUUID()}`
    const kubeConfig= await Kube.create({
        name,
        configText,
        description,
        createdBy:user._id
    })
    res.status(201).json(kubeConfig);
});

export const listKubeConfig = expressAsyncHandler(async (req: IReq, res: Response):Promise<any>=>{
    const user = req.user;
    const configs = await Kube.aggregate([
        {
            $match:{
                createdBy: user._id
            }
        },
        {
            $project:{
                configText:0
            }
        }
    ])
    return res.status(200).json(configs);
})