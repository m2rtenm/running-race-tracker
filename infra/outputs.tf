output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.website.id
}

output "cloudfront_aliases" {
  value = local.effective_cloudfront_aliases
}

output "cloudfront_certificate_arn" {
  value = local.cloudfront_certificate_arn
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

output "cognito_authority" {
  description = "OIDC issuer/authority URL for the Cognito User Pool."
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}

output "cognito_hosted_ui_domain" {
  description = "Cognito Hosted UI base URL (used for login and logout endpoints)."
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "cognito_google_redirect_uri" {
  description = "Authorized redirect URI to register in the Google OAuth client."
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com/oauth2/idpresponse"
}

output "races_table_name" {
  value = aws_dynamodb_table.races.name
}
