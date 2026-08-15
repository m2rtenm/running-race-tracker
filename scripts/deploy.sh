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

# Long cache for immutable versioned assets
aws s3 sync dist/ "s3://${bucket_name}" \
  --delete \
  --exclude "index.html" \
  --exclude "manifest.json" \
  --exclude "manifest.webmanifest" \
  --exclude "sw.js" \
  --cache-control "public,max-age=31536000,immutable"

# No-cache for files that must be refreshed to update the PWA.
for file in index.html manifest.json manifest.webmanifest sw.js; do
  aws s3 cp "dist/${file}" "s3://${bucket_name}/${file}" \
    --cache-control "no-cache,no-store,must-revalidate"
done

aws cloudfront create-invalidation \
  --distribution-id "$distribution_id" \
  --paths "/*" >/dev/null

echo "Deployment complete."
echo "Frontend uploaded to S3 bucket: ${bucket_name}"
echo "CloudFront invalidation submitted for distribution: ${distribution_id}"
