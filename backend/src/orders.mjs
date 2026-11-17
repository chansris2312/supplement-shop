// POST /api/orders (cart -> order), GET /api/orders (my orders, newest first)
import { GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { CART_ID, ddb, getProductsByIds, listOrders, TABLES } from './lib/db.mjs';
import { badRequest, json, notFound, ok, userId, wrap } from './lib/http.mjs';
import { SHIPPING } from './lib/catalog.mjs';

// Global order-number counter lives in the Orders table under a reserved key.
const COUNTER_KEY = { userId: '#COUNTER', orderId: 'ORDER' };

async function nextOrderId() {
  const res = await ddb.send(
    new UpdateCommand({
      TableName: TABLES.orders,
      Key: COUNTER_KEY,
      UpdateExpression: 'ADD seq :one',
      ExpressionAttributeValues: { ':one': 1 },
      ReturnValues: 'UPDATED_NEW',
    }),
  );
  return 'NM-' + String(res.Attributes.seq).padStart(4, '0');
}

async function createOrder(event) {
  const uid = userId(event);
  const cartRes = await ddb.send(new GetCommand({ TableName: TABLES.orders, Key: { userId: uid, orderId: CART_ID } }));
  const cart = cartRes.Item?.items ?? [];
  if (!cart.length) return badRequest('ตะกร้าว่าง');

  // Use current prices; check stock up front for a friendly message
  const products = await getProductsByIds(cart.map((c) => c.productId));
  const items = [];
  for (const c of cart) {
    const p = products.get(c.productId);
    if (!p) continue;
    if (p.stock < c.qty) return json(409, { message: `${p.name} มีสินค้าไม่พอ (เหลือ ${p.stock} ชิ้น)` });
    items.push({ productId: p.productId, name: p.name, qty: c.qty, price: p.price });
  }
  if (!items.length) return badRequest('ตะกร้าว่าง');

  const subtotal = items.reduce((t, i) => t + i.price * i.qty, 0);
  const order = {
    userId: uid,
    orderId: await nextOrderId(),
    status: 'done',
    items,
    subtotal,
    shipping: SHIPPING,
    total: subtotal + SHIPPING,
    createdAt: new Date().toISOString(),
  };

  // Atomically: save order, reduce stock (never below zero), clear cart
  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          { Put: { TableName: TABLES.orders, Item: order } },
          ...items.map((i) => ({
            Update: {
              TableName: TABLES.products,
              Key: { productId: i.productId },
              UpdateExpression: 'SET stock = stock - :q',
              ConditionExpression: 'stock >= :q',
              ExpressionAttributeValues: { ':q': i.qty },
            },
          })),
          { Delete: { TableName: TABLES.orders, Key: { userId: uid, orderId: CART_ID } } },
        ],
      }),
    );
  } catch (err) {
    if (err.name === 'TransactionCanceledException') return json(409, { message: 'สินค้าบางรายการมีไม่พอ กรุณาลองใหม่' });
    throw err;
  }

  const { userId: _omit, ...publicOrder } = order;
  return ok(publicOrder);
}

async function myOrders(event) {
  const items = (await listOrders(userId(event))).map(({ userId: _omit, ...o }) => o);
  return ok({ items });
}

const routes = { 'POST /api/orders': createOrder, 'GET /api/orders': myOrders };

export const handler = wrap(async (event) => (routes[event.routeKey] ?? (() => notFound()))(event));
