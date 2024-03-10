"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = exports.queries = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../../clients/db");
const jwt_1 = require("../../services/jwt");
const user_1 = require("../../services/user");
const redis_1 = require("../../clients/redis");
exports.queries = {
    verifyGoogleToken: (parent, { token }) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("Inside");
            const googleToken = token;
            const googleOauthURL = new URL('https://oauth2.googleapis.com/tokeninfo');
            googleOauthURL.searchParams.set('id_token', googleToken);
            /* ------------------------------OR------------------------------------------------- */
            // const googleOauthURL=`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
            const { data } = yield axios_1.default.get(googleOauthURL.toString(), {
                responseType: 'json',
            });
            console.log("data", data);
            const user = yield db_1.prismaClient.user.findUnique({ where: { email: data.email } });
            if (!user) {
                yield db_1.prismaClient.user.create({
                    data: {
                        email: data.email,
                        firstName: data.given_name,
                        lastName: data.family_name,
                        profileImageUrl: data.picture,
                    },
                });
                // return "USER CREATED SUCCESSFULLY"
            }
            const userInDB = yield db_1.prismaClient.user.findUnique({ where: { email: data.email } });
            if (!userInDB) {
                throw new Error('User with Email Not Found');
            }
            const userToken = jwt_1.JWTService.generateTokenForUser(userInDB);
            return userToken;
        }
        catch (error) {
            // Handle errors appropriately
            console.error('Error in verifyGoogleToken resolver:', error);
            throw new Error('Internal Server Error');
        }
    }),
    getCurrentUser: (parent, args, ctx) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // console.log(ctx)
        const id = (_a = ctx.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!id) {
            return null;
        }
        const user = yield db_1.prismaClient.user.findUnique({ where: { id } });
        console.log("user", user);
        return user;
    }),
    getUserById: (parent, { id }, ctx) => __awaiter(void 0, void 0, void 0, function* () { return db_1.prismaClient.user.findUnique({ where: { id } }); })
};
const extraResolvers = {
    User: {
        tweets: (parent) => db_1.prismaClient.tweet.findMany({ where: { author: { id: parent.id } } }),
        followers: (parent) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield db_1.prismaClient.follows.findMany({
                where: { following: { id: parent.id } },
                include: {
                    follower: true,
                }
            });
            return result.map((el) => el.follower);
        }),
        following: (parent) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield db_1.prismaClient.follows.findMany({
                where: { follower: { id: parent.id } },
                include: {
                    following: true,
                }
            });
            return result.map((el) => el.following);
        }),
        recommendedUsers: (parent, _, ctx) => __awaiter(void 0, void 0, void 0, function* () {
            if (!ctx.user)
                return [];
            const cachedValue = yield redis_1.redisClient.get(`RECOMMENDED_USERS:${ctx.user.id}`);
            if (cachedValue)
                return JSON.parse(cachedValue);
            const myFollowings = yield db_1.prismaClient.follows.findMany({
                where: {
                    follower: {
                        id: ctx.user.id
                    }
                },
                include: {
                    following: { include: { followers: { include: { following: true } } } }
                }
            });
            const users = [];
            for (const followings of myFollowings) {
                for (const followingOfFollowedUser of followings.following.followers) {
                    if (followingOfFollowedUser.following.id !== ctx.user.id &&
                        myFollowings.findIndex(e => (e === null || e === void 0 ? void 0 : e.followingId) === followingOfFollowedUser.following.id) < 0) {
                        users.push(followingOfFollowedUser.following);
                    }
                }
            }
            yield redis_1.redisClient.set(`RECOMMENDED_USERS:${ctx.user.id}`, JSON.stringify(users));
            return users;
        })
    }
};
const mutations = {
    followUser: (parent, { to }, ctx) => __awaiter(void 0, void 0, void 0, function* () {
        if (!ctx.user || !ctx.user.id)
            throw new Error("UnAuthenticated");
        yield user_1.UserService.followUser(ctx.user.id, to);
        yield redis_1.redisClient.del(`RECOMMENDED_USERS:${ctx.user.id}`);
        return true;
    }),
    unFollowUser: (parent, { to }, ctx) => __awaiter(void 0, void 0, void 0, function* () {
        if (!ctx.user || !ctx.user.id)
            throw new Error("UnAuthenticated");
        yield user_1.UserService.unFollowUser(ctx.user.id, to);
        yield redis_1.redisClient.del(`RECOMMENDED_USERS:${ctx.user.id}`);
        return true;
    })
};
exports.resolvers = { queries: exports.queries, extraResolvers, mutations };
