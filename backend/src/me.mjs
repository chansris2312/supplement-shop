// GET /api/me, PUT /api/me — city + weekly signal opt-in (SNS email subscription with userId filter)
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, SubscribeCommand, UnsubscribeCommand } from '@aws-sdk/client-sns';
import { ddb, TABLES } from './lib/db.mjs';
import { badRequest, notFound, ok, parseBody, userEmail, userId, wrap } from './lib/http.mjs';
import { CITIES } from './lib/catalog.mjs';

const sns = new SNSClient({});
const TOPIC_ARN = process.env.SIGNAL_TOPIC_ARN;

const DEFAULTS = { city: CITIES[0], weeklySignal: false };

async function loadUser(uid) {
  const res = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { userId: uid } }));
  return res.Item ?? null;
}

const toClient = (u, extra = {}) => ({ email: u.email, city: u.city, weeklySignal: !!u.weeklySignal, ...extra });

async function getMe(event) {
  const u = (await loadUser(userId(event))) ?? { ...DEFAULTS, email: userEmail(event) };
  return ok(toClient(u));
}

async function subscribe(email, uid) {
  const res = await sns.send(
    new SubscribeCommand({
      TopicArn: TOPIC_ARN,
      Protocol: 'email',
      Endpoint: email,
      Attributes: { FilterPolicy: JSON.stringify({ userId: [uid] }) },
      ReturnSubscriptionArn: true, // real ARN even while "pending confirmation"
    }),
  );
  return res.SubscriptionArn;
}

async function unsubscribe(arn) {
  try {
    await sns.send(new UnsubscribeCommand({ SubscriptionArn: arn }));
  } catch (err) {
    // Already removed (e.g. via the email's unsubscribe link) — nothing to do
    console.warn(JSON.stringify({ msg: 'unsubscribe failed', error: String(err) }));
  }
}

async function putMe(event) {
  const uid = userId(event);
  const email = userEmail(event);
  const body = parseBody(event);
  if (body.city !== undefined && !CITIES.includes(body.city)) return badRequest('เมืองไม่ถูกต้อง');
  if (body.weeklySignal !== undefined && typeof body.weeklySignal !== 'boolean') return badRequest('ค่าไม่ถูกต้อง');

  const user = (await loadUser(uid)) ?? { userId: uid, ...DEFAULTS };
  user.email = email ?? user.email;
  if (body.city !== undefined) user.city = body.city;

  let pendingConfirmation = false;
  if (body.weeklySignal === true && !user.subscriptionArn) {
    if (!user.email) return badRequest('ไม่พบอีเมลของบัญชีนี้');
    user.subscriptionArn = await subscribe(user.email, uid);
    pendingConfirmation = true;
  }
  if (body.weeklySignal === false && user.subscriptionArn) {
    await unsubscribe(user.subscriptionArn);
    delete user.subscriptionArn;
  }
  if (body.weeklySignal !== undefined) user.weeklySignal = body.weeklySignal;

  user.updatedAt = new Date().toISOString();
  await ddb.send(new PutCommand({ TableName: TABLES.users, Item: user }));
  return ok(toClient(user, { pendingConfirmation }));
}

const routes = { 'GET /api/me': getMe, 'PUT /api/me': putMe };

export const handler = wrap(async (event) => (routes[event.routeKey] ?? (() => notFound()))(event));
