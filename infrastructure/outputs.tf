output "api_url" {
  value = aws_apigatewayv2_stage.api.invoke_url
}

output "amplify_app_id" {
  value = aws_amplify_app.umroc.id
}

output "amplify_default_domain" {
  value = aws_amplify_app.umroc.default_domain
}

output "db_host" {
  value = aws_db_instance.default.address
}
