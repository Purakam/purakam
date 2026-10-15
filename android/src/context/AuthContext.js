import React from 'react';

const AuthContext = React.createContext({
  user: null,
  token: null,
  signIn: () => {},
  signOut: () => {},
});

export default AuthContext;
