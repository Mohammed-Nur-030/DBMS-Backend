import axios from 'axios';
import { prismaClient } from '../../clients/db';
import { JWTService } from '../../services/jwt';
import { GraphqlContext } from '../../interfaces';
import { User } from '@prisma/client';
import { UserService } from '../../services/user';

interface GoogleTokenResult {
  iss?: string;
  azp?: string;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string;
  nbf?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
  iat?: string;
  exp?: string;
  jti?: string;
  alg?: string;
  kid?: string;
  typ?: string;
}

export const queries = {
  verifyGoogleToken: async (parent: any, { token }: { token: string }) => {
    try {
      console.log("Inside")
      const googleToken = token; 
      const googleOauthURL = new URL('https://oauth2.googleapis.com/tokeninfo');
      googleOauthURL.searchParams.set('id_token', googleToken);
    /* ------------------------------OR------------------------------------------------- */
      // const googleOauthURL=`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`

      const { data } = await axios.get<GoogleTokenResult>(googleOauthURL.toString(), {
        responseType: 'json',
      });

      console.log("data",data)

      const user = await prismaClient.user.findUnique({ where: { email: data.email } });

      if (!user) {
        await prismaClient.user.create({
          data: {
            email: data.email!,
            firstName: data.given_name!,
            lastName: data.family_name,
            profileImageUrl: data.picture!,
          },
        });
        // return "USER CREATED SUCCESSFULLY"
      }

      const userInDB = await prismaClient.user.findUnique({ where: { email: data.email } });

      if (!userInDB) {
        throw new Error('User with Email Not Found');
      }

      const userToken = JWTService.generateTokenForUser(userInDB);

      return userToken;
    } catch (error) {
      // Handle errors appropriately
      console.error('Error in verifyGoogleToken resolver:', error);
      throw new Error('Internal Server Error');
    }
  },
  getCurrentUser:async(parent:any,args:any,ctx:GraphqlContext)=>{
    console.log(ctx)
    const id=ctx.user?.id;
    if(!id){
      return null
    }
    const user=await prismaClient.user.findUnique({where:{id} })
    console.log("user",user)
    return user;
  },
  getUserById:async(parent:any,{id}:{id:string},ctx:GraphqlContext)=> prismaClient.user.findUnique({where:{id}})
};

const extraResolvers={
  User:{
    tweets:(parent:User)=> prismaClient.tweet.findMany({where:{author:{id:parent.id}}}),
    followers:async(parent:User)=>{
      const result =await prismaClient.follows.findMany({
        where:{following:{id:parent.id}},
        include:{
          follower:true,

        }
      })
      return result.map((el)=>el.follower)
    },
    following:async(parent:User)=>{
      const result =await prismaClient.follows.findMany(
        {
          where:{follower:{id:parent.id}},
          include:{
            following:true,
          }
        })
        return result.map((el)=>el.following)
    },
    recommendedUsers:async(parent:User,_:any,ctx:GraphqlContext)=>{
      if(!ctx.user) return [];
  
      const myFollowings=await prismaClient.follows.findMany({
        where:{
          follower:{
            id:ctx.user.id
          }
        },
        include:{
          following: {include:{followers:{include:{following:true}}}}
        }
      })
      const users:User[]=[]
      for(const followings of myFollowings ){
        for(const followingOfFollowedUser of followings.following.followers){
          if(
            followingOfFollowedUser.following.id !==ctx.user.id &&
            myFollowings.findIndex(e=> e?.followingId===followingOfFollowedUser.following.id)<0
            ){
              users.push(followingOfFollowedUser.following)
          }
        }
      }
      return users
    }
  }
}

const mutations={
  followUser:async(parent:any,{to}:{to:string},ctx:GraphqlContext)=>{
    if(!ctx.user || !ctx.user.id) throw new Error("UnAuthenticated")
      await UserService.followUser(ctx.user.id,to);
    return true;
  },
  unFollowUser:async(parent:any,{to}:{to:string},ctx:GraphqlContext)=>{
    if(!ctx.user || !ctx.user.id) throw new Error("UnAuthenticated")
      await UserService.unFollowUser(ctx.user.id,to);
    return true;
  }
}

export const resolvers = { queries,extraResolvers,mutations };
