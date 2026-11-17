// GET /api/products, GET /api/products/{id}, POST /api/products (admin), POST /api/uploads (admin)
import { randomUUID } from 'node:crypto';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ddb, listProducts, TABLES } from './lib/db.mjs';
import { badRequest, forbidden, isAdmin, notFound, ok, parseBody, wrap } from './lib/http.mjs';
import { CATEGORIES } from './lib/catalog.mjs';

const s3 = new S3Client({});

const PRICE_FILTERS = {
  lt300: (p) => p < 300,
  mid: (p) => p >= 300 && p <= 500,
  gt500: (p) => p > 500,
};

async function list(event) {
  const { cat, q, price, sort } = event.queryStringParameters ?? {};
  const term = (q ?? '').trim().toLowerCase();
  const priceOk = PRICE_FILTERS[price] ?? (() => true);

  let items = (await listProducts())
    .filter((p) => !cat || cat === 'ทั้งหมด' || p.cat === cat)
    .filter((p) => priceOk(p.price))
    .filter((p) => !term || p.name.toLowerCase().includes(term))
    .sort((a, b) => a.productId.localeCompare(b.productId)); // "แนะนำ" = catalogue order

  if (sort === 'low') items.sort((a, b) => a.price - b.price);
  if (sort === 'high') items.sort((a, b) => b.price - a.price);
  return ok({ items });
}

async function getOne(event) {
  const res = await ddb.send(new GetCommand({ TableName: TABLES.products, Key: { productId: event.pathParameters.id } }));
  return res.Item ? ok(res.Item) : notFound('ไม่พบสินค้า');
}

/** Creates a product, or updates it when productId already exists (used to edit stock). */
async function save(event) {
  if (!isAdmin(event)) return forbidden();
  const b = parseBody(event);
  const name = String(b.name ?? '').trim();
  const price = Number(b.price);
  const stock = Number(b.stock);
  if (!name || name.length > 120) return badRequest('กรุณากรอกชื่อสินค้า');
  if (!CATEGORIES.includes(b.cat)) return badRequest('ประเภทไม่ถูกต้อง');
  if (!Number.isFinite(price) || price <= 0) return badRequest('ราคาไม่ถูกต้อง');
  if (!Number.isInteger(stock) || stock < 0) return badRequest('สต็อกไม่ถูกต้อง');
  const imageUrl = typeof b.imageUrl === 'string' && b.imageUrl.startsWith('https://') ? b.imageUrl : undefined;

  const all = await listProducts();
  let productId = typeof b.productId === 'string' ? b.productId : '';
  const existing = all.find((p) => p.productId === productId);
  if (!existing) {
    // Next id: p13, p14, ...
    const max = all.reduce((m, p) => Math.max(m, parseInt(p.productId.slice(1), 10) || 0), 0);
    productId = 'p' + String(max + 1).padStart(2, '0');
  }

  const item = { ...existing, productId, name, cat: b.cat, price, stock, imageUrl: imageUrl ?? existing?.imageUrl };
  await ddb.send(new PutCommand({ TableName: TABLES.products, Item: item }));
  return ok(item);
}

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/** Presigned PUT URL. The images bucket is public-read, so imageUrl is the direct S3 object URL. */
async function upload(event) {
  if (!isAdmin(event)) return forbidden();
  const { contentType } = parseBody(event);
  const ext = EXT[contentType];
  if (!ext) return badRequest('รองรับเฉพาะไฟล์ PNG, JPEG หรือ WebP');

  const key = `images/products/${randomUUID()}.${ext}`;
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: process.env.IMAGES_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );
  return ok({ uploadUrl, imageUrl: `${process.env.IMAGES_BASE_URL}/${key}` });
}

const routes = {
  'GET /api/products': list,
  'GET /api/products/{id}': getOne,
  'POST /api/products': save,
  'POST /api/uploads': upload,
};

export const handler = wrap(async (event) => (routes[event.routeKey] ?? (() => notFound()))(event));
