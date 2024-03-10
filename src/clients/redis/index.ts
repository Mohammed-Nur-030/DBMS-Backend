import Redis from 'ioredis'

export const redisClient = new Redis(
    "redis://default:67f99ba844d9471d83de8c77c6958dcf@us1-relative-cobra-38513.upstash.io:38513"
    );
