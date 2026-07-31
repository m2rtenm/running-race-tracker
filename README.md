# Running Race Tracker

A private running analytics app inspired by Sportos, with AWS-backed storage, Cognito authentication, advanced statistics, and Strava import.

## Features

- Cognito sign-up/sign-in and protected dashboard
- Race CRUD persisted in DynamoDB (user-scoped)
- Advanced analytics (PRs, pace trends, yearly summaries, consistency, competition breakdowns)
- Strava OAuth connection + run sync with duplicate protection
- Serverless API (API Gateway + Lambda)
- Frontend hosting on S3 + CloudFront

## Project structure

- `src/` - React frontend (Vite)
- `api/` - Lambda API routes and services
- `infra/` - Terraform infrastructure
- `scripts/deploy.sh` - Production frontend deployment helper

## Local development

1. Install frontend dependencies:

```bash
npm install
```

2. Install backend dependencies:

```bash
cd api && npm install && cd ..
```

3. Configure frontend env:

```bash
cp .env.frontend.example .env.local
```

4. Run app:

```bash
npm run dev
```

## Infrastructure deployment (Terraform)

1. Configure AWS credentials/profile.
2. Deploy infrastructure:

```bash
cd infra
terraform init
terraform apply
```

Key outputs:

- `api_gateway_url`
- `cognito_user_pool_id`
- `cognito_user_pool_client_id`
- `bucket_name`
- `cloudfront_domain_name`
- `cloudfront_distribution_id`

## Frontend production deployment

After `terraform apply`, deploy the frontend bundle:

```bash
bash scripts/deploy.sh
```

Optional overrides:

```bash
bash scripts/deploy.sh <bucket_name> <cloudfront_distribution_id>
```

The deploy script:

- builds with Vite
- uploads hashed assets with long cache headers
- uploads `index.html` with no-cache headers
- invalidates CloudFront (`/*`)

## Strava configuration

Set Terraform variables for Strava:

- `strava_client_id`
- `strava_client_secret`
- `strava_redirect_uri` (for example `https://your-domain/strava/callback`)

Then run `terraform apply` again to update Lambda environment variables.

## Notes

- This app is designed for private/personal use.
- CloudFront is configured for SPA routing, so deep links (including `/strava/callback`) resolve to `index.html`.
