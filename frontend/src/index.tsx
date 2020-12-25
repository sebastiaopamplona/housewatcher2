import React from 'react';
import ReactDOM from 'react-dom';
import { ApolloProvider } from '@apollo/react-hooks';
import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from '@apollo/client';
import { getAccessToken, setAccessToken } from './accessToken';
import { setContext } from '@apollo/client/link/context';
import { App } from './pages/App';
import { TokenRefreshLink } from 'apollo-link-token-refresh';
import jwt_decode, { JwtPayload } from 'jwt-decode';

const authLink = setContext((_, { headers }) => {
  const token = getAccessToken();
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const cache = new InMemoryCache();
const client = new ApolloClient({
  link: ApolloLink.from([
    new TokenRefreshLink({
      accessTokenField: 'accessToken',
      isTokenValidOrUndefined: () => {
        console.log('checking token...');
        const token = getAccessToken();

        if (!token) {
          return true;
        }

        try {
          const { exp } = jwt_decode<JwtPayload>(token);
          if (Date.now() >= exp! * 1000) {
            return false;
          } else {
            return true;
          }
        } catch (error) {
          return false;
        }
      },
      fetchAccessToken: (): Promise<Response> => {
        console.log('refreshing the access token...');
        return fetch('http://localhost:4000/refresh_token', {
          method: 'POST',
          credentials: 'include',
        });
      },
      handleFetch: (accessToken) => {
        setAccessToken(accessToken);
      },
      handleError: (err) => {
        console.warn('Your refresh token is invalid. Try to relogin.');
        console.error(err);
      },
    }),
    authLink,
    new HttpLink({
      uri: 'http://localhost:4000/graphql',
      credentials: 'include',
    }),
  ]),
  cache,
});

ReactDOM.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById('root')
);
