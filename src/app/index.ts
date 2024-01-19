
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { User } from './user';



export async function init(){
    const app= express();
    app.use(bodyParser.json())
    app.use(cors);

    // prismaClient.user.count({
    //     //@ts-ignore
    //    data:{
    //    }
    // })



    const server =new ApolloServer({
        //give schemas
        typeDefs:`
        ${User.types}
        type Query{
            ${User.queries}
        }
        `,
        //solve the schemas
        resolvers:{
            Query:{
               ...User.resolvers.queries,
            },
       
        }
    })
    await server.start();
    app.use('/graphql',expressMiddleware(server))
    return app;

}









