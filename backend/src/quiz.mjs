// POST /api/quiz (save answers, ask Gemini, save plan), GET /api/plans/latest
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, latestPlan, listProducts, TABLES } from './lib/db.mjs';
import { generateValidated } from './lib/gemini.mjs';
import { notFound, ok, parseBody, userId, wrap } from './lib/http.mjs';
import { buildPrompt, fallbackPlan, finalizePlan, isValidPlan, PLAN_SCHEMA, sanitizeAnswers } from './lib/planner.mjs';

const toClient = (plan) =>
  plan && { createdAt: plan.createdAt, answers: plan.answers, result: plan.result, needsDoctor: plan.needsDoctor };

async function submit(event) {
  const answers = sanitizeAnswers(parseBody(event).answers);
  const products = await listProducts();

  // Gemini gets answers + product list only. Validated, retried once, then rule-based fallback.
  const raw =
    (await generateValidated({ prompt: buildPrompt(answers, products), schema: PLAN_SCHEMA }, isValidPlan)) ??
    fallbackPlan(answers, products);
  const { result, needsDoctor, source } = finalizePlan(raw, answers, products);

  const plan = { userId: userId(event), createdAt: new Date().toISOString(), answers, result, needsDoctor, source };
  await ddb.send(new PutCommand({ TableName: TABLES.plans, Item: plan }));
  console.log(JSON.stringify({ msg: 'plan created', source, recs: result.recommendations.length, needsDoctor }));
  return ok(toClient(plan));
}

async function latest(event) {
  return ok({ plan: toClient(await latestPlan(userId(event))) });
}

const routes = { 'POST /api/quiz': submit, 'GET /api/plans/latest': latest };

export const handler = wrap(async (event) => (routes[event.routeKey] ?? (() => notFound()))(event));
