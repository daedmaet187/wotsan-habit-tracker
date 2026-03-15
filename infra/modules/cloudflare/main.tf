variable "alb_dns" {}

resource "cloudflare_record" "api" {
  zone_id = "5b4e910343402099233564343a994556" # User provided zone ID
  name    = "habit-api"
  value   = var.alb_dns
  type    = "CNAME"
  proxied = false
  ttl     = 1
}
