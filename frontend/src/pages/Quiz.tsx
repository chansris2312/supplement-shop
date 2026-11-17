import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Answers } from '../api';
import { Main, PageHeader, Spinner } from '../components/ui';
import { bmiOf } from '../lib/format';
import { STEPS, type Question } from '../lib/quiz';

const pill = (on: boolean) =>
  'min-h-11 rounded-full px-[18px] text-[15px] ' +
  (on ? 'border border-primary bg-primary font-semibold text-white' : 'border border-field bg-white text-ink hover:border-primary');

const input = 'box-border h-11 rounded-[10px] border border-field px-3.5 text-base text-ink';

const LAST = STEPS.length - 1;

export default function Quiz() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState<Answers>({ goal: [] });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill from the latest plan so "แก้คำตอบ / ทำใหม่" starts from the previous answers
  useEffect(() => {
    api
      .latestPlan()
      .then((plan) => {
        if (plan) {
          setAns({ goal: [], ...plan.answers });
          setConsent(true);
        }
      })
      .catch(console.error)
      .finally(() => setReady(true));
  }, []);

  const set = (patch: Partial<Answers>) => setAns((a) => ({ ...a, ...patch }));

  const has = (q: Question) => (q.multi ? (ans.goal ?? []).length > 0 : !!ans[q.id]);
  const isOn = (q: Question, o: string) => (q.multi ? (ans.goal ?? []).includes(o) : ans[q.id] === o);
  const pick = (q: Question, o: string) => {
    if (q.multi) {
      const cur = ans.goal ?? [];
      set({ goal: cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o] });
    } else {
      set({ [q.id]: o } as Partial<Answers>);
    }
  };

  const bmi = bmiOf(ans.weight, ans.height);
  const stepDone = (i: number) => (i === 0 ? !!bmi : STEPS[i].qs.every(has));

  const summary = [{ label: 'BMI', value: bmi ? `${bmi.text} · ${bmi.band}` : '—' }];
  STEPS.forEach((st) =>
    st.qs.forEach((q) => {
      if (has(q)) summary.push({ label: q.short, value: q.multi ? (ans.goal ?? []).join(', ') : String(ans[q.id]) });
    }),
  );

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      await api.submitQuiz(ans);
      navigate('/result');
    } catch (e) {
      console.error(e);
      setError('วิเคราะห์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      setSubmitting(false);
    }
  }

  if (!ready) return <Spinner label="กำลังโหลด…" />;

  const current = STEPS[step];

  return (
    <>
      <PageHeader title="วิเคราะห์ไลฟ์สไตล์" action={<span className="text-sm text-muted">ขั้นที่ {step + 1} จาก {STEPS.length}</span>} />
      <Main className="flex flex-wrap items-start gap-6">
        {/* Step list */}
        <nav aria-label="ขั้นตอนแบบประเมิน" className="flex flex-[1_1_220px] flex-col gap-1 rounded-2xl border border-line bg-white p-3">
          {STEPS.map((st, i) => {
            const here = i === step;
            const done = stepDone(i);
            return (
              <button
                key={st.title}
                type="button"
                aria-current={here ? 'step' : undefined}
                onClick={() => setStep(i)}
                className={
                  'flex min-h-12 items-center gap-3 rounded-[10px] border-none px-3 text-left text-[15px] ' +
                  (here ? 'bg-mint font-semibold text-primary-dark' : 'bg-white text-ink hover:bg-page')
                }
              >
                <span
                  className={
                    'flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-semibold ' +
                    (here ? 'bg-primary text-white' : done ? 'bg-mint text-primary' : 'bg-[#EEF1EF] text-[#4A5A55]')
                  }
                >
                  {done && !here ? '✓' : i + 1}
                </span>
                <span>{st.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Form card */}
        <section className="flex min-w-0 flex-[999_1_480px] flex-col gap-6 rounded-2xl border border-line bg-white p-5 sm:p-7">
          <div className="flex flex-col gap-2.5">
            <h2 className="m-0 font-prompt text-[22px] font-semibold">{current.title}</h2>
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.round(((step + 1) / STEPS.length) * 100)}%` }} />
            </div>
          </div>

          {step === 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {(
                  [
                    ['age', 'อายุ (ปี)'],
                    ['weight', 'น้ำหนัก (กก.)'],
                    ['height', 'ส่วนสูง (ซม.)'],
                  ] as const
                ).map(([id, label]) => (
                  <div key={id} className="flex flex-col gap-1.5">
                    <label htmlFor={id} className="text-sm font-medium">
                      {label}
                    </label>
                    <input id={id} type="number" min={0} inputMode="decimal" value={ans[id] ?? ''} onChange={(e) => set({ [id]: e.target.value })} className={input} />
                  </div>
                ))}
              </div>
              <p className="m-0 rounded-[10px] bg-mint px-4 py-3 text-[15px] text-primary-dark">
                {bmi ? `BMI ของคุณ ${bmi.text} · ${bmi.band} (เกณฑ์คนเอเชีย)` : 'กรอกน้ำหนักและส่วนสูงเพื่อดูค่า BMI'}
              </p>
            </>
          )}

          {current.qs.map((q) => (
            <fieldset key={q.id} className="m-0 flex flex-col gap-2.5 border-none p-0">
              <legend className="mb-2.5 p-0 text-[15px] font-medium">{q.label}</legend>
              <div className="flex flex-wrap gap-2.5">
                {q.opts.map((o) => (
                  <button key={o} type="button" aria-pressed={isOn(q, o)} onClick={() => pick(q, o)} className={pill(isOn(q, o))}>
                    {o}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}

          {step === LAST && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="meds" className="text-[15px] font-medium">
                  ยาที่ทานประจำ หรือโรคประจำตัว (ถ้ามี)
                </label>
                <textarea
                  id="meds"
                  rows={3}
                  placeholder="เช่น ยาความดัน, เบาหวาน — ถ้าไม่มีให้เว้นว่าง"
                  value={ans.meds ?? ''}
                  onChange={(e) => set({ meds: e.target.value })}
                  className="box-border resize-y rounded-[10px] border border-field px-3.5 py-3 text-[15px] text-ink"
                />
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-[1.6]">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-[22px] w-[22px] flex-none accent-primary"
                />
                <span>ยินยอมให้ใช้ข้อมูลนี้เพื่อวิเคราะห์และแนะนำอาหารเสริม (ไม่ส่งชื่อหรืออีเมลให้ AI)</span>
              </label>
            </>
          )}

          {error && <p className="m-0 rounded-[10px] bg-warn-bg px-4 py-3 text-[15px] text-warn-text">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="h-12 rounded-xl border border-field bg-white px-5 text-[15px] text-ink disabled:cursor-default disabled:text-[#8A9792]"
            >
              ← ย้อนกลับ
            </button>
            {step < LAST && (
              <button type="button" onClick={() => setStep((s) => Math.min(LAST, s + 1))} className="h-12 rounded-xl bg-primary px-6 text-base font-semibold text-white hover:bg-primary-hover">
                ถัดไป →
              </button>
            )}
            {step === LAST && consent && (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-primary px-6 text-base font-semibold text-white hover:bg-primary-hover disabled:cursor-wait disabled:opacity-80"
              >
                {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {submitting ? 'AI กำลังวิเคราะห์…' : 'ส่งให้ AI วิเคราะห์ →'}
              </button>
            )}
            {step === LAST && !consent && (
              <p className="m-0 rounded-xl bg-line px-[18px] py-3 text-[15px] text-[#4A5A55]">ติ๊กยินยอมก่อนส่งให้ AI วิเคราะห์</p>
            )}
          </div>
        </section>

        {/* Answer summary */}
        <aside aria-label="สรุปคำตอบ" className="flex flex-[1_1_260px] flex-col gap-3 rounded-2xl border border-line bg-white p-5">
          <h2 className="m-0 text-[15px] font-semibold">คำตอบของคุณ</h2>
          {summary.map((a) => (
            <div key={a.label} className="flex justify-between gap-3 border-b border-[#EEF1EF] pb-2.5 text-sm">
              <span className="text-muted">{a.label}</span>
              <span className="text-right font-semibold">{a.value}</span>
            </div>
          ))}
          <p className="mb-0 mt-1 rounded-[10px] bg-warn-bg px-3 py-2.5 text-[13px] leading-[1.6] text-warn-text">
            มียาประจำ โรคประจำตัว หรือตั้งครรภ์? AI จะแนะนำให้ปรึกษาแพทย์หรือเภสัชกรก่อน
          </p>
        </aside>
      </Main>
    </>
  );
}
