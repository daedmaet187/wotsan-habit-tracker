output "api_alb_dns" {
  value = module.alb.dns_name
}

output "ecr_repo_url" {
  value = module.ecr.repository_url
}

output "db_password_secret_arn" {
  value     = aws_secretsmanager_secret.db_password.arn
  sensitive = false # ARN is not sensitive, the value is
}

output "jwt_secret_arn" {
  value     = aws_secretsmanager_secret.jwt_secret.arn
  sensitive = false
}
