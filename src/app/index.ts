
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { User } from './user';
import { GraphqlContext } from '../interfaces';
import { JWTService } from '../services/jwt';



export async function init(){
    const app = express();
    app.use(bodyParser.json())
    app.use(cors());

    // prismaClient.user.count({
    //     //@ts-ignore
    //    data:{
    //    }
    // })



    const server =new ApolloServer<GraphqlContext>({
        typeDefs:`
        ${User.types}
        type Query{
            ${User.queries}
        }
        `,
        resolvers:{
            Query:{
               ...User.resolvers.queries,
            },
       
        }
    })
    await server.start();
    console.log("After Starting Server")
    app.use('/graphql',expressMiddleware(server,{
        context: async({req,res})=>{
            return{
                user: req.headers.authorization? JWTService.decodeToken(req.headers.authorization.split("Bearer ")[1]) : undefined

            }
        }
    }))
    return app;

}









