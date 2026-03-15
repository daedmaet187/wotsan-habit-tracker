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

# Look up default VPC and subnets dynamically
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

module "ecr" {
  source  = "./modules/ecr"
  project = var.project
}

module "rds" {
  source                = "./modules/rds"
  project               = var.project
  db_password           = var.db_password
  vpc_id                = data.aws_vpc.default.id
  subnet_ids            = data.aws_subnets.default.ids
  ecs_security_group_id = module.ecs.security_group_id
}

module "alb" {
  source     = "./modules/alb"
  project    = var.project
  vpc_id     = data.aws_vpc.default.id
  subnet_ids = data.aws_subnets.default.ids
}

module "ecs" {
  source                = "./modules/ecs"
  project               = var.project
  image_url             = "${module.ecr.repository_url}:latest"
  db_url                = module.rds.connection_string
  jwt_secret            = var.jwt_secret
  target_group_arn      = module.alb.target_group_arn
  vpc_id                = data.aws_vpc.default.id
  subnet_ids            = data.aws_subnets.default.ids
  alb_security_group_id = module.alb.security_group_id
}

module "cloudflare" {
  source             = "./modules/cloudflare"
  alb_dns            = module.alb.dns_name
  cloudflare_zone_id = var.cloudflare_zone_id
}
