resource "aws_ssm_parameter" "db_host" {
  name  = "/umroc/db/host"
  type  = "String"
  value = aws_db_instance.default.address
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/umroc/db/password"
  type  = "SecureString"
  value = random_password.db_password.result
}

resource "aws_ssm_parameter" "db_user" {
  name  = "/umroc/db/user"
  type  = "String"
  value = aws_db_instance.default.username
}

resource "aws_ssm_parameter" "paypal_client_id" {
  name  = "/umroc/paypal/client_id"
  type  = "SecureString"
  value = "CHANGE_ME" # Placeholder
}

resource "aws_ssm_parameter" "paypal_secret" {
  name  = "/umroc/paypal/secret"
  type  = "SecureString"
  value = "CHANGE_ME" # Placeholder
}
