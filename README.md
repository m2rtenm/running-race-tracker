# Running Race Tracker

A React + Vite dashboard for recording running competition results and reviewing performance trends over time.

## What it does
- Add race entries with competition name, date, official distance, official result, and actual distance
- Store results in the browser using local storage
- Show a richer dashboard with:
  - summary cards
  - a performance-over-time chart
  - statistics grouped by distance, year, and competition
- Delete individual entries or clear all stored data

## Run locally
Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Then visit http://localhost:3000/.

## AWS deployment setup
The project now includes a simple Terraform-based S3 website scaffold in [infra/website.tf](infra/website.tf) and a deployment helper in [scripts/deploy.sh](scripts/deploy.sh).

### Deploy to S3
1. Install Terraform.
2. Initialize the infrastructure:

```bash
cd infra
terraform init
terraform apply
```

3. Deploy the frontend bundle:

```bash
cd ..
bash scripts/deploy.sh
```

This uses a public S3 website bucket for a simple and inexpensive hosting path.

## Future improvements
If you later want syncing across devices and shared access, the next step would be:
- AWS Lambda + API Gateway for a small API
- DynamoDB for storing race records
- Cognito for authentication

That would move the app from a personal local-first tracker to a multi-user cloud version.