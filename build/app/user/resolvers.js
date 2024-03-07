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
        console.log(ctx);
        const id = (_a = ctx.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!id) {
            return null;
        }
        const user = yield db_1.prismaClient.user.findUnique({ where: { id } });
        console.log("user", user);
        return user;
    })
};
const extraResolvers = {
    User: {
        tweets: (parent) => db_1.prismaClient.tweet.findMany({ where: { author: { id: parent.id } } })
    }
};
exports.resolvers = { queries: exports.queries, extraResolvers };
