import { User } from "@prisma/client";
import { prismaClient } from "../clients/db";
import jwt from 'jsonwebtoken'

const JWT_SECRET='superman1234'

export class JWTService{
    public static  generateTokenForUser(user:User){

        const payload={
            id: user?.id,
            email:user?.email,
        }
        const token =jwt.sign(payload,JWT_SECRET);
        return token;
    }
}