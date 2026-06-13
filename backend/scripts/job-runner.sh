#!/bin/bash
# Job Runner Script - Simulates EC2 job execution
set -e

echo "Starting job: $JOB_ID"
echo "Compute type: $COMPUTE_TYPE"
echo "Input file key: $INPUT_FILE_KEY"

if [ -z "$JOB_ID" ] || [ -z "$COMPUTE_TYPE" ] || [ -z "$API_URL" ] || [ -z "$S3_BUCKET" ]; then
  echo "ERROR: Required environment variables missing (JOB_ID, COMPUTE_TYPE, API_URL, S3_BUCKET)"
  exit 1
fi

case "$COMPUTE_TYPE" in
  "cpu-small") SLEEP_TIME=5 ;;
  "cpu-large") SLEEP_TIME=10 ;;
  "gpu") SLEEP_TIME=15 ;;
  *) SLEEP_TIME=5 ;;
esac

START_TIME=$(date +%s)
echo "Simulating work for ${SLEEP_TIME}s..."
sleep $SLEEP_TIME
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

OUTPUT_FILE="/tmp/output-${JOB_ID}.txt"
cat > "$OUTPUT_FILE" << EOF
Job ID: $JOB_ID
Compute Type: $COMPUTE_TYPE
Input File: $INPUT_FILE_KEY
Execution Duration: ${DURATION}s
Output Generated At: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Status: SUCCESS
EOF

OUTPUT_FILE_NAME="output-${JOB_ID}.txt"
OUTPUT_KEY="jobs/${JOB_ID}/output/${OUTPUT_FILE_NAME}"

echo "Uploading output to S3: s3://${S3_BUCKET}/${OUTPUT_KEY}"
if [ -n "$AWS_ENDPOINT_URL" ]; then
  aws --endpoint-url="$AWS_ENDPOINT_URL" s3 cp "$OUTPUT_FILE" "s3://${S3_BUCKET}/${OUTPUT_KEY}" \
    || { echo "WARN: S3 upload failed - continuing anyway"; }
else
  aws s3 cp "$OUTPUT_FILE" "s3://${S3_BUCKET}/${OUTPUT_KEY}" \
    || { echo "WARN: S3 upload failed - continuing anyway"; }
fi

echo "Calling complete API: ${API_URL}/api/jobs/${JOB_ID}/complete"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/jobs/${JOB_ID}/complete" \
  -H "Content-Type: application/json" \
  -d "{\"outputFileName\":\"${OUTPUT_FILE_NAME}\",\"executionDuration\":${DURATION}}" 2>&1) || true

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ] 2>/dev/null; then
  echo "Job $JOB_ID completed successfully (HTTP $HTTP_CODE)"
else
  echo "WARN: Complete API returned HTTP $HTTP_CODE: $BODY"
fi

rm -f "$OUTPUT_FILE"
echo "Job $JOB_ID runner finished"
