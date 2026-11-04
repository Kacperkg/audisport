terraform {
  required_version = "= 1.14.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= 6.28.0"
    }
  }

  backend "s3" {
    region       = "eu-west-2"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region              = "eu-west-2"
  allowed_account_ids = [var.aws_account_id]

  default_tags {
    tags = { Project = "Audi", ManagedBy = "Terraform" }
  }
}
