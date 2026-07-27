terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

variable "aws_region" {
  type    = string
  default = "eu-north-1"
}

variable "aws_profile" {
  type    = string
  default = "prod"
}

variable "domain_name" {
  type    = string
  default = "races.example.com"
}

variable "certificate_arn" {
  type    = string
  default = ""
}

variable "bucket_name" {
  type    = string
  default = "running-race-tracker-app"
}

# ============================================================================
# COGNITO USER POOL FOR AUTHENTICATION
# ============================================================================

resource "aws_cognito_user_pool" "main" {
  name = "running-race-tracker"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  auto_verified_attributes = ["email"]
  mfa_configuration        = "OFF"

  schema {
    name                     = "email"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    mutable                  = true
  }
}

resource "aws_cognito_user_pool_client" "main" {
  name                = "running-race-tracker-web"
  user_pool_id        = aws_cognito_user_pool.main.id
  generate_secret     = false
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  allowed_oauth_flows = ["code"]
  allowed_oauth_scopes = ["openid", "email", "profile"]
  callback_urls = [
    "http://localhost:3000/callback",
    "https://${aws_cloudfront_distribution.website.domain_name}/callback"
  ]
  logout_urls = [
    "http://localhost:3000/logout",
    "https://${aws_cloudfront_distribution.website.domain_name}/logout"
  ]
  allowed_oauth_flows_user_pool_client = true
}

# ============================================================================
# DYNAMODB TABLES
# ============================================================================

resource "aws_dynamodb_table" "races" {
  name           = "running-race-tracker-races"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"
  range_key      = "raceId"
  stream_specification {
    stream_view_type = "NEW_AND_OLD_IMAGES"
    stream_enabled   = true
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "raceId"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  attribute {
    name = "competitionName"
    type = "S"
  }

  global_secondary_index {
    name            = "userIdDateIndex"
    hash_key        = "userId"
    range_key       = "date"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "userIdCompetitionIndex"
    hash_key        = "userId"
    range_key       = "competitionName"
    projection_type = "ALL"
  }

  tags = {
    Environment = "production"
    Application = "running-race-tracker"
  }
}

resource "aws_dynamodb_table" "strava_imports" {
  name         = "running-race-tracker-strava-imports"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "importId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "importId"
    type = "S"
  }

  ttl {
    attribute_name = "expiryDate"
    enabled        = true
  }

  tags = {
    Environment = "production"
    Application = "running-race-tracker"
  }
}


# ============================================================================
# IAM ROLE AND POLICIES FOR LAMBDA
# ============================================================================

resource "aws_iam_role" "lambda_exec" {
  name = "running-race-tracker-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "dynamodb_races" {
  name = "running-race-tracker-dynamodb-races"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.races.arn,
          "${aws_dynamodb_table.races.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = aws_dynamodb_table.strava_imports.arn
      }
    ]
  })
}

# ============================================================================
# LAMBDA FUNCTION
# ============================================================================

resource "aws_lambda_function" "api" {
  function_name = "running-race-tracker-api"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "src/handler.handler"
  runtime       = "nodejs22.x"
  filename      = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  timeout       = 30
  memory_size   = 512

  environment {
    variables = {
      RACES_TABLE_NAME         = aws_dynamodb_table.races.name
      STRAVA_IMPORTS_TABLE_NAME = aws_dynamodb_table.strava_imports.name
      AWS_REGION              = var.aws_region
      COGNITO_REGION          = var.aws_region
      COGNITO_USER_POOL_ID    = aws_cognito_user_pool.main.id
      COGNITO_CLIENT_ID       = aws_cognito_user_pool_client.main.id
    }
  }
}

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "../api"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*/*/*"
}

data "aws_caller_identity" "current" {}

# ============================================================================
# API GATEWAY V2 (HTTP)
# ============================================================================

resource "aws_apigatewayv2_api" "http" {
  name          = "running-race-tracker-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_credentials = true
    allow_headers = [
      "content-type",
      "authorization",
      "x-amz-date",
      "x-amz-security-token"
    ]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_origins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://${aws_cloudfront_distribution.website.domain_name}"
    ]
    expose_headers = ["content-type", "x-amzn-requestid"]
    max_age        = 300
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      requestTime    = "$context.requestTime"
      responseLength = "$context.responseLength"
      integrationLatency = "$context.integration.latency"
      error          = "$context.error.message"
    })
  }
}

resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/api-gateway/running-race-tracker"
  retention_in_days = 7
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# ============================================================================
# S3 WEBSITE BUCKET
# ============================================================================

resource "aws_s3_bucket" "website" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_ownership_controls" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = ["s3:GetObject"]
      Resource  = ["${aws_s3_bucket.website.arn}/*"]
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.website]
}

# ============================================================================
# CLOUDFRONT DISTRIBUTION
# ============================================================================

resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  origin {
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = "s3-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-origin"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn != "" ? var.certificate_arn : null
    ssl_support_method       = var.certificate_arn != "" ? "sni-only" : null
    cloudfront_default_certificate = var.certificate_arn == ""
  }

  aliases = var.certificate_arn != "" ? [var.domain_name] : []

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_alias" {
  value = var.certificate_arn != "" ? var.domain_name : null
}

output "api_gateway_url" {
  value = aws_apigatewayv2_api.http.api_endpoint
}

output "bucket_name" {
  value = aws_s3_bucket.website.bucket
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  value = aws_cognito_user_pool_client.main.id
}

output "cognito_domain" {
  value = aws_cognito_user_pool.main.name
}

output "races_table_name" {
  value = aws_dynamodb_table.races.name
}
