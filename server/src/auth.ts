import 'dotenv/config';
import { sign, verify } from 'jsonwebtoken';
import { MiddlewareFn } from 'type-graphql/dist/interfaces/Middleware';
import { User } from './entity/User';
import { MyContext } from './MyContext';
import { Response } from 'express';

export const sendRefreshToken = (res: Response, user: User | null) => {
  res.cookie('jid', createRefreshToken(user), {
    httpOnly: true,
    path: '/refresh_token',
  });
};

export const createAccessToken = (user: User) => {
  return sign({ userId: user.id }, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: '15m',
  });
};

const createRefreshToken = (user: User | null) => {
  if (!user) {
    return '';
  }

  return sign(
    { userId: user.id, tokenVersion: user.tokenVersion },
    process.env.REFRESH_TOKEN_SECRET!,
    {
      expiresIn: '7d',
    }
  );
};

export const authJWT: MiddlewareFn<MyContext> = ({ context }, next) => {
  const authorization = context.req.headers['authorization'];
  if (!authorization) {
    throw new Error('not authenticated');
  }

  try {
    const token = authorization.split(' ')[1];
    const payload = verify(token, process.env.ACCESS_TOKEN_SECRET!);
    context.payload = payload as any;
  } catch (error) {
    console.log(error);
    throw new Error('not authenticated');
  }

  return next();
};
