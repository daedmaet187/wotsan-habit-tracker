terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket = "wotsan-opentofu-state"
    key    = "habit-tracker/opentofu.tfstate"
    region = "eu-central-1"
  }
}

provider "aws" {
  region = var.aws_region
}

provider "cloudflare" {
  api_token = var.cf_dns_token
}

# Generate a cryptographically strong 32-char DB password
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?" # excludes @/\ which break connection strings
  min_upper        = 4
  min_lower        = 4
  min_numeric      = 4
  min_special      = 2
}

# Generate a 64-char hex JWT secret (256-bit entropy)
resource "random_bytes" "jwt_secret" {
  length = 32 # 32 bytes = 64 hex chars
}

# Store DB password in Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.project}/db-password"
  description             = "RDS PostgreSQL password for ${var.project}"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# Store JWT secret in Secrets Manager
resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project}/jwt-secret"
  description             = "JWT signing secret for ${var.project} API"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_bytes.jwt_secret.hex
}

module "network" {
  source  = "./modules/network"
  project = var.project
}

module "ecr" {
  source  = "./modules/ecr"
  project = var.project
}

data "aws_security_group" "ecs" {
  name   = "${var.project}-ecs-sg"
  vpc_id = module.network.vpc_id
}

module "rds" {
  source                = "./modules/rds"
  project               = var.project
  db_password           = random_password.db_password.result
  vpc_id                = module.network.vpc_id
  subnet_ids            = module.network.private_subnet_ids
  allowed_cidr_blocks   = module.network.private_subnet_cidrs
  ecs_security_group_id = data.aws_security_group.ecs.id
}

module "alb" {
  source     = "./modules/alb"
  project    = var.project
  vpc_id     = module.network.vpc_id
  subnet_ids = module.network.public_subnet_ids
}

module "ecs" {
  source                = "./modules/ecs"
  project               = var.project
  image_url             = "${module.ecr.repository_url}:latest"
  db_url                = "postgresql://habitadmin:${random_password.db_password.result}@${module.rds.db_endpoint}/habittracker"
  jwt_secret_arn        = aws_secretsmanager_secret_version.jwt_secret.arn
  db_password_arn       = aws_secretsmanager_secret_version.db_password.arn
  target_group_arn      = module.alb.target_group_arn
  vpc_id                = module.network.vpc_id
  subnet_ids            = module.network.public_subnet_ids
  alb_security_group_id = module.alb.security_group_id
}

module "cloudflare" {
  source             = "./modules/cloudflare"
  alb_dns            = module.alb.dns_name
  cloudflare_zone_id = var.cloudflare_zone_id
}
