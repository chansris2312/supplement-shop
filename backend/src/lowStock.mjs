// Daily low-stock alert: products with stock < 10 -> one email to the supp-admin-alerts topic.
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { listProducts } from './lib/db.mjs';

const sns = new SNSClient({});
const THRESHOLD = 10;

export const handler = async () => {
  const low = (await listProducts())
    .filter((p) => Number(p.stock) < THRESHOLD)
    .sort((a, b) => a.stock - b.stock);

  if (low.length) {
    const lines = low.map((p) => `- ${p.name} (${p.productId}): เหลือ ${p.stock} ชิ้น`);
    await sns.send(
      new PublishCommand({
        TopicArn: process.env.ADMIN_TOPIC_ARN,
        Subject: `NutriMate low stock alert - ${low.length} product(s)`,
        Message: ['สินค้าใกล้หมด (สต็อกน้อยกว่า 10 ชิ้น):', '', ...lines, '', `เติมสต็อกได้ที่ ${process.env.SITE_URL}/admin`].join('\n'),
      }),
    );
  }

  const summary = { msg: 'lowStock summary', lowCount: low.length, products: low.map((p) => p.productId) };
  console.log(JSON.stringify(summary));
  return summary;
};
