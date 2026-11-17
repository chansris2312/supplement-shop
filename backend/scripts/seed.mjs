// Seeds the 12 sample products into the Products table (skips if the table already has items).
// Usage: PRODUCTS_TABLE=<table name> node backend/scripts/seed.mjs
// deploy.sh sets PRODUCTS_TABLE from the CloudFormation stack output.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLE = process.env.PRODUCTS_TABLE;
if (!TABLE) {
  console.error('PRODUCTS_TABLE is not set');
  process.exit(1);
}

const PRODUCTS = [
  ['p01', 'วิตามินซี 1000 มก.', 'ภูมิคุ้มกัน', 290],
  ['p02', 'คอลลาเจนเปปไทด์', 'ผิวพรรณ', 590],
  ['p03', 'แมกนีเซียม', 'การนอนหลับ', 350],
  ['p04', 'วิตามินบีรวม', 'พลังงาน', 320],
  ['p05', 'โอเมก้า-3 น้ำมันปลา', 'สุขภาพทั่วไป', 450],
  ['p06', 'วิตามินดี 3', 'กระดูกและข้อ', 390],
  ['p07', 'ซิงค์', 'ภูมิคุ้มกัน', 250],
  ['p08', 'ไบโอติน', 'ผิวพรรณ', 390],
  ['p09', 'โพรไบโอติก', 'สุขภาพทั่วไป', 520],
  ['p10', 'แคลเซียม + วิตามินเค 2', 'กระดูกและข้อ', 480],
  ['p11', 'กลูตาไธโอน', 'ผิวพรรณ', 690],
  ['p12', 'ธาตุเหล็ก', 'พลังงาน', 220],
].map(([productId, name, cat, price]) => ({ productId, name, cat, price, stock: 50 }));

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));

const existing = await ddb.send(new ScanCommand({ TableName: TABLE, Limit: 1 }));
if (existing.Items?.length) {
  console.log(`Products table ${TABLE} already has items — skipping seed.`);
  process.exit(0);
}

// BatchWrite takes max 25 items per call
for (let i = 0; i < PRODUCTS.length; i += 25) {
  const chunk = PRODUCTS.slice(i, i + 25);
  await ddb.send(new BatchWriteCommand({ RequestItems: { [TABLE]: chunk.map((Item) => ({ PutRequest: { Item } })) } }));
}
console.log(`Seeded ${PRODUCTS.length} products into ${TABLE}.`);
