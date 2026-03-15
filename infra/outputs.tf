output "api_alb_dns" {
  value = module.alb.dns_name
}

output "ecr_repo_url" {
  value = module.ecr.repository_url
}
