# CLAUDE.md — NutriMate: AI Supplement Shop on AWS

You are building a complete, deployable full-stack web app for a university AWS group project.
Build everything in this file. Do not ask for confirmation between steps; make reasonable choices and note them in README.md.

- **App:** a supplement e-commerce site. Customers answer a lifestyle questionnaire; AI (Google Gemini API) recommends supplements with reasons and how to take them; customers buy them; a weekly automated email ("Wellness Signal") sends air-quality-aware tips.
- **Brand:** "NutriMate" (working name). All UI text is **Thai**, exactly as written below.
- **UI source of truth:** `design/app/*.dc.html` (5 files). Build the React UI to look and behave **exactly** like them (layout, colors, spacing, copy, interactions). Section 6 summarizes them.
- **Deploy target:** AWS, region `us-east-1` (AWS Academy Learner Lab), using **AWS SAM**, deployed from AWS CloudShell with `./deploy.sh`.

---

## 1. Assessment rules this project must satisfy

- At least 4 counted AWS services. IAM, VPC, CloudWatch, CLI and Cost & Usage Report do **not** count.
- Counted services used: **S3, CloudFront, Cognito, API Gateway (HTTP API), Lambda, DynamoDB, EventBridge, SNS, Systems Manager Parameter Store**.
- External APIs: **Gemini API** (AI) and **OpenAQ API v3** (PM2.5 air quality).
- Level 4 = automated + integrated: the weekly signal job must run on a schedule with no human action.
- Deliverable: `README.md` must be a step-by-step guide that **another student group can follow from zero** to deploy the app.

## 2. Tech stack and repo layout

```
/
├─ CLAUDE.md
├─ README.md                 # follow-along guide (see section 9)
├─ deploy.sh                 # one-command deploy (see section 8)
├─ design/app/*.dc.html      # UI reference — do not deploy
├─ frontend/                 # React 18 + Vite + TypeScript + Tailwind CSS + React Router
│  ├─ src/pages/             # Shop, Quiz, Result, Cart, History, Admin
│  ├─ src/components/        # Navbar, PageHeader, ProductCard, Pill, etc.
│  ├─ src/api/               # API client + mock implementation
│  └─ src/mock/              # mock data (same data as section 7)
└─ backend/
   ├─ template.yaml          # AWS SAM template, all resources
   ├─ src/                   # Node.js 22 Lambda handlers (ES modules, AWS SDK v3)
   └─ scripts/seed.mjs       # seeds 12 products
```

- Auth in the frontend: AWS Amplify v6 (`aws-amplify`, Auth only) — `signUp`, `confirmSignUp`, `signIn` (`USER_PASSWORD_AUTH`), `signOut` with in-app Thai pages `/login` and `/signup` (email + password, confirmation-code step). **No Cognito hosted UI / domain** (Learner Lab). Must work on http (S3 website URL) and https.
- Mock mode: when `VITE_USE_MOCK=true`, the frontend uses in-memory mock API + mock user and runs fully on `npm run dev` with no AWS.

## 3. AWS architecture (backend/template.yaml)

| Resource | Details |
|---|---|
| S3 bucket (site) | Static website hosting (IndexDocument + ErrorDocument `index.html`), Block Public Access off, public `s3:GetObject` bucket policy. **No OAC/OAI** (Learner Lab denies `cloudfront:CreateOriginAccessControl`). |
| S3 bucket (images) | Product images; public-read bucket policy; `imageUrl` = direct S3 URL. |
| CloudFront | Optional (parameter `UseCloudFront`, default `"true"`; `deploy.sh` reads `USE_CLOUDFRONT`). Origin = S3 **website endpoint** as `CustomOriginConfig` (http-only). SPA fallback: 403/404 → `/index.html` 200. HTTPS. When `"false"`: no distribution, `SiteUrl` = bucket website URL. |
| Cognito | User Pool (email sign-in, email verification code) + App Client (no secret; `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_USER_SRP_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH`). No domain / hosted UI. Group `admin`. |
| API Gateway HTTP API | Routes in section 4. JWT authorizer = the Cognito pool. CORS for CloudFront URL and localhost:5173. |
| Lambda (Node.js 22) | One function per area: products, cart, orders, quiz, me, weeklySignal, lowStock. Learner Lab: the template creates **no IAM roles or policies**; every function sets `Role: !Sub arn:aws:iam::${AWS::AccountId}:role/LabRole`. |
| DynamoDB | 4 tables, on-demand (section 5). |
| EventBridge rules | `AWS::Events::Rule` + `AWS::Lambda::Permission` (no role). Cron is UTC: `cron(0 1 ? * MON *)` (= Monday 08:00 Bangkok) → weeklySignal; `cron(0 2 * * ? *)` (= 09:00 Bangkok) → lowStock. |
| SNS | Topic `supp-wellness-signal` (per-user email subscriptions with filter policy on `userId`). Topic `supp-admin-alerts` (admin email from a template parameter `AdminEmail`). |
| SSM Parameter Store | `/supp/gemini-api-key`, `/supp/openaq-api-key` (SecureString, created manually before deploy). Lambdas read them **at runtime** with `GetParameter WithDecryption` and cache in memory. Never put keys in code, env files or Git. |
| CloudWatch Logs | Default for every Lambda. |

Template parameters: `AdminEmail`, `GeminiModel` (default a current Gemini Flash model name; make it easy to change), `UseCloudFront`. Outputs: `ApiUrl`, `UserPoolId`, `UserPoolClientId`, `SiteBucket`, `ImagesBucket`, `DistributionId` (`none` without CloudFront), `SiteUrl`.

## 4. API routes (prefix `/api`)

| Route | Auth | Does |
|---|---|---|
| `GET /api/products` | public | List products (query: `cat`, `q`, `price`, `sort`) |
| `GET /api/products/{id}` | public | One product |
| `POST /api/products` | admin group | Add product |
| `POST /api/uploads` | admin group | Return a presigned S3 PUT URL for a product image |
| `GET /api/cart` / `PUT /api/cart` | user | Read / replace cart items `[{productId, qty}]` |
| `POST /api/orders` | user | Turn cart into an order (shipping ฿40), reduce stock, clear cart |
| `GET /api/orders` | user | My orders, newest first |
| `POST /api/quiz` | user | Save answers, call Gemini, save + return the plan |
| `GET /api/plans/latest` | user | My latest plan |
| `GET /api/me` / `PUT /api/me` | user | Read / set `{city, weeklySignal}`; on opt-in subscribe the user's email to the SNS topic with filter policy `{"userId":["<sub>"]}`; on opt-out unsubscribe |

## 5. DynamoDB tables

| Table | Keys | Attributes |
|---|---|---|
| Products | PK `productId` | name, cat, price, stock, imageUrl |
| Users | PK `userId` (Cognito sub) | email, city, weeklySignal (bool), subscriptionArn |
| Plans | PK `userId`, SK `createdAt` | answers (map), result (map), needsDoctor (bool) |
| Orders | PK `userId`, SK `orderId` | status (`cart` or `done`), items `[{productId,name,qty,price}]`, subtotal, shipping, total, createdAt |

Cart = the single Orders item with `orderId = "CART"`, `status = "cart"`. Order ids: `NM-0001`, `NM-0002`… (shown as `#NM-0001`).

## 6. UI specification (match `design/app/*.dc.html` exactly)

How to read the reference files: each `.dc.html` is a static mockup in a small template language. `{{x}}` = value computed in the `renderVals()` method of the `<script type="text/x-dc">` class at the bottom; `<sc-for list="{{items}}" as="it">` = map over a list; `<sc-if value="{{cond}}">` = conditional render; `onClick="{{fn}}"` = event handler. All styles are inline — copy the values into Tailwind (use arbitrary values like `bg-[#DFF4EF]` or extend the theme). The mock data in each file is the mock data to use.

### 6.1 Design tokens

| Token | Value |
|---|---|
| Page background | `#F4FAF9` |
| Surface (cards, navbar) | `#FFFFFF` |
| Border | `#DCEBE7` (1px) |
| Input border | `#C5DAD5` |
| Table header bg | `#EEF7F5` |
| Mint tint (active nav, pills, banner) | `#DFF4EF` |
| Avatar bg | `#BFE8DF` |
| Primary (buttons, links, badges) | `#1E7F74`, hover `#165F57` |
| Primary-dark text on mint | `#155E56` |
| Text | `#1B2A27`; navbar text `#17302C` |
| Muted text | `#5B6B66`; nav icon `#3E5C56` |
| Warning box | bg `#FFF4E0`, text `#6B4A12` |
| Danger text (remove) | `#A23B2A` |
| Weekly-signal card | bg `#E6F6F2`, border `#C9EAE2` |
| Category tints (image placeholders) | ผิวพรรณ `#F6E7E4`, การนอนหลับ `#E7E8F4`, พลังงาน `#F6EEDB`, ภูมิคุ้มกัน `#E2F1E8`, กระดูกและข้อ `#ECEAE4`, สุขภาพทั่วไป `#E1EEF2` |

- Fonts (Google Fonts): **Prompt** 500/600 for headings, logo and prices; **Noto Sans Thai** 400/500/600 for everything else.
- Radii: cards 14–16px, buttons/inputs 10–12px, pills/chips 999px. All clickable controls ≥ 44px tall.
- Product images: until real images exist, show the tinted box with the outline bottle icon and label "ภาพสินค้า" (see files). When `imageUrl` exists, show the image with `object-fit: cover`.
- Icons: simple 2px stroke line icons as in the files (bag, clipboard, sparkle, cart, clock, leaf logo). No emoji.

### 6.2 Global layout (every page)

1. **Top navbar** (white, bottom border, padding 12px 32px, wraps on small screens):
   - Left: leaf logo (stroke `#1E7F74`) + "NutriMate" (Prompt 600, 21px), links to Shop.
   - Center: nav links as pills (padding 10px 14px, 15px, 18px icon): `ร้านค้า` (/), `วิเคราะห์ไลฟ์สไตล์` (/quiz), `ผลวิเคราะห์จาก AI` (/result), `ตะกร้า` (/cart, with count badge `#1E7F74` white 12px), `ประวัติการซื้อ` (/history). Active link: bg `#DFF4EF`, text `#155E56`, weight 600, `aria-current="page"`.
   - Right: status chip (mint bg, dot) `อีเมลสุขภาพรายสัปดาห์ · เปิด` or `· ปิด` from the user's setting; avatar circle (38px, `#BFE8DF`, first letter of the name/email) with a small menu: `ออกจากระบบ`. If not signed in, show a primary button `เข้าสู่ระบบ` instead.
2. **Page header** under the navbar: transparent, padding 24px 32px 0, `h1` Prompt 600 24px on the left, page action on the right.
3. **Main**: padding 28px 32px 48px, full width.

Routes needing login: /quiz, /result, /cart, /history (redirect to `/login?next=...`). Shop is public; "+ ตะกร้า" when signed out → sign in.

### 6.3 Shop (`/`) — `design/app/Shop.dc.html`
- Header: title `ร้านค้า`; right: search input (320px, bg `#F4FAF9`, placeholder `ค้นหาสินค้า เช่น คอลลาเจน`).
- Mint banner: sparkle icon + `ไม่แน่ใจว่าควรทานอะไร? ให้ AI ช่วยเลือกจากไลฟ์สไตล์ของคุณ` + primary link-button `เริ่มวิเคราะห์ →` (/quiz).
- Left filter card (220px): `ประเภท` list buttons with counts (`ทั้งหมด`, `ผิวพรรณ`, `การนอนหลับ`, `พลังงาน`, `ภูมิคุ้มกัน`, `กระดูกและข้อ`, `สุขภาพทั่วไป`); `ช่วงราคา` (`ทุกราคา`, `ต่ำกว่า ฿300`, `฿300 – ฿500`, `มากกว่า ฿500`); `ล้างตัวกรอง`. Selected = primary bg, white text.
- Right: `{n} รายการ` + `เรียงตาม` select (`แนะนำ`, `ราคา: ต่ำ → สูง`, `ราคา: สูง → ต่ำ`); grid **4 per row** (2 below 1100px), gap 16px.
- Card: 4:3 image area, category pill, name (16px 600), price (Prompt 18px, `฿` + Thai number format), button `+ ตะกร้า` (adds 1, updates navbar badge, small toast `เพิ่มลงตะกร้าแล้ว`).
- Empty: `ไม่พบสินค้าที่ตรงกับตัวกรอง`.

### 6.4 Lifestyle quiz (`/quiz`) — `design/app/Quiz.dc.html`
- Header: `วิเคราะห์ไลฟ์สไตล์`; right: `ขั้นที่ {x} จาก 6`.
- 3 columns: step list (220px) | form card | `คำตอบของคุณ` summary (260px).
- Step list: numbered dots; current = mint bg; completed = ✓. Clicking a step jumps to it.
- Form card: step title (Prompt 22px) + progress bar (8px). Answers are pill buttons (`aria-pressed`). Footer: `← ย้อนกลับ` and `ถัดไป →`.
- Steps and options (exact):
  1. `ข้อมูลร่างกาย`: inputs อายุ (ปี), น้ำหนัก (กก.), ส่วนสูง (ซม.); live text `BMI ของคุณ 22.0 · ปกติ (เกณฑ์คนเอเชีย)` (Asian cut-offs: <18.5 น้ำหนักน้อย, <23 ปกติ, <25 น้ำหนักเกิน, else อ้วน).
  2. `การนอนหลับ`: นอนกี่ชั่วโมงต่อคืน [น้อยกว่า 5 ชม., 5–6 ชม., 7–8 ชม., มากกว่า 8 ชม.]; คุณภาพการนอน [หลับยาก, ตื่นกลางดึกบ่อย, หลับสบาย]
  3. `การทำงาน`: ลักษณะงานส่วนใหญ่ [นั่งโต๊ะเป็นหลัก, ยืนหรือเดินบ่อย, ใช้แรงงาน, ทำงานเป็นกะ / กะดึก]; ชั่วโมงทำงานต่อวัน [น้อยกว่า 8 ชม., 8–10 ชม., มากกว่า 10 ชม.]
  4. `อาหารการกิน`: กินอาหารกี่มื้อต่อวัน [1 มื้อ, 2 มื้อ, 3 มื้อ, 4 มื้อขึ้นไป]; รูปแบบการกิน [ทั่วไป, มังสวิรัติ, วีแกน, คาร์บต่ำ / คีโต]; กินผักและผลไม้ [แทบไม่กิน, บางมื้อ, ทุกมื้อ]
  5. `ออกกำลังกายและความเครียด`: ออกกำลังกายกี่วันต่อสัปดาห์ [ไม่ออกเลย, 1–2 วัน, 3–4 วัน, 5 วันขึ้นไป]; ระดับความเครียด (1 = น้อย, 5 = มาก) [1..5]
  6. `เป้าหมายและสุขภาพ`: อยากดูแลเรื่องไหน (เลือกได้หลายข้อ) [ผิวพรรณ, การนอนหลับ, พลังงาน, ภูมิคุ้มกัน, กระดูกและข้อ] (multi); ตั้งครรภ์หรือให้นมบุตร [ใช่, ไม่ใช่, ไม่เกี่ยวข้อง]; textarea `ยาที่ทานประจำ หรือโรคประจำตัว (ถ้ามี)`; consent checkbox `ยินยอมให้ใช้ข้อมูลนี้เพื่อวิเคราะห์และแนะนำอาหารเสริม (ไม่ส่งชื่อหรืออีเมลให้ AI)`.
- Last step: submit `ส่งให้ AI วิเคราะห์ →` only when consent is ticked, else grey note `ติ๊กยินยอมก่อนส่งให้ AI วิเคราะห์`. Submitting shows a loading state `AI กำลังวิเคราะห์…`, calls `POST /api/quiz`, then navigates to /result.
- Summary column lists every answered item; warning box: `มียาประจำ โรคประจำตัว หรือตั้งครรภ์? AI จะแนะนำให้ปรึกษาแพทย์หรือเภสัชกรก่อน`.

### 6.5 AI result (`/result`) — `design/app/Result.dc.html`
- Header: `ผลวิเคราะห์จาก AI`; right: outline link `แก้คำตอบ / ทำใหม่` (/quiz). No plan yet → empty state with link to /quiz.
- Left column:
  - Summary card: sparkle icon tile, `สรุปไลฟ์สไตล์ของคุณ`, AI `summary` text, 5 stat tiles (การนอน, การทำงาน, มื้ออาหาร, ความเครียด, BMI) from the answers.
  - If `needsDoctor`: warning banner `ควรปรึกษาแพทย์หรือเภสัชกรก่อนทานอาหารเสริม` above the list.
  - Recommendations card: `อาหารเสริมที่ AI แนะนำ` + outline button `ใส่ทั้งหมดลงตะกร้า (n)` / `ใส่ครบทุกชิ้นแล้ว ✓`. Each row: 112px image, name + category pill, `ทำไมถึงแนะนำ:` reason, `วิธีทาน:` how, right block (168px): price, button `ใส่ตะกร้า` / `อยู่ในตะกร้าแล้ว`, link `ดูรายละเอียดสินค้า`.
- Right column (300px):
  - Weekly-signal card: `สัญญาณสุขภาพรายสัปดาห์` + toggle switch (`role="switch"`), text `ทุกวันจันทร์ 08:00 AI จะส่งอีเมลสรุปคุณภาพอากาศ (PM2.5) ในเมืองของคุณ พร้อมเคล็ดลับประจำสัปดาห์และเตือนเมื่อใกล้ถึงเวลาซื้อซ้ำ`, select `เมืองของคุณ` [กรุงเทพมหานคร, เชียงใหม่, ขอนแก่น, ภูเก็ต]. Changes call `PUT /api/me`; after opt-in show `กรุณายืนยันอีเมลจาก AWS ในกล่องจดหมายของคุณ`.
  - `ปรับไลฟ์สไตล์เพิ่มเติม` list = AI `lifestyleTips`.
  - Disclaimer box: `คำแนะนำนี้สร้างโดย AI ไม่ใช่คำแนะนำทางการแพทย์ หากมีโรคประจำตัว ทานยาอยู่ หรือตั้งครรภ์ ควรปรึกษาแพทย์หรือเภสัชกรก่อน`.

### 6.6 Cart (`/cart`) — `design/app/Cart.dc.html`
- Header: `ตะกร้าสินค้า`; right: `← เลือกซื้อสินค้าต่อ`.
- Table: `สินค้า` (56px image + name) | `ราคา/ชิ้น` | `จำนวน` (− qty +, min 1) | `รวม` | `ลบ`. Empty: `ยังไม่มีสินค้าในตะกร้า`.
- Summary card (300px): `สรุปคำสั่งซื้อ`, `จำนวนสินค้า`, `ราคาสินค้า`, `ค่าจัดส่ง` ฿40, `รวมทั้งหมด` (Prompt 26px), primary button `สั่งซื้อ` (52px; disabled when empty), note `ชำระเงินแบบจำลองสำหรับเดโม เมื่อกดสั่งซื้อ รายการจะไปอยู่ในประวัติการซื้อ`.
- After order: success card `สั่งซื้อสำเร็จ` / `บันทึกคำสั่งซื้อไว้ในประวัติการซื้อแล้ว และล้างรายการในตะกร้าเรียบร้อย` / button `ดูประวัติการซื้อ`.

### 6.7 Purchase history (`/history`) — `design/app/History.dc.html`
- Header: `ประวัติการซื้อ`; right: `เลือกซื้อสินค้า →`.
- 3 KPI tiles: `คำสั่งซื้อทั้งหมด`, `ยอดซื้อรวม`, `สั่งซื้อล่าสุด` (Thai date, Buddhist year, e.g. `17 พ.ย. 2569`).
- Table: `เลขที่คำสั่งซื้อ` | `วันที่` | `รายการ` (one line per item, `name × qty`) | `ยอดรวม` | `สถานะ` (pill `สั่งซื้อสำเร็จ`) | button `รายละเอียด`/`ซ่อน` that expands a row: `ราคาสินค้า`, `ค่าจัดส่ง: ฿40`, `ชำระเงิน: แบบจำลอง (เดโม)`, link `สั่งซื้ออีกครั้ง` (adds the same items to the cart).

### 6.8 Admin (`/admin`, admin group only; not in the mockups)
Same style: a card with a form (name, category select, price, stock, image upload via presigned URL) and a simple table of products with stock. Link to it from the avatar menu for admins.

## 7. Seed / mock data (12 products)

| id | name | cat | price |
|---|---|---|---|
| p01 | วิตามินซี 1000 มก. | ภูมิคุ้มกัน | 290 |
| p02 | คอลลาเจนเปปไทด์ | ผิวพรรณ | 590 |
| p03 | แมกนีเซียม | การนอนหลับ | 350 |
| p04 | วิตามินบีรวม | พลังงาน | 320 |
| p05 | โอเมก้า-3 น้ำมันปลา | สุขภาพทั่วไป | 450 |
| p06 | วิตามินดี 3 | กระดูกและข้อ | 390 |
| p07 | ซิงค์ | ภูมิคุ้มกัน | 250 |
| p08 | ไบโอติน | ผิวพรรณ | 390 |
| p09 | โพรไบโอติก | สุขภาพทั่วไป | 520 |
| p10 | แคลเซียม + วิตามินเค 2 | กระดูกและข้อ | 480 |
| p11 | กลูตาไธโอน | ผิวพรรณ | 690 |
| p12 | ธาตุเหล็ก | พลังงาน | 220 |

Stock: 50 each. Prices and products are samples. Mock mode also includes the 3 sample orders and the sample plan from the design files.

## 8. AI and automation

### Planner (`POST /api/quiz`)
- Call `https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent` with header `x-goog-api-key`, `generationConfig.responseMimeType = "application/json"` and a response schema.
- Prompt (Thai output): you are a supplement assistant for an online shop, not a doctor; recommend at most 3 products, only from the given list (`productId`, `name`, `cat`); give a short reason and "how to take" that says to follow the label; reply JSON only.
- Send only the questionnaire answers + product list. **Never send name, email or user id.**
- Output shape:
```json
{
  "summary": "string (Thai)",
  "recommendations": [{ "productId": "p03", "reason": "string", "howToTake": "string" }],
  "lifestyleTips": ["string", "string", "string"],
  "needsDoctor": false
}
```
- In code (not only in the prompt): drop any `productId` not in Products; force `needsDoctor = true` if medication/conditions text is non-empty or pregnancy = `ใช่`; validate JSON, retry once, then fall back to a rule-based plan from goal → category.

### Weekly signal (Lambda `weeklySignal`, EventBridge rule, Monday 08:00 Asia/Bangkok = 01:00 UTC)
1. Scan Users with `weeklySignal = true`.
2. For each **distinct city**, get latest PM2.5 from OpenAQ v3 (header `X-API-Key`), one call per city, cache in the run. No data → say so.
3. For each user: latest plan + last order date → Gemini writes a 3-line Thai note (air quality this week, one lifestyle tip, refill reminder if the last order is over 25 days old).
4. Publish to `supp-wellness-signal` with message attribute `userId`. Every email ends with the disclaimer and how to turn the email off.
- Log a summary line (users processed, cities, failures) to CloudWatch for the demo.

### Low-stock alert (Lambda `lowStock`, daily)
Products with `stock < 10` → one email to `supp-admin-alerts`.

## 9. deploy.sh and README.md

`deploy.sh` (bash, `set -euo pipefail`, runnable in AWS CloudShell):
1. Check that `/supp/gemini-api-key` and `/supp/openaq-api-key` exist in SSM; if not, print the exact `aws ssm put-parameter` commands and exit.
   Then, if the stack status is `ROLLBACK_COMPLETE`, empty its buckets, delete it and wait until it is gone.
2. `cd backend && sam build && sam deploy --stack-name supp-shop --resolve-s3 --capabilities CAPABILITY_IAM --no-confirm-changeset --no-fail-on-empty-changeset --parameter-overrides AdminEmail=$ADMIN_EMAIL UseCloudFront=$USE_CLOUDFRONT` (ask for `ADMIN_EMAIL` if unset; `USE_CLOUDFRONT` defaults to `true`).
3. Read stack outputs; write `frontend/.env.production` (`VITE_API_URL`, `VITE_USER_POOL_ID`, `VITE_USER_POOL_CLIENT_ID`, `VITE_SITE_URL`, `VITE_USE_MOCK=false`).
4. `cd frontend && npm ci && npm run build && aws s3 sync dist/ s3://$SITE_BUCKET --delete && aws cloudfront create-invalidation ...`; then `rm -rf node_modules` (CloudShell has ~1 GB home storage).
5. Run `node backend/scripts/seed.mjs` once (skip if Products already has items).
6. Print the site URL and next steps (confirm SNS emails, add yourself to the `admin` group command).

`README.md`: written for another student group, in this order: what the app does, architecture diagram (Mermaid), list of counted services, prerequisites (AWS account, Gemini key from Google AI Studio, OpenAQ key), step-by-step deploy in CloudShell with every command, how to test each feature, how to trigger the weekly job manually (Lambda console › Test), how to delete everything (`sam delete --stack-name supp-shop` + empty buckets), cost notes.

## 10. Rules

- Never commit secrets. Add `.gitignore` for `node_modules`, `dist`, `.env*` (except `.env.example`), `.aws-sam`.
- Thai number format with `toLocaleString('th-TH')`; prices prefixed `฿`.
- Accessible: real `<button>`, `<a>`, `<label>`; `aria-pressed` on pill toggles; `aria-current` on active nav; `aria-label` on icon buttons.
- Keep functions small and readable; comments in English.
- Each page must work at desktop width first (1280–1440px) and still be usable at phone width (navbar wraps, columns stack).

## 11. Definition of done

- [ ] `cd frontend && VITE_USE_MOCK=true npm run dev` shows all 5 pages matching `design/app/*.dc.html`.
- [ ] `sam validate` passes; `./deploy.sh` deploys from CloudShell and prints the CloudFront URL.
- [ ] Sign up → quiz → AI plan → add to cart → order → history works on the live site.
- [ ] Weekly signal toggle subscribes the email; running `weeklySignal` manually sends an email with PM2.5 + tip.
- [ ] Low-stock email arrives when a product's stock is set below 10.
- [ ] README lets another group deploy from zero.
- [ ] All work committed to Git with clear commit messages.
