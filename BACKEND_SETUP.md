# Backend Infrastructure Setup Guide

## Phase 1: Backend Infrastructure

This phase sets up the complete cloud infrastructure using Terraform with:
- **AWS Lambda** - Serverless API
- **API Gateway** - HTTP API endpoints
- **DynamoDB** - NoSQL database with user-specific tables
- **Cognito** - User authentication and JWT tokens

Terraform code is split by concern in `infra/`:
- `versions.tf`, `providers.tf`, `variables.tf`
- `acm.tf`, `cognito.tf`, `dynamodb.tf`, `iam.tf`, `lambda.tf`, `apigateway.tf`
- `storage.tf`, `cloudfront.tf`, `outputs.tf`

Default domain setup:
- CloudFront alias: `running.mandla.tech`
- ACM lookup (in `us-east-1` provider alias): `*.mandla.tech`

### Prerequisites

1. **AWS Account** with credentials configured
2. **Terraform** >= 1.5.0
3. **AWS CLI** configured with your profile
4. **Node.js** 22.x for Lambda runtime

### Architecture Overview

```
Frontend (React)
    ↓ (HTTP + JWT Token)
API Gateway (HTTP API)
    ↓
Lambda Handler (Node.js)
    ├→ Auth Middleware (JWT Verification)
    ├→ Routes (Races, Stats, Strava)
    └→ DynamoDB (User-scoped data)
       ├ races (userId, raceId)
       └ strava_imports (userId, importId)
```

### Database Schema

#### `running-race-tracker-races` Table
```
Primary Key:
  - PK: userId (S)
  - SK: raceId (S)

GSI: userIdDateIndex
  - PK: userId (S)
  - SK: date (S)

GSI: userIdCompetitionIndex
  - PK: userId (S)
  - SK: competitionName (S)

Attributes:
  - competitionName (S): Race competition name
  - date (S): ISO date string (YYYY-MM-DD)
  - officialDistance (N): Race distance in km
  - officialResult (S): Race time (HH:MM:SS)
  - officialResultSeconds (N): Race time in seconds
  - actualDistance (N): Actual run distance
  - createdAt (S): ISO timestamp
  - updatedAt (S): ISO timestamp
```

#### `running-race-tracker-strava-imports` Table
```
Primary Key:
  - PK: userId (S)
  - SK: importId (S)

TTL: expiryDate (7 days)

Attributes:
  - stravaToken (S): Strava OAuth token
  - status (S): pending | completed | failed
  - createdAt (S): ISO timestamp
```

### Deployment Steps

#### 1. Install Dependencies

```bash
# Backend dependencies
cd api
npm install
cd ..

# Terraform
brew install terraform  # macOS
# or download from https://www.terraform.io/downloads.html
```

#### 2. Configure Environment

```bash
# Copy and update backend environment variables
cp .env.backend.example .env.backend
nano .env.backend

# Source environment
source .env.backend
```

### Step A: Store secrets in SSM Parameter Store (required before `terraform apply`)

Secrets are stored in AWS SSM (not Terraform variables) so they never appear in state files or shell history.

#### 1. Store your allowed email address

```bash
aws ssm put-parameter --region eu-north-1 --type SecureString \
  --name /running-race-tracker/allowed_emails \
  --value "your@gmail.com"
# Multiple emails: comma-separated e.g. "a@gmail.com,b@gmail.com"
```

#### 2. Create Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**.
2. Configure the OAuth consent screen (External, just for yourself).
3. Create **OAuth 2.0 Client ID** → type: **Web application**.
4. For now, add a placeholder redirect URI — you'll update this after Terraform creates the Cognito domain.
5. Copy the Client ID and Client Secret, then store them in SSM:

```bash
aws ssm put-parameter --region eu-north-1 --type SecureString \
  --name /running-race-tracker/google_client_id \
  --value "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"

aws ssm put-parameter --region eu-north-1 --type SecureString \
  --name /running-race-tracker/google_client_secret \
  --value "GOCSPX-YOUR_SECRET"
```

#### 3. After `terraform apply`, update the Google OAuth redirect URI

Terraform outputs the exact URI to register:

```bash
terraform output cognito_google_redirect_uri
# → https://running-race-tracker-auth.auth.eu-north-1.amazoncognito.com/oauth2/idpresponse
```

Add that URL as an **Authorized redirect URI** in your Google OAuth client (Google Cloud Console → Credentials → edit your Web client).

#### 3. Initialize Terraform

```bash
cd infra
terraform init
```

#### 4. Review Infrastructure Plan

```bash
terraform plan \
  -var="aws_region=$AWS_REGION" \
  -var="aws_profile=$AWS_PROFILE" \
  -var="bucket_name=$TF_VAR_bucket_name"
```

Optional domain overrides:

```bash
terraform plan \
  -var='cloudfront_aliases=["running.mandla.tech"]' \
  -var='acm_certificate_domain=*.mandla.tech'
```

#### 5. Apply Infrastructure

```bash
terraform apply \
  -var="aws_region=$AWS_REGION" \
  -var="aws_profile=$AWS_PROFILE" \
  -var="bucket_name=$TF_VAR_bucket_name"
```

#### 6. Capture Outputs

After successful deployment, Terraform will output:
- `api_gateway_url` - API endpoint
- `cognito_user_pool_id` - User pool for authentication
- `cognito_user_pool_client_id` - OAuth client ID
- `cognito_hosted_ui_domain` - Cognito Hosted UI base URL
- `cognito_google_redirect_uri` - **Register this in Google Cloud Console**
- `cognito_authority` - OIDC issuer URL for JWT verification
- `cloudfront_domain_name` - Frontend CDN domain

**Save these values** - you'll need them for frontend configuration.

> **After apply:** copy `cognito_google_redirect_uri` from the output and add it as an **Authorized redirect URI** in your Google OAuth client in Google Cloud Console.

### Lambda Function Deployment

The Lambda function code is automatically packaged and deployed via Terraform. Changes to `/api/src/**` files are picked up on next `terraform apply`.

### Testing the Backend

#### 1. Create a Cognito Test User

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <COGNITO_USER_POOL_ID> \
  --username testuser \
  --password TempPassword123! \
  --message-action SUPPRESS \
  --region eu-north-1

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id <COGNITO_USER_POOL_ID> \
  --username testuser \
  --password Password123! \
  --permanent \
  --region eu-north-1
```

#### 2. Authenticate and Get Token

```bash
curl -X POST \
  https://cognito-idp.eu-north-1.amazonaws.com/ \
  -H 'Content-Type: application/x-amz-json-1.1' \
  -H 'X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth' \
  -d '{
    "ClientId": "<COGNITO_CLIENT_ID>",
    "AuthFlow": "USER_PASSWORD_AUTH",
    "AuthParameters": {
      "USERNAME": "testuser",
      "PASSWORD": "Password123!"
    }
  }'

# Extract the AccessToken from response
```

#### 3. Test API Endpoints

```bash
# Health check (no auth needed)
curl https://<API_GATEWAY_URL>/health

# Create a race
curl -X POST https://<API_GATEWAY_URL>/races \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "competitionName": "Test Marathon",
    "date": "2024-07-27",
    "officialDistance": 42.195,
    "officialResult": "03:45:30",
    "officialResultSeconds": 13530,
    "actualDistance": 42.5
  }'

# List races
curl https://<API_GATEWAY_URL>/races \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'

# Get stats
curl https://<API_GATEWAY_URL>/stats/summary \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

### Monitoring and Logs

#### CloudWatch Logs for Lambda

```bash
aws logs tail /aws/lambda/running-race-tracker-api --follow
```

#### API Gateway Request Logs

```bash
aws logs tail /aws/api-gateway/running-race-tracker --follow
```

### Cost Optimization

**Estimated monthly costs:**
- Lambda: ~$0.20 (on-demand, pay per invocation)
- DynamoDB: ~$1.25 (on-demand, pay per request)
- Cognito: ~$0-0.50 (free tier includes 50k users)
- CloudFront: ~$0.50 (minimal usage)
- S3: <$0.50

**Total: ~$2-3/month for light personal use**

### Troubleshooting

**"Access Denied" on Terraform apply:**
- Verify AWS credentials: `aws sts get-caller-identity`
- Check IAM permissions for your user

**Lambda timeout errors:**
- Check DynamoDB table exists: `aws dynamodb describe-table --table-name running-race-tracker-races`
- Review Lambda logs in CloudWatch

**Cognito authentication fails:**
- Verify client ID matches outputs: `terraform output cognito_user_pool_client_id`
- Check user exists: `aws cognito-idp list-users --user-pool-id <POOL_ID>`

### Next Steps

1. ✅ Phase 1 Complete: Backend infrastructure deployed
2. → Phase 2: Implement additional API endpoints and statistics
3. → Phase 3: Integrate Cognito authentication in frontend
4. → Phase 4: Build enhanced statistics and visualizations
5. → Phase 5: Strava integration
6. → Phase 6: Production deployment and optimization
