terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "marten-tfstate"
    key     = "running/terraform.tfstate"
    region  = "eu-north-1"
    profile = "sec"
    encrypt = true
  }
}
