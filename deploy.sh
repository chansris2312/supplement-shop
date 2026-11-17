#!/usr/bin/env bash
# One-command deploy for NutriMate. Run from the repo root in AWS CloudShell (ap-southeast-1):
#   ADMIN_EMAIL=you@example.com ./deploy.sh
# Optional: GEMINI_MODEL=gemini-2.5-flash ./deploy.sh   (overrides the template default)
set -euo pipefail

STACK=supp-shop
REGION=ap-southeast-1
export AWS_REGION=$REGION AWS_DEFAULT_REGION=$REGION
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

step() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

# ---------------------------------------------------------------- 1. API keys in SSM
step "1/6 Checking API keys in SSM Parameter Store"
missing=0
for name in /supp/gemini-api-key /supp/openaq-api-key; do
  if aws ssm get-parameter --name "$name" --query Parameter.Name --output text >/dev/null 2>&1; then
    echo "  found $name"
  else
    echo "  MISSING $name"
    missing=1
  fi
done
if [ "$missing" = 1 ]; then
  cat <<'EOF'

Create the missing parameter(s), then run ./deploy.sh again.
(read -s keeps the key out of your shell history and screen)

  read -s -p "Gemini API key: " KEY && echo && \
  aws ssm put-parameter --name /supp/gemini-api-key --type SecureString --value "$KEY" --overwrite --region ap-southeast-1 && unset KEY

  read -s -p "OpenAQ API key: " KEY && echo && \
  aws ssm put-parameter --name /supp/openaq-api-key --type SecureString --value "$KEY" --overwrite --region ap-southeast-1 && unset KEY
EOF
  exit 1
fi

# ---------------------------------------------------------------- 2. Backend (SAM)
if [ -z "${ADMIN_EMAIL:-}" ]; then
  read -r -p "Admin email for low-stock alerts: " ADMIN_EMAIL
fi
[ -n "$ADMIN_EMAIL" ] || { echo "ADMIN_EMAIL is required"; exit 1; }

OVERRIDES="AdminEmail=$ADMIN_EMAIL"
if [ -n "${GEMINI_MODEL:-}" ]; then OVERRIDES="$OVERRIDES GeminiModel=$GEMINI_MODEL"; fi

step "2/6 Building and deploying backend stack '$STACK' (first run takes ~5-10 min for CloudFront)"
(
  cd backend
  sam build
  sam deploy \
    --stack-name "$STACK" \
    --region "$REGION" \
    --resolve-s3 \
    --capabilities CAPABILITY_IAM \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset \
    --parameter-overrides $OVERRIDES
  rm -rf .aws-sam # free CloudShell storage
)

# ---------------------------------------------------------------- 3. Stack outputs -> frontend env
step "3/6 Reading stack outputs"
out() {
  aws cloudformation describe-stacks --stack-name "$STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
API_URL=$(out ApiUrl)
USER_POOL_ID=$(out UserPoolId)
CLIENT_ID=$(out UserPoolClientId)
COGNITO_DOMAIN=$(out CognitoDomain)
SITE_URL=$(out SiteUrl)
SITE_BUCKET=$(out SiteBucket)
DIST_ID=$(out DistributionId)
PRODUCTS_TABLE=$(out ProductsTable)

cat > frontend/.env.production <<EOF
VITE_API_URL=$API_URL
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$CLIENT_ID
VITE_COGNITO_DOMAIN=$COGNITO_DOMAIN
VITE_SITE_URL=$SITE_URL
VITE_USE_MOCK=false
EOF
echo "  wrote frontend/.env.production"

# ---------------------------------------------------------------- 4. Frontend build + upload
step "4/6 Building frontend and uploading to S3"
(
  cd frontend
  npm ci --no-audit --no-fund
  npm run build
  # Hashed assets can be cached for a long time; index.html must always be fresh
  aws s3 sync dist/ "s3://$SITE_BUCKET" --delete --exclude index.html \
    --cache-control "public,max-age=31536000,immutable"
  aws s3 cp dist/index.html "s3://$SITE_BUCKET/index.html" \
    --cache-control "no-cache" --content-type "text/html; charset=utf-8"
  aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" \
    --query Invalidation.Id --output text
  rm -rf node_modules # CloudShell has ~1 GB home storage
)

# ---------------------------------------------------------------- 5. Seed products (once)
step "5/6 Seeding products (skipped if the table already has items)"
(
  cd backend
  npm ci --omit=dev --no-audit --no-fund
  PRODUCTS_TABLE="$PRODUCTS_TABLE" node scripts/seed.mjs
  rm -rf node_modules
)

# ---------------------------------------------------------------- 6. Done
step "6/6 Done"
cat <<EOF

  Site URL:  $SITE_URL
  API URL:   $API_URL

Next steps:
  1. Check $ADMIN_EMAIL for "AWS Notification - Subscription Confirmation" and click
     "Confirm subscription" (needed for low-stock alerts).
  2. Open $SITE_URL, click "เข้าสู่ระบบ" and create an account (verify the email code).
  3. Make yourself an admin (then sign out and in again):
       aws cognito-idp admin-add-user-to-group --region $REGION \\
         --user-pool-id $USER_POOL_ID --group-name admin --username <your-email>
  4. Turn on "สัญญาณสุขภาพรายสัปดาห์" on the result page and confirm the AWS email.
  5. Test the weekly job now: Lambda console > ${STACK}-WeeklySignalFunction-* > Test (event {}).

If the site shows an old version, wait 1-2 minutes for the CloudFront invalidation.
EOF
