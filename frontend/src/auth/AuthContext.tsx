import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import {
  confirmSignUp,
  fetchAuthSession,
  resendSignUpCode,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { config } from '../config';
import { MOCK_USER } from '../mock/data';

export interface User {
  name: string;
  email: string;
  isAdmin: boolean;
}

/** What the login/signup pages should do next. */
export type AuthStep = 'done' | 'confirm';

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Sends the visitor to /login and back to the current page afterwards. */
  requireLogin: () => void;
  login: (email: string, password: string) => Promise<AuthStep>;
  register: (email: string, password: string) => Promise<AuthStep>;
  confirm: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>(null as unknown as AuthState);

// No hosted UI: only the user pool + app client. USER_PASSWORD_AUTH avoids browser
// crypto requirements, so login also works on the plain-http S3 website URL.
if (!config.useMock) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId,
        loginWith: { email: true },
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

// ---------------------------------------------------------------- mock mode
const mockAuth = {
  login: async (): Promise<AuthStep> => 'done',
  register: async (): Promise<AuthStep> => 'confirm',
  confirm: async (_email: string, code: string) => {
    if (!/^\d{6}$/.test(code.trim())) throw Object.assign(new Error('bad code'), { name: 'CodeMismatchException' });
  },
  resendCode: async () => {},
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(config.useMock ? MOCK_USER : null);
  const [loading, setLoading] = useState(!config.useMock);

  const refresh = useCallback(async () => {
    setUser(await loadUser());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (config.useMock) return;
    refresh();
    return Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'signedOut' || payload.event === 'tokenRefresh') refresh();
    });
  }, [refresh]);

  const requireLogin = useCallback(() => {
    if (location.pathname === '/login' || location.pathname === '/signup') return navigate('/login');
    const next = location.pathname + location.search;
    navigate('/login?next=' + encodeURIComponent(next));
  }, [location, navigate]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthStep> => {
      if (config.useMock) {
        setUser({ ...MOCK_USER, email });
        return mockAuth.login();
      }
      // Clear any half-finished session first (avoids UserAlreadyAuthenticatedException)
      await amplifySignOut().catch(() => {});
      const res = await amplifySignIn({ username: email, password, options: { authFlowType: 'USER_PASSWORD_AUTH' } });
      if (res.nextStep.signInStep === 'CONFIRM_SIGN_UP') return 'confirm';
      if (!res.isSignedIn) throw Object.assign(new Error(res.nextStep.signInStep), { name: 'UnsupportedStep' });
      await refresh();
      return 'done';
    },
    [refresh],
  );

  const register = useCallback(async (email: string, password: string): Promise<AuthStep> => {
    if (config.useMock) return mockAuth.register();
    const res = await amplifySignUp({ username: email, password, options: { userAttributes: { email } } });
    return res.nextStep.signUpStep === 'CONFIRM_SIGN_UP' ? 'confirm' : 'done';
  }, []);

  const confirm = useCallback(async (email: string, code: string) => {
    if (config.useMock) return mockAuth.confirm(email, code);
    await confirmSignUp({ username: email, confirmationCode: code.trim() });
  }, []);

  const resendCode = useCallback(async (email: string) => {
    if (config.useMock) return mockAuth.resendCode();
    await resendSignUpCode({ username: email });
  }, []);

  const signOut = useCallback(async () => {
    if (!config.useMock) await amplifySignOut();
    setUser(null);
    navigate('/');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading, requireLogin, login, register, confirm, resendCode, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Thai messages for Cognito errors. */
export function authErrorText(err: unknown): string {
  const name = (err as { name?: string })?.name ?? '';
  switch (name) {
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    case 'UsernameExistsException':
      return 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ';
    case 'InvalidPasswordException':
      return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวพิมพ์เล็กกับตัวเลข';
    case 'InvalidParameterException':
      return 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีเมลและรหัสผ่าน';
    case 'CodeMismatchException':
      return 'รหัสยืนยันไม่ถูกต้อง';
    case 'ExpiredCodeException':
      return 'รหัสยืนยันหมดอายุ กรุณากดส่งรหัสใหม่';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
    case 'TooManyFailedAttemptsException':
      return 'ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่';
    case 'EmptySignInUsername':
    case 'EmptySignUpUsername':
      return 'กรุณากรอกอีเมล';
    case 'EmptySignInPassword':
    case 'EmptySignUpPassword':
      return 'กรุณากรอกรหัสผ่าน';
    default:
      return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
  }
}
