variable "aws_region" {
  default = "eu-central-1"
}

variable "project" {
  default = "wotsan-habit-tracker"
}

variable "db_password" {
  sensitive = true
}

variable "cf_dns_token" {
  sensitive = true
}

variable "cloudflare_zone_id" {}

variable "jwt_secret" {
  sensitive = true
}
