import { Tweet } from "@prisma/client";
import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { redisClient } from "../../clients/redis";


interface CreateTweetPayload {
    content: string
    imageUrl?: string
}

const s3Client = new S3Client({
    region:process.env.AWS_DEFAULT_REGION
})



const queries = {
    getAllTweets: async() =>{
        const cachedTweets=await redisClient.get(`ALL_TWEETS`);
        if(cachedTweets) return JSON.parse(cachedTweets)

        const tweets= await prismaClient.tweet.findMany({ orderBy: { createdAt: "desc" } })
         await redisClient.set('ALL_TWEETS',JSON.stringify(tweets))
         return tweets
        },
    getSignedUrlForTweet: async (parent: any,
        { imageType,imageName }: { imageType: string , imageName: string},
        ctx: GraphqlContext) => {
        if ((!ctx.user) || !ctx.user.id) throw new Error('Unauthenticated')

        const allowedImageType = ["image/jpg", "image/jpeg", "image/png", "image/webp"]
        if (!allowedImageType.includes(imageType))
            throw new Error('Unsupported Image Type')
        const putObjectCommand = new PutObjectCommand({
            Bucket:process.env.AWS_S3_BUCKET,
            Key: `uploads/${ctx.user.id}/tweets/${imageName}-${Date.now()}.${imageType}`
        })

        const signedUrl=await getSignedUrl(s3Client,putObjectCommand)
        return signedUrl
    }
}

const mutations = {
    createTweet: async (parent: any, { payload }: { payload: CreateTweetPayload }, ctx: GraphqlContext) => {
        if (!ctx.user) {
            throw new Error('You Are not Authenticated')
        }
        const rateLimitFlag=await redisClient.get(`RATE_LIMIT:TWEET:${ctx.user.id}`)

        if(rateLimitFlag) throw new Error("Please Wait...")
        
        const tweet = await prismaClient.tweet.create({
            data: {
                content: payload.content,
                imageUrl: payload.imageUrl,
                author: { connect: { id: ctx.user.id } }
            }
        })
        await redisClient.setex(`RATE_LIMIT:TWEET:${ctx.user.id}`,10,1)
        await redisClient.del(`ALL_TWEETS`);
        return tweet

    }
}
const extraResolvers = {
    Tweet: {
        author: (parent: Tweet) => (
            prismaClient.user.findUnique({ where: { id: parent.authorId } })
        )
    }
}
export const resolvers = { mutations, extraResolvers, queries }