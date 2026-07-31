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
    allow_origins = concat(
      [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://${aws_cloudfront_distribution.website.domain_name}"
      ],
      [for domain in local.effective_cloudfront_aliases : "https://${domain}"]
    )
    expose_headers = ["content-type", "x-amzn-requestid"]
    max_age        = 300
  }
}

resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/api-gateway/running-race-tracker"
  retention_in_days = 7
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode({
      requestId          = "$context.requestId"
      httpMethod         = "$context.httpMethod"
      resourcePath       = "$context.resourcePath"
      status             = "$context.status"
      protocol           = "$context.protocol"
      requestTime        = "$context.requestTime"
      responseLength     = "$context.responseLength"
      integrationLatency = "$context.integration.latency"
      error              = "$context.error.message"
    })
  }
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
