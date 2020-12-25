import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { UserResolver } from './UserResolver';
import { createConnection } from 'typeorm';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { verify } from 'jsonwebtoken';
import { User } from './entity/User';
import { createAccessToken, sendRefreshToken } from './auth';

(async () => {
  try {
    const app = express();
    app.use(
      cors({
        origin: 'http://localhost:3000',
        credentials: true,
      })
    );
    app.use(cookieParser());
    app.get('/', (_req, res) => res.send('hello'));
    app.post('/refresh_token', async (req, res) => {
      const token = req.cookies.jid;
      if (!token) {
        return res.send({ ok: false, accessToken: '' });
      }

      let payload: any = null;
      try {
        payload = verify(token, process.env.REFRESH_TOKEN_SECRET!);
      } catch (error) {
        console.log(error);
        return res.send({ ok: false, accessToken: '' });
      }

      // token is valid and we can send back an accessToken
      const user = await User.findOne({ id: payload.userId });
      if (!user) {
        return res.send({ ok: false, accessToken: '' });
      }

      if (user.tokenVersion !== payload.tokenVersion) {
        return res.send({ ok: false, accessToken: '' });
      }

      sendRefreshToken(res, user);

      return res.send({ ok: true, accessToken: createAccessToken(user) });
    });

    await createConnection();

    const apolloServer = new ApolloServer({
      schema: await buildSchema({
        resolvers: [UserResolver],
      }),
      context: ({ req, res }) => ({ req, res }),
    });

    apolloServer.applyMiddleware({ app, path: '/', cors: false });

    app.listen(4000, () => {
      console.log('express server started');
    });
  } catch (error) {
    console.log('error starting server, ' + error);
  }
})();
