# El bucket S3 ya existe, solo referenciarlo
data "aws_s3_bucket" "terraform_state" {
  bucket = "saas-rh-terraform-state"
}

# Habilitar versionado en el bucket existente
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = data.aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Habilitar encriptación en el bucket existente
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = data.aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# La tabla DynamoDB ya existe, solo referenciarla
data "aws_dynamodb_table" "terraform_lock" {
  name = "terraform-lock"
}
