import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from './ui';

/** Redirects to Cognito managed login when signed out. `admin` also requires the admin group. */
export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading, signIn } = useAuth();

  useEffect(() => {
    if (!loading && !user) signIn();
  }, [loading, user, signIn]);

  if (loading || !user) return <Spinner label="กำลังไปหน้าเข้าสู่ระบบ…" />;
  if (admin && !user.isAdmin) {
    return <p className="m-8 rounded-2xl border border-line bg-white p-10 text-center text-muted">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>;
  }
  return <>{children}</>;
}
