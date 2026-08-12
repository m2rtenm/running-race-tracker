locals {
  # All allowed OAuth redirect/logout URLs.
  # The CloudFront default domain + custom aliases always work;
  # auth_extra_callback_urls adds local dev URLs.
  app_base_urls = distinct(concat(
    ["https://${aws_cloudfront_distribution.website.domain_name}/"],
    [for alias in var.cloudfront_aliases : "https://${alias}/"],
  ))
  auth_redirect_urls = distinct(concat(local.app_base_urls, var.auth_extra_callback_urls))
}

# ---------------------------------------------------------------------------
# Secrets from SSM Parameter Store — create these before `terraform apply`:
#   aws ssm put-parameter --region eu-north-1 --type SecureString \
#     --name /running-race-tracker/google_client_id     --value "xxxx.apps.googleusercontent.com"
#   aws ssm put-parameter --region eu-north-1 --type SecureString \
#     --name /running-race-tracker/google_client_secret --value "GOCSPX-xxxx"
#   aws ssm put-parameter --region eu-north-1 --type SecureString \
#     --name /running-race-tracker/allowed_emails       --value "your@email.com"
# Multiple emails: comma-separated, e.g. "a@gmail.com,b@gmail.com"
# ---------------------------------------------------------------------------
data "aws_ssm_parameter" "google_client_id" {
  name = "/running-race-tracker/google_client_id"
}

data "aws_ssm_parameter" "google_client_secret" {
  name = "/running-race-tracker/google_client_secret"
}

data "aws_ssm_parameter" "allowed_emails" {
  name = "/running-race-tracker/allowed_emails"
}

# ---------------------------------------------------------------------------
# Pre-Sign-Up Lambda: enforces email allowlist for Google sign-ups
# ---------------------------------------------------------------------------
data "archive_file" "pre_signup_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/pre_signup"
  output_path = "${path.module}/lambda/pre_signup.zip"
}

resource "aws_iam_role" "pre_signup_lambda_role" {
  name = "running-race-tracker-pre-signup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "pre_signup_lambda_policy" {
  name = "running-race-tracker-pre-signup-policy"
  role = aws_iam_role.pre_signup_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "arn:aws:logs:*:*:*"
    }]
  })
}

resource "aws_lambda_function" "pre_signup" {
  function_name = "running-race-tracker-pre-signup"
  role          = aws_iam_role.pre_signup_lambda_role.arn
  runtime       = "python3.12"
  handler       = "lambda_function.handler"
  timeout       = 10

  filename         = data.archive_file.pre_signup_zip.output_path
  source_code_hash = data.archive_file.pre_signup_zip.output_base64sha256

  environment {
    variables = {
      ALLOWED_EMAILS = data.aws_ssm_parameter.allowed_emails.value
    }
  }
}

resource "aws_lambda_permission" "cognito_pre_signup" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pre_signup.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

# ---------------------------------------------------------------------------
# Cognito User Pool
# ---------------------------------------------------------------------------
resource "aws_cognito_user_pool" "main" {
  name           = "running-race-tracker"
  user_pool_tier = "LITE"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  lambda_config {
    pre_sign_up = aws_lambda_function.pre_signup.arn
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id
}

# ---------------------------------------------------------------------------
# Google identity provider
# ---------------------------------------------------------------------------
resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = data.aws_ssm_parameter.google_client_id.value
    client_secret    = data.aws_ssm_parameter.google_client_secret.value
    authorize_scopes = "openid email profile"
    # Declare standard Google endpoints to prevent perpetual plan diffs
    attributes_url                = "https://people.googleapis.com/v1/people/me?personFields="
    attributes_url_add_attributes = "true"
    authorize_url                 = "https://accounts.google.com/o/oauth2/v2/auth"
    oidc_issuer                   = "https://accounts.google.com"
    token_request_method          = "POST"
    token_url                     = "https://www.googleapis.com/oauth2/v4/token"
  }

  attribute_mapping = {
    email          = "email"
    email_verified = "email_verified"
    name           = "name"
    picture        = "picture"
    username       = "sub"
  }
}

# ---------------------------------------------------------------------------
# App client (public SPA — no secret, Authorization Code + PKCE)
# ---------------------------------------------------------------------------
resource "aws_cognito_user_pool_client" "main" {
  name         = "running-race-tracker-web"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email", "profile"]

  supported_identity_providers = ["Google"]

  callback_urls = local.auth_redirect_urls
  logout_urls   = local.auth_redirect_urls

  prevent_user_existence_errors = "ENABLED"

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  explicit_auth_flows = ["ALLOW_REFRESH_TOKEN_AUTH"]

  depends_on = [aws_cognito_identity_provider.google]
}
