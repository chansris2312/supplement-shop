import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession, signInWithRedirect, signOut as amplifySignOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { config } from '../config';
import { MOCK_USER } from '../mock/data';

export interface User {
  name: string;
  email: string;
  isAdmin: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState>(null as unknown as AuthState);

if (!config.useMock) {
  const origin = window.location.origin + '/';
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId,
        loginWith: {
          oauth: {
            domain: config.cognitoDomain,
            scopes: ['openid', 'email', 'profile'],
            redirectSignIn: [origin],
            redirectSignOut: [origin],
            responseType: 'code',
          },
        },
      },
    },
  });
}

/** Read the signed-in user from the Cognito ID token. */
async function loadUser(): Promise<User | null> {
  try {
    const { tokens } = await fetchAuthSession();
    const claims = tokens?.idToken?.payload;
    if (!claims) return null;
    const groups = (claims['cognito:groups'] as string[] | undefined) ?? [];
    const email = String(claims.email ?? '');
    return { name: String(claims.name ?? email), email, isAdmin: groups.includes('admin') };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(config.useMock ? MOCK_USER : null);
  const [loading, setLoading] = useState(!config.useMock);

  const refresh = useCallback(async () => {
    setUser(await loadUser());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (config.useMock) return;
    refresh();
    // Fires after the hosted-UI redirect finishes exchanging the code for tokens
    return Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'signedOut' || payload.event === 'tokenRefresh') refresh();
    });
  }, [refresh]);

  const signIn = useCallback(() => {
    if (config.useMock) return setUser(MOCK_USER);
    sessionStorage.setItem('afterLogin', window.location.pathname + window.location.search);
    signInWithRedirect();
  }, []);

  const signOut = useCallback(() => {
    if (config.useMock) return setUser(null);
    amplifySignOut();
  }, []);

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
