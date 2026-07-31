locals {
  effective_cloudfront_aliases = length(var.cloudfront_aliases) > 0 ? var.cloudfront_aliases : (var.domain_name != "" ? [var.domain_name] : [])
}

data "aws_acm_certificate" "cloudfront" {
  count    = length(local.effective_cloudfront_aliases) > 0 && var.certificate_arn == "" ? 1 : 0
  provider = aws.us_east_1
  domain   = var.acm_certificate_domain
  statuses = ["ISSUED"]

  most_recent = true
}

locals {
  cloudfront_certificate_arn = var.certificate_arn != "" ? var.certificate_arn : (length(data.aws_acm_certificate.cloudfront) > 0 ? data.aws_acm_certificate.cloudfront[0].arn : null)
}
