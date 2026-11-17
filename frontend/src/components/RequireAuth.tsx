import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from './ui';

/** Sends signed-out visitors to /login (and back afterwards). `admin` also requires the admin group. */
export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="กำลังโหลด…" />;
  if (!user) {
    const next = location.pathname + location.search;
    return <Navigate to={'/login?next=' + encodeURIComponent(next)} replace />;
  }
  if (admin && !user.isAdmin) {
    return <p className="m-8 rounded-2xl border border-line bg-white p-10 text-center text-muted">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>;
  }
  return <>{children}</>;
}
