#!/bin/bash
set -e

ENDPOINT="http://localhost:4566"
REGION="us-east-1"
TABLE="jobs"
BUCKET="job-execution-files"

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=$REGION

echo "==> Waiting for LocalStack..."
until curl -s "$ENDPOINT/_localstack/health" | grep -E '"dynamodb": "(available|running)"' > /dev/null; do
  sleep 1
done
echo "==> LocalStack is ready"

echo "==> Creating DynamoDB table: $TABLE"
aws --endpoint-url="$ENDPOINT" dynamodb create-table \
  --table-name "$TABLE" \
  --attribute-definitions \
    AttributeName=jobId,AttributeType=S \
    AttributeName=entityType,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema AttributeName=jobId,KeyType=HASH \
  --global-secondary-indexes '[{"IndexName":"entityType-createdAt-index","KeySchema":[{"AttributeName":"entityType","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --billing-mode PAY_PER_REQUEST \
  2>&1 | grep -v "ResourceInUseException" || true
echo "    Done"

echo "==> Creating S3 bucket: $BUCKET"
aws --endpoint-url="$ENDPOINT" s3api create-bucket \
  --bucket "$BUCKET" \
  --region "$REGION" \
  2>&1 | grep -v "BucketAlreadyOwnedByYou" || true
echo "    Done"

echo "==> Verifying resources..."
aws --endpoint-url="$ENDPOINT" dynamodb describe-table --table-name "$TABLE" --query "Table.TableStatus" --output text
aws --endpoint-url="$ENDPOINT" s3api head-bucket --bucket "$BUCKET" && echo "S3 bucket OK"

echo ""
echo "==> LocalStack setup complete"
echo "    DynamoDB table: $TABLE"
echo "    S3 bucket:      $BUCKET"
echo "    Endpoint:       $ENDPOINT"
