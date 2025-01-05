import asyncHandler from 'express-async-handler';
import User, { IUser } from '../models/userModel';
import generateToken from '../config/generateToken';
import {NextFunction, Request, Response} from 'express'

export interface IReq extends Request{
    user?: any;
}

export const registerUser = asyncHandler(async (req: IReq,res: Response)=>{
    const {name, email, password, pic} =req.body;

    if(!name || !email || !password)
    {
        res.status(400);
        throw new Error("Please Enter all the Feilds");
    }

    const userExists = await User.findOne({email});

    if(userExists)
    {
        res.status(400);
        throw new Error("User already Exists");
    }

    const user = await User.create({
        name,
        email,
        password,
        pic,
    });

    if(user)  //Successfully created new user
    {
        res.status(201).json({
            _id: String(user._id),
            name: user.name,
            email: user.email,
            password: user.password,
            token: generateToken(String(user._id)),
        })
    }
    else //if not Successfully created
    {
        res.status(400);
        throw new Error("Failed to create the User");
    }
});


export const authUser =asyncHandler(async (req: IReq,res: Response)=>{
    const {email,password} = req.body;

    const user = await User.findOne<IUser>({email});

    if(user && (await user.matchPassword(password))) // Checking user and natching password if found!
    {
        res.json({
            
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(String(user._id)),
        })
    }
    else
    {
        res.status(401);
        throw new Error("Invalid Email or Password");
    }
});

//   /api/user?search=<anyusename>
export const allUsers = asyncHandler(async (req: IReq,res: Response)=>{
    const keyword = req.query.search ? {
        $or: [
            {name : {$regex: req.query.search, $options: "i"}},
            {email : {$regex: req.query.search, $options: "i"}},
        ]
    }
    :{};

    const users = await User.find(keyword).find({_id: { $ne: req.user._id }}).select("-password");
    res.send(users);
})
