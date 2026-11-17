// Latest PM2.5 for a Thai city from OpenAQ API v3.
// Flow per city: find nearby locations that measure PM2.5 -> read the nearest one's latest values.
import { getSecret } from './ssm.mjs';

const BASE = 'https://api.openaq.org/v3';
const KEY_PARAM = process.env.OPENAQ_KEY_PARAM || '/supp/openaq-api-key';
const PM25_PARAMETER_ID = 2;
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // ignore readings older than 3 days

/** City centres (latitude, longitude). */
export const CITY_COORDS = {
  'กรุงเทพมหานคร': [13.7563, 100.5018],
  'เชียงใหม่': [18.7883, 98.9853],
  'ขอนแก่น': [16.4419, 102.836],
  'ภูเก็ต': [7.8804, 98.3923],
};

async function get(path, apiKey) {
  const res = await fetch(BASE + path, { headers: { 'X-API-Key': apiKey }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`OpenAQ HTTP ${res.status} for ${path}`);
  return res.json();
}

/**
 * Returns { value, unit, datetime, locationName } or null when no recent data exists.
 */
export async function latestPm25(city) {
  const coords = CITY_COORDS[city];
  if (!coords) return null;
  const apiKey = await getSecret(KEY_PARAM);

  const locs = await get(
    `/locations?coordinates=${coords[0]},${coords[1]}&radius=25000&parameters_id=${PM25_PARAMETER_ID}&limit=10`,
    apiKey,
  );
  const candidates = (locs.results ?? [])
    .filter((l) => !l.datetimeLast?.utc || Date.now() - Date.parse(l.datetimeLast.utc) < MAX_AGE_MS)
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    .slice(0, 3);

  // Try the nearest few stations until one has a fresh PM2.5 reading
  for (const loc of candidates) {
    const sensor = (loc.sensors ?? []).find((s) => s.parameter?.id === PM25_PARAMETER_ID || s.parameter?.name === 'pm25');
    if (!sensor) continue;
    const latest = await get(`/locations/${loc.id}/latest`, apiKey);
    const reading = (latest.results ?? []).find((r) => r.sensorsId === sensor.id);
    if (reading && Date.now() - Date.parse(reading.datetime?.utc) < MAX_AGE_MS && reading.value >= 0) {
      return {
        value: Math.round(reading.value * 10) / 10,
        unit: sensor.parameter?.units ?? 'µg/m³',
        datetime: reading.datetime.utc,
        locationName: loc.name,
      };
    }
  }
  return null;
}

/** Thai Pollution Control Department bands for 24h PM2.5 (µg/m³). */
export function pm25Level(v) {
  if (v <= 15) return 'ดีมาก';
  if (v <= 25) return 'ดี';
  if (v <= 37.5) return 'ปานกลาง';
  if (v <= 75) return 'เริ่มมีผลกระทบต่อสุขภาพ';
  return 'มีผลกระทบต่อสุขภาพ';
}
