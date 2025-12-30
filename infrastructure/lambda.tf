resource "aws_iam_role" "lambda_role" {
  name = "umroc_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Zip the code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "../backend/dist" # We assume 'dist' exists and contains index.js etc.
  output_path = "${path.module}/backend.zip"
}

# API Lambda
resource "aws_lambda_function" "api" {
  filename      = data.archive_file.lambda_zip.output_path
  function_name = "umroc-api"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout       = 10

  environment {
    variables = {
      DB_HOST     = aws_db_instance.default.address
      DB_USER     = aws_db_instance.default.username
      DB_PASSWORD = random_password.db_password.result
      DB_NAME     = "postgres" # Default DB name
    }
  }
}

# Reminder Lambda
resource "aws_lambda_function" "reminder" {
  filename      = data.archive_file.lambda_zip.output_path
  function_name = "umroc-reminder"
  role          = aws_iam_role.lambda_role.arn
  handler       = "reminder.handler"
  runtime       = "nodejs18.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout       = 30

  environment {
    variables = {
      DB_HOST     = aws_db_instance.default.address
      DB_USER     = aws_db_instance.default.username
      DB_PASSWORD = random_password.db_password.result
      DB_NAME     = "postgres"
    }
  }
}
