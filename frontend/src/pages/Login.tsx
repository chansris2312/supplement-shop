import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authErrorText, useAuth } from '../auth/AuthContext';
import { AuthCard, ConfirmCodeStep, FormError, Spin, authInput, authLabel, authPrimary } from '../components/AuthCard';
import { Spinner } from '../components/ui';
import { config } from '../config';

/** Only allow in-app paths as the return target. */
export const safeNext = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/');

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);

  // Already signed in -> go straight to where the user wanted to be
  useEffect(() => {
    if (!loading && user && !busy && !needsConfirm) navigate(next, { replace: true });
  }, [loading, user, busy, needsConfirm, next, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const step = await login(email.trim(), password);
      if (step === 'confirm') {
        setNeedsConfirm(true);
        setBusy(false);
        return;
      }
      navigate(next, { replace: true });
    } catch (err) {
      console.error(err);
      setError(authErrorText(err));
      setBusy(false);
    }
  }

  if (loading) return <Spinner label="กำลังโหลด…" />;

  if (needsConfirm) {
    return <ConfirmCodeStep email={email.trim()} password={password} onDone={() => navigate(next, { replace: true })} />;
  }

  return (
    <AuthCard title="เข้าสู่ระบบ" subtitle="ยินดีต้อนรับกลับสู่ NutriMate เข้าสู่ระบบเพื่อวิเคราะห์ไลฟ์สไตล์และสั่งซื้อสินค้า">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={authLabel}>
            อีเมล
          </label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={authInput} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={authLabel}>
            รหัสผ่าน
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInput}
          />
        </div>
        <FormError message={error} />
        <button type="submit" disabled={busy} className={authPrimary}>
          {busy && <Spin />}
          {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
        {config.useMock && <p className="m-0 text-center text-[13px] text-muted">โหมดเดโม: กรอกอีเมลและรหัสผ่านอะไรก็ได้</p>}
      </form>
      <p className="m-0 border-t border-line pt-4 text-center text-[15px] text-muted">
        ยังไม่มีบัญชี?{' '}
        <Link to={'/signup?next=' + encodeURIComponent(next)} className="font-semibold">
          สมัครสมาชิก
        </Link>
      </p>
    </AuthCard>
  );
}
