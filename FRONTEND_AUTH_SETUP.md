# Phase 3: Frontend Cognito Integration - Complete Guide

## What's Been Implemented

### ✅ Authentication System
- **Auth Service** (`src/services/auth.js`)
  - Cognito USER_PASSWORD_AUTH flow
  - Token management (save, retrieve, refresh, clear)
  - JWT parsing and expiry checking
  - Auto-refresh on token expiration
  - SignUp, SignIn, SignOut functions

### ✅ Auth Context & Hooks
- **AuthContext** (`src/context/AuthContext.jsx`)
  - Global auth state management
  - User information storage
  - Loading and error handling
  - `useAuth()` hook for easy access

### ✅ Pages
- **LoginPage** (`src/pages/LoginPage.jsx`)
  - Beautiful gradient authentication UI
  - Toggle between Sign In and Create Account
  - Form validation
  - Error display
  - Password requirements display

- **Dashboard** (`src/pages/Dashboard.jsx`)
  - User profile in header (username + logout)
  - Same race tracking functionality
  - Protected by auth context

### ✅ API Client Updates
- **Updated api.js**
  - JWT token injection on every request
  - Auto-refresh on 401 responses
  - New stats endpoints (summary, by-distance, by-year, etc.)

### ✅ Styling
- **auth.css**
  - Login page gradient background
  - Responsive design (mobile-first)
  - Form styling with focus states
  - Success/error message styling
  - User menu styling

## Configuration

### 1. Environment Variables

Copy the template:
```bash
cp .env.frontend.example .env.local
```

Update with your Cognito values from Terraform outputs:
```env
VITE_API_BASE_URL=https://your-api-gateway-url
VITE_AWS_REGION=eu-north-1
VITE_COGNITO_USER_POOL_ID=eu-north-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m
```

### 2. Get Cognito Values

From your Terraform deployment:
```bash
cd infra
terraform output cognito_user_pool_id
terraform output cognito_user_pool_client_id
terraform output api_gateway_url
```

## Running Locally

### 1. Terminal 1: Backend (Lambda Emulation)
```bash
# For testing, you'll use the actual Lambda API
# Just set VITE_API_BASE_URL to your deployed API Gateway URL
```

### 2. Terminal 2: Frontend Development
```bash
npm run dev
# Opens http://localhost:3000 or http://localhost:5173
```

### 3. Test Authentication

**Create a test user:**
```bash
# Using AWS CLI (after deploying backend)
aws cognito-idp admin-create-user \
  --user-pool-id <POOL_ID> \
  --username testuser \
  --password TempPassword123! \
  --message-action SUPPRESS \
  --region eu-north-1

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id <POOL_ID> \
  --username testuser \
  --password Password123! \
  --permanent \
  --region eu-north-1
```

**Login in app:**
- Username: `testuser`
- Password: `Password123!`

## Architecture

```
User
  ↓
LoginPage (signup/signin form)
  ↓ (signIn or register via auth.js)
AuthContext (state management)
  ↓ (stores user + tokens in localStorage)
Dashboard (protected page)
  ↓
API Client (adds JWT to requests)
  ↓ (with Bearer token header)
AWS API Gateway
  ↓
Lambda (verifies JWT)
  ↓
DynamoDB (queries scoped to userId)
```

## Key Features

### 1. Automatic Token Refresh
- Tokens are checked before every API request
- Expired tokens are automatically refreshed
- If refresh fails, user is logged out

### 2. User Isolation
- All race data is scoped to userId from Cognito token
- Users can only see their own races
- Backend enforces this isolation

### 3. Session Persistence
- Tokens stored in localStorage
- User info preserved across page reloads
- Automatic re-authentication on app start

### 4. Error Handling
- Network errors caught and displayed
- Invalid credentials show clear messages
- Expired sessions redirect to login

## File Structure

```
src/
├── services/
│   └── auth.js                 # Cognito API calls
├── context/
│   └── AuthContext.jsx         # Auth state management
├── pages/
│   ├── LoginPage.jsx           # Auth UI
│   └── Dashboard.jsx           # Main app (protected)
├── styles/
│   └── auth.css                # Auth page styles
├── App.jsx                     # Routes & auth guard
└── api.js                      # API client (updated)
```

## Security Considerations

✅ Tokens stored in localStorage (with considerations)
✅ HTTPS enforced in production
✅ Cognito handles password security
✅ JWT validation on backend
✅ User isolation in database queries
✅ No sensitive data in localStorage
✅ Tokens cleared on logout

**Note**: For maximum security in production, consider:
- Using httpOnly cookies instead of localStorage
- Implementing token rotation
- Adding CSRF protection
- Rate limiting on auth endpoints

## Troubleshooting

### "Invalid Cognito config"
Check that environment variables are set:
```bash
echo $VITE_COGNITO_USER_POOL_ID
echo $VITE_COGNITO_CLIENT_ID
```

### "Sign in failed"
1. Verify user exists: `aws cognito-idp list-users --user-pool-id <POOL_ID>`
2. Check credentials match
3. Verify Cognito is in the correct region

### "API returns 401"
1. Check token is being sent: Open DevTools → Network → check Authorization header
2. Verify backend Lambda has JWT verification enabled
3. Check token expiry: Token may have timed out

### "Dashboard doesn't load"
1. Check API Gateway URL is correct
2. Verify backend Lambda is deployed
3. Check CloudWatch logs: `aws logs tail /aws/lambda/running-race-tracker-api`

## Deployment

### Production Checklist
- [ ] Update VITE_API_BASE_URL to production API Gateway URL
- [ ] Update VITE_COGNITO_REDIRECT_URI to production domain
- [ ] Set NODE_ENV=production
- [ ] Run `npm run build`
- [ ] Deploy dist/ folder to S3
- [ ] Invalidate CloudFront cache

### Build for Production
```bash
npm run build
# Creates dist/ folder with optimized bundle

# Test production build locally
npm run preview
```

## Next Steps

This phase provides:
✅ User authentication (sign up, sign in, sign out)
✅ Token management (auto-refresh)
✅ Protected dashboard
✅ User profile display
✅ Beautiful login UI

Ready for **Phase 4: Enhanced Statistics & Visualizations**
- Add more chart types
- Implement pace analysis
- Build consistency metrics
- Add yearly summaries
