import * as jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel'; // Assuming you are using ES modules

// Extend the Request interface to include the user property
interface AuthenticatedRequest extends Request {
    user?: any;
}

export const protect = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            // console.log(process.env.JWT_SECRET,"token:",token);
            // Decodes token id
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;

            // Find the user and attach it to the request object (excluding password)
            req.user = await User.findById(decoded.id).select("-password");

            next();
        } catch (error) {
            // console.error(error);
            res.status(401);
            throw new Error("Not authorized, token failed");
        }
    }

    if (!token) {
        res.status(401);
        throw new Error("Not authorized, no token");
    }
});
