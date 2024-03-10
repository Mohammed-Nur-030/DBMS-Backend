import { Tweet } from "@prisma/client";
import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"


interface CreateTweetPayload {
    content: string
    imageUrl?: string
}

const s3Client = new S3Client({
    region:process.env.AWS_DEFAULT_REGION
})



const queries = {
    getAllTweets: () => prismaClient.tweet.findMany({ orderBy: { createdAt: "desc" } }),
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
        const tweet = await prismaClient.tweet.create({
            data: {
                content: payload.content,
                imageUrl: payload.imageUrl,
                author: { connect: { id: ctx.user.id } }
            }
        })
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