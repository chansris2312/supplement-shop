import { useState, type FormEvent, type ReactNode } from 'react';
import { authErrorText, useAuth } from '../auth/AuthContext';
import { LeafLogo } from './Icons';

export const authInput =
  'box-border h-11 w-full rounded-[10px] border border-field bg-white px-3.5 text-base text-ink focus:border-primary focus:outline-none';
export const authLabel = 'text-sm font-medium';
export const authPrimary =
  'inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-primary text-base font-semibold text-white hover:bg-primary-hover disabled:cursor-wait disabled:opacity-80';

/** Centered white card used by /login and /signup (same style as the app cards). */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <main className="flex justify-center px-4 pb-12 pt-10 sm:px-8">
      <section className="flex w-full max-w-[440px] flex-col gap-5 rounded-2xl border border-line bg-white p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mint">
            <LeafLogo size={30} />
          </div>
          <h1 className="m-0 font-prompt text-2xl font-semibold">{title}</h1>
          <p className="m-0 text-[15px] leading-[1.7] text-muted">{subtitle}</p>
        </div>
        {children}
      </section>
    </main>
  );
}

export const FormError = ({ message }: { message: string }) =>
  message ? (
    <p role="alert" className="m-0 rounded-[10px] bg-warn-bg px-3.5 py-2.5 text-sm leading-[1.6] text-warn-text">
      {message}
    </p>
  ) : null;

export const Spin = () => <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />;

/**
 * Email confirmation step (6-digit code from Cognito). On success it signs in with the
 * password the user just typed (kept only in memory) and calls onDone.
 */
export function ConfirmCodeStep({ email, password, onDone }: { email: string; password: string; onDone: () => void }) {
  const { confirm, resendCode, login } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await confirm(email, code);
      await login(email, password);
      onDone();
    } catch (err) {
      console.error(err);
      setError(authErrorText(err));
      setBusy(false);
    }
  }

  async function resend() {
    setError('');
    try {
      await resendCode(email);
      setInfo('ส่งรหัสใหม่ไปที่อีเมลของคุณแล้ว');
    } catch (err) {
      setError(authErrorText(err));
    }
  }

  return (
    <AuthCard
      title="ยืนยันอีเมล"
      subtitle={
        <>
          เราส่งรหัสยืนยัน 6 หลักไปที่ <span className="font-semibold text-ink">{email}</span>
          <br />
          กรุณาตรวจสอบกล่องจดหมาย (รวมถึงจดหมายขยะ)
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="code" className={authLabel}>
            รหัสยืนยัน
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className={`${authInput} text-center font-prompt text-xl tracking-[0.4em]`}
          />
        </div>
        <FormError message={error} />
        {info && <p role="status" className="m-0 rounded-[10px] bg-mint px-3.5 py-2.5 text-sm text-primary-dark">{info}</p>}
        <button type="submit" disabled={busy || code.length !== 6} className={authPrimary}>
          {busy && <Spin />}
          {busy ? 'กำลังยืนยัน…' : 'ยืนยันและเข้าสู่ระบบ'}
        </button>
        <button type="button" onClick={resend} className="min-h-11 border-none bg-transparent text-[15px] text-primary underline hover:text-primary-hover">
          ไม่ได้รับรหัส? ส่งรหัสอีกครั้ง
        </button>
      </form>
    </AuthCard>
  );
}
