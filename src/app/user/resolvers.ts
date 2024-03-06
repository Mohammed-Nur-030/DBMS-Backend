import axios from 'axios';
import { prismaClient } from '../../clients/db';
import { JWTService } from '../../services/jwt';
import { GraphqlContext } from '../../interfaces';

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
  }
};

export const resolvers = { queries };
