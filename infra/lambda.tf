data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "../api"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "api" {
  function_name    = "running-race-tracker-api"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "src/handler.handler"
  runtime          = "nodejs22.x"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  timeout          = 30
  memory_size      = 512

  environment {
    variables = {
      RACES_TABLE_NAME          = aws_dynamodb_table.races.name
      STRAVA_IMPORTS_TABLE_NAME = aws_dynamodb_table.strava_imports.name
      COGNITO_REGION            = var.aws_region
      ALLOWED_ORIGINS = join(",", concat(
        [
          "https://${aws_cloudfront_distribution.website.domain_name}"
        ],
        [for domain in local.effective_cloudfront_aliases : "https://${domain}"]
      ))
      COGNITO_USER_POOL_ID            = aws_cognito_user_pool.main.id
      COGNITO_CLIENT_ID               = aws_cognito_user_pool_client.main.id
      STRAVA_CLIENT_ID_PARAM_NAME     = "/running-race-tracker/strava_client_id"
      STRAVA_CLIENT_SECRET_PARAM_NAME = "/running-race-tracker/strava_client_secret"
      STRAVA_REDIRECT_URI             = var.strava_redirect_uri
    }
  }
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*/*/*"
}
