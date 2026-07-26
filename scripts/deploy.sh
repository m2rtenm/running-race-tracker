#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

npm run build

bucket_name="${1:-running-race-tracker-eu-north-1}"
aws s3 sync dist/ "s3://${bucket_name}" --delete

echo "Deployment complete."
echo "Frontend uploaded to S3 bucket: ${bucket_name}"
