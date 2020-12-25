import {
  Arg,
  Ctx,
  Field,
  Int,
  // Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  UseMiddleware,
} from 'type-graphql';
import { hash, compare } from 'bcryptjs';
import { User } from './entity/User';
import { MyContext } from './MyContext';
import { createAccessToken, authJWT, sendRefreshToken } from './auth';
import { getConnection } from 'typeorm';
import { verify } from 'jsonwebtoken';
// import { getConnection } from 'typeorm';

@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;
  @Field(() => User)
  user: User;
}

@Resolver()
export class UserResolver {
  @Query(() => String)
  hello() {
    return 'hi!';
  }

  @Query(() => String)
  @UseMiddleware(authJWT)
  bye(@Ctx() { payload }: MyContext) {
    console.log(payload);
    return `your user id is ${payload!.userId}`;
  }

  @Query(() => [User])
  users() {
    return User.find();
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() context: MyContext) {
    const authorization = context.req.headers['authorization'];
    if (!authorization) {
      return null;
    }

    try {
      const token = authorization.split(' ')[1];
      const payload: any = verify(token, process.env.ACCESS_TOKEN_SECRET!);
      context.payload = payload as any;
      return User.findOne(payload.userId);
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Mutation(() => Boolean)
  async register(
    @Arg('email') email: string,
    @Arg('password') password: string
  ) {
    const hashedPassword = await hash(password, 12);

    try {
      await User.insert({
        email: email,
        password: hashedPassword,
      });
    } catch (error) {
      console.log(error);
      return false;
    }

    return true;
  }

  @Mutation(() => Boolean)
  async revokeRefreshTokensForUser(@Arg('userId', () => Int) userId: number) {
    await getConnection()
      .getRepository(User)
      .increment({ id: userId }, 'tokenVersion', 1);

    return true;
  }

  @Mutation(() => LoginResponse)
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string,
    @Ctx() { res }: MyContext
  ): Promise<LoginResponse> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error('could not find user');
    }

    const valid = await compare(password, user.password);
    if (!valid) {
      throw new Error('bad password');
    }

    sendRefreshToken(res, user);

    return {
      accessToken: createAccessToken(user),
      user: user,
    };
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { res }: MyContext) {
    sendRefreshToken(res, null);
    return true;
  }
}
