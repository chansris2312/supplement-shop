// Shared DynamoDB document client + small query helpers.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchGetCommand, DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLES = {
  products: process.env.PRODUCTS_TABLE,
  users: process.env.USERS_TABLE,
  plans: process.env.PLANS_TABLE,
  orders: process.env.ORDERS_TABLE,
};

export const CART_ID = 'CART';

/** Full table scan with pagination (tables are small in this project). */
export async function scanAll(params) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await ddb.send(new ScanCommand({ ...params, ExclusiveStartKey }));
    items.push(...(res.Items ?? []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

export async function queryAll(params) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const res = await ddb.send(new QueryCommand({ ...params, ExclusiveStartKey }));
    items.push(...(res.Items ?? []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

export const listProducts = () => scanAll({ TableName: TABLES.products });

/** Map productId -> product for the given ids (BatchGet, max 100 keys). */
export async function getProductsByIds(ids) {
  const unique = [...new Set(ids)].slice(0, 100);
  if (!unique.length) return new Map();
  const res = await ddb.send(
    new BatchGetCommand({ RequestItems: { [TABLES.products]: { Keys: unique.map((productId) => ({ productId })) } } }),
  );
  return new Map((res.Responses?.[TABLES.products] ?? []).map((p) => [p.productId, p]));
}

/** Latest plan for a user (Plans SK = createdAt ISO string). */
export async function latestPlan(userId) {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLES.plans,
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
      ScanIndexForward: false,
      Limit: 1,
    }),
  );
  return res.Items?.[0] ?? null;
}

/** Completed orders for a user, newest first. */
export async function listOrders(userId) {
  const items = await queryAll({
    TableName: TABLES.orders,
    KeyConditionExpression: 'userId = :u',
    FilterExpression: '#s = :done',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':u': userId, ':done': 'done' },
  });
  // Newest first; orderId (NM-0001...) breaks ties
  return items.sort(
    (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || String(b.orderId).localeCompare(String(a.orderId)),
  );
}
