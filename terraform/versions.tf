terraform {
  required_version = ">= 1.6.0"

  # Replace these placeholders with your Terraform Cloud settings.
  cloud {
    organization = "StudyFlow"
    workspaces {
      name = "studyflow-space"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
