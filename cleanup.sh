#!/usr/bin/env bash
# Deletes everything the NutriMate project created in this AWS account (us-east-1).
set -uo pipefail
export AWS_DEFAULT_REGION=us-east-1
STACK=supp-shop

read -r -p "This permanently deletes the NutriMate app, its data and API keys. Type DELETE to continue: " ok
[ "$ok" = "DELETE" ] || { echo "Cancelled."; exit 1; }

empty_bucket() {   # removes every object and every old version
  local b=$1 out objs count
  [ -n "$b" ] && [ "$b" != "None" ] || return 0
  aws s3api head-bucket --bucket "$b" 2>/dev/null || return 0
  echo "  emptying s3://$b"
  while :; do
    out=$(aws s3api list-object-versions --bucket "$b" --max-items 500 --output json 2>/dev/null)
    [ -z "$out" ] && out='{}'
    objs=$(echo "$out" | jq -c '[(.Versions // [])[], (.DeleteMarkers // [])[] | {Key, VersionId}]')
    count=$(echo "$objs" | jq length)
    [ "$count" -gt 0 ] || break
    aws s3api delete-objects --bucket "$b" --delete "{\"Objects\":$objs,\"Quiet\":true}" >/dev/null
  done
}
output() { aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text 2>/dev/null; }

echo "==> 1/5 App stack ($STACK)"
if aws cloudformation describe-stacks --stack-name "$STACK" >/dev/null 2>&1; then
  empty_bucket "$(output SiteBucket)"
  empty_bucket "$(output ImagesBucket)"
  aws cloudformation delete-stack --stack-name "$STACK"
  echo "  deleting stack (1-3 min)..."
  aws cloudformation wait stack-delete-complete --stack-name "$STACK" && echo "  done" \
    || echo "  WARNING: not finished, check the CloudFormation console"
else
  echo "  not found, skipping"
fi

echo "==> 2/5 API keys in Parameter Store"
aws ssm delete-parameters --names /supp/gemini-api-key /supp/openaq-api-key >/dev/null && echo "  done"

echo "==> 3/5 Lambda log groups"
for lg in $(aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/$STACK" --query "logGroups[].logGroupName" --output text); do
  aws logs delete-log-group --log-group-name "$lg" && echo "  deleted $lg"
done

echo "==> 4/5 SAM upload bucket"
for b in $(aws s3api list-buckets --query "Buckets[?starts_with(Name,'aws-sam-cli-managed-default')].Name" --output text); do
  empty_bucket "$b"
done
if aws cloudformation describe-stacks --stack-name aws-sam-cli-managed-default >/dev/null 2>&1; then
  aws cloudformation delete-stack --stack-name aws-sam-cli-managed-default
  aws cloudformation wait stack-delete-complete --stack-name aws-sam-cli-managed-default && echo "  deleted SAM stack"
fi
for b in $(aws s3api list-buckets --query "Buckets[?starts_with(Name,'aws-sam-cli-managed-default')].Name" --output text); do
  aws s3api delete-bucket --bucket "$b" && echo "  deleted $b"
done

echo "==> 5/5 CloudShell files"
cd ~ && rm -rf ~/supp-shop /tmp/supp-shop ~/.npm ~/.cache ~/.aws-sam
echo "Done. Everything from the NutriMate project is deleted."
