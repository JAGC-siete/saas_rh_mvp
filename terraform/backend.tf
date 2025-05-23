terraform {
  backend "s3" {
    bucket  = "saas-rh-terraform-state"
    key     = "staging/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}
