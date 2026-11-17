// Minimal Gemini API client (generateContent with JSON output).
import { getSecret } from './ssm.mjs';

const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const KEY_PARAM = process.env.GEMINI_KEY_PARAM || '/supp/gemini-api-key';

/**
 * Calls Gemini and returns the parsed JSON object.
 * Throws on HTTP errors, timeouts or invalid JSON so callers can retry / fall back.
 */
export async function generateJson({ prompt, schema, timeoutMs = 12000, temperature = 0.4 }) {
  const apiKey = await getSecret(KEY_PARAM);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) throw new Error('Gemini returned no text (finishReason=' + data?.candidates?.[0]?.finishReason + ')');
  return JSON.parse(text);
}

/** Calls generateJson, validates with `validate(obj)`, retries once. Returns null if both attempts fail. */
export async function generateValidated(opts, validate) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const obj = await generateJson(opts);
      if (validate(obj)) return obj;
      console.warn(JSON.stringify({ msg: 'gemini invalid shape', attempt }));
    } catch (err) {
      console.warn(JSON.stringify({ msg: 'gemini call failed', attempt, error: String(err) }));
    }
  }
  return null;
}
