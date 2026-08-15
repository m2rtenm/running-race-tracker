variable "aws_region" {
  type    = string
  default = "eu-north-1"
}

variable "aws_profile" {
  type    = string
  default = ""
}

variable "domain_name" {
  type    = string
  default = "running.mandla.tech"
}

variable "certificate_arn" {
  type    = string
  default = ""
}

variable "cloudfront_aliases" {
  type        = list(string)
  description = "Custom domains for CloudFront distribution"
  default     = ["running.mandla.tech"]
}

variable "acm_certificate_domain" {
  type        = string
  description = "Domain pattern to look up ACM certificate in us-east-1 for CloudFront"
  default     = "*.mandla.tech"
}

variable "bucket_name" {
  type    = string
  default = "running-race-tracker-app"
}

variable "strava_redirect_uri" {
  type        = string
  description = "Strava OAuth redirect URI (frontend /strava/callback URL)"
  default     = "https://running.mandla.tech/strava/callback"
}

variable "cognito_domain_prefix" {
  type        = string
  description = "Prefix for the Cognito Hosted UI domain. Results in https://<prefix>.auth.<region>.amazoncognito.com. Must be globally unique."
  default     = "running-race-tracker-auth"
}

variable "auth_extra_callback_urls" {
  description = "Additional OAuth callback/logout URLs (e.g. http://localhost:5173/ for local dev). CloudFront and custom-domain URLs are added automatically."
  type        = list(string)
  default     = ["http://localhost:5173/"]
}
