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

variable "api_throttling_rate_limit" {
  description = "Maximum sustained API Gateway request rate for this app."
  type        = number
  default     = 1

  validation {
    condition     = var.api_throttling_rate_limit > 0
    error_message = "api_throttling_rate_limit must be greater than zero."
  }
}

variable "api_throttling_burst_limit" {
  description = "Maximum API Gateway request burst for this app."
  type        = number
  default     = 5

  validation {
    condition     = var.api_throttling_burst_limit >= 1
    error_message = "api_throttling_burst_limit must be at least one."
  }
}

variable "dynamodb_max_read_request_units" {
  description = "Per-table maximum DynamoDB on-demand read request units per second."
  type        = number
  default     = 10

  validation {
    condition     = var.dynamodb_max_read_request_units >= 1
    error_message = "dynamodb_max_read_request_units must be at least one."
  }
}

variable "dynamodb_max_write_request_units" {
  description = "Per-table maximum DynamoDB on-demand write request units per second."
  type        = number
  default     = 5

  validation {
    condition     = var.dynamodb_max_write_request_units >= 1
    error_message = "dynamodb_max_write_request_units must be at least one."
  }
}

variable "monthly_cost_budget_usd" {
  description = "Account-wide monthly AWS cost budget in USD. Notifications are sent only when cost_alert_email is configured."
  type        = number
  default     = 1

  validation {
    condition     = var.monthly_cost_budget_usd > 0
    error_message = "monthly_cost_budget_usd must be greater than zero."
  }
}

variable "cost_alert_email" {
  description = "Email address for account-wide AWS Budget alerts. Leave empty to disable budget notifications."
  type        = string
  default     = "marten.mandla@outlook.com"

  validation {
    condition     = var.cost_alert_email == "" || can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.cost_alert_email))
    error_message = "cost_alert_email must be a valid email address or empty."
  }
}
