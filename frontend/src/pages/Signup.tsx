import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authErrorText, useAuth } from '../auth/AuthContext';
import { AuthCard, ConfirmCodeStep, FormError, Spin, authInput, authLabel, authPrimary } from '../components/AuthCard';
import { Spinner } from '../components/ui';
import { config } from '../config';
import { safeNext } from './Login';

/** Same rules as the Cognito password policy in template.yaml */
const passwordOk = (p: string) => p.length >= 8 && /[a-z]/.test(p) && /\d/.test(p);

export default function Signup() {
  const { user, loading, register, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');

  useEffect(() => {
    if (!loading && user && step === 'form' && !busy) navigate(next, { replace: true });
  }, [loading, user, step, busy, next, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!passwordOk(password)) return setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวพิมพ์เล็กกับตัวเลข');
    if (password !== password2) return setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    setBusy(true);
    try {
      const result = await register(email.trim(), password);
      if (result === 'confirm') {
        setStep('confirm');
        setBusy(false);
        return;
      }
      await login(email.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      console.error(err);
      setError(authErrorText(err));
      setBusy(false);
    }
  }

  if (loading) return <Spinner label="กำลังโหลด…" />;

  if (step === 'confirm') {
    return <ConfirmCodeStep email={email.trim()} password={password} onDone={() => navigate(next, { replace: true })} />;
  }

  const hint = password && !passwordOk(password);

  return (
    <AuthCard title="สมัครสมาชิก" subtitle="สร้างบัญชี NutriMate ด้วยอีเมล เพื่อรับคำแนะนำอาหารเสริมจาก AI และสั่งซื้อสินค้า">
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
            autoComplete="new-password"
            required
            aria-describedby="pw-hint"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInput}
          />
          <span id="pw-hint" className={'text-[13px] ' + (hint ? 'text-danger' : 'text-muted')}>
            อย่างน้อย 8 ตัว มีตัวพิมพ์เล็ก (a–z) และตัวเลข
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password2" className={authLabel}>
            ยืนยันรหัสผ่าน
          </label>
          <input
            id="password2"
            type="password"
            autoComplete="new-password"
            required
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className={authInput}
          />
        </div>
        <FormError message={error} />
        <button type="submit" disabled={busy} className={authPrimary}>
          {busy && <Spin />}
          {busy ? 'กำลังสมัคร…' : 'สมัครสมาชิก'}
        </button>
        {config.useMock && <p className="m-0 text-center text-[13px] text-muted">โหมดเดโม: รหัสยืนยันคือตัวเลข 6 หลักอะไรก็ได้</p>}
      </form>
      <p className="m-0 border-t border-line pt-4 text-center text-[15px] text-muted">
        มีบัญชีแล้ว?{' '}
        <Link to={'/login?next=' + encodeURIComponent(next)} className="font-semibold">
          เข้าสู่ระบบ
        </Link>
      </p>
    </AuthCard>
  );
}
