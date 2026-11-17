// GET /api/cart, PUT /api/cart — the cart is the Orders item with orderId = "CART".
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CART_ID, ddb, getProductsByIds, TABLES } from './lib/db.mjs';
import { badRequest, notFound, ok, parseBody, userId, wrap } from './lib/http.mjs';

const toClient = (items = []) => items.map(({ productId, qty }) => ({ productId, qty }));

async function getCart(event) {
  const res = await ddb.send(new GetCommand({ TableName: TABLES.orders, Key: { userId: userId(event), orderId: CART_ID } }));
  return ok({ items: toClient(res.Item?.items) });
}

/** Replaces the whole cart. Unknown products are dropped; qty is clamped to 1..99. */
async function putCart(event) {
  const { items } = parseBody(event);
  if (!Array.isArray(items) || items.length > 50) return badRequest('รายการไม่ถูกต้อง');

  const merged = new Map();
  for (const it of items) {
    const qty = Math.min(99, Math.floor(Number(it?.qty)));
    if (typeof it?.productId === 'string' && qty >= 1) merged.set(it.productId, qty);
  }
  const products = await getProductsByIds([...merged.keys()]);
  const stored = [...merged]
    .filter(([id]) => products.has(id))
    .map(([productId, qty]) => ({ productId, qty, name: products.get(productId).name, price: products.get(productId).price }));

  await ddb.send(
    new PutCommand({
      TableName: TABLES.orders,
      Item: { userId: userId(event), orderId: CART_ID, status: 'cart', items: stored, updatedAt: new Date().toISOString() },
    }),
  );
  return ok({ items: toClient(stored) });
}

const routes = { 'GET /api/cart': getCart, 'PUT /api/cart': putCart };

export const handler = wrap(async (event) => (routes[event.routeKey] ?? (() => notFound()))(event));
