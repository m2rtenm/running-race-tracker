#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

npm run build

bucket_name="${1:-}"
distribution_id="${2:-}"

if [[ -z "$bucket_name" ]]; then
  bucket_name="$(terraform -chdir=infra output -raw bucket_name)"
fi

if [[ -z "$distribution_id" ]]; then
  distribution_id="$(terraform -chdir=infra output -raw cloudfront_distribution_id)"
fi

# Long cache for immutable hashed assets
aws s3 sync dist/ "s3://${bucket_name}" \
  --delete \
  --exclude "index.html" \
  --cache-control "public,max-age=31536000,immutable"

# No-cache for HTML shell
aws s3 cp dist/index.html "s3://${bucket_name}/index.html" \
  --cache-control "no-cache,no-store,must-revalidate" \
  --content-type "text/html"

aws cloudfront create-invalidation \
  --distribution-id "$distribution_id" \
  --paths "/*" >/dev/null

echo "Deployment complete."
echo "Frontend uploaded to S3 bucket: ${bucket_name}"
echo "CloudFront invalidation submitted for distribution: ${distribution_id}"
