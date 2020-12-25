import React from 'react';
import { Link } from 'react-router-dom';
import { setAccessToken } from './accessToken';
import { useLogoutMutation, useMeQuery } from './generated/graphql';

interface Props {}

export const Header: React.FC<Props> = () => {
  const { data, loading } = useMeQuery({ fetchPolicy: 'network-only' });
  const [logout, { client }] = useLogoutMutation();

  let body: any = null;
  if (loading) {
    body = <div>loading...</div>;
  } else if (data && data.me) {
    body = (
      <div>
        <p>you're logged in as: {data.me.email}</p>
        <button
          onClick={async () => {
            await logout();
            setAccessToken('');
            await client.resetStore();
          }}>
          logout
        </button>
      </div>
    );
  } else {
    body = <div>not logged in</div>;
  }

  return (
    <header>
      <div>
        <Link to='/'>Home</Link>
      </div>
      <div>
        <Link to='/register'>Register</Link>
      </div>
      <div>
        <Link to='/login'>Login</Link>
      </div>
      <div>
        <Link to='/bye'>Bye</Link>
      </div>
      {body}
    </header>
  );
};
