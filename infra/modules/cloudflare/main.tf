resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "habit-api"
  value   = var.alb_dns
  type    = "CNAME"
  proxied = false
  ttl     = 1
}
