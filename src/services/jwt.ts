import { User } from "@prisma/client";
import { prismaClient } from "../clients/db";
import jwt from 'jsonwebtoken'
import { JWTUser } from "../interfaces";

const JWT_SECRET = 'superman1234'

export class JWTService {
    public static generateTokenForUser(user: User) {

        const payload: JWTUser = {
            id: user?.id,
            email: user?.email,
        }
        const token = jwt.sign(payload, JWT_SECRET);
        return token;
    }

    public static decodeToken(token: string) {
        try {
            return jwt.verify(token, JWT_SECRET) as JWTUser

        } catch (err) {
            return null
        }
    }
}