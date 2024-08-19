import * as jwt from "jsonwebtoken";

const generateToken = (id: string) => {
    return jwt.sign({id}, process.env.JWT_SECRET as string || 'anupam',{
        expiresIn: "30d",
    });
}

export default generateToken;