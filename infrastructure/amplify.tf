resource "aws_amplify_app" "umroc" {
  name       = "umroc-member-app"
  platform   = "WEB"
  
  environment_variables = {
    ENV = "production"
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.umroc.id
  branch_name = "main"

  framework = "Web"
  stage     = "PRODUCTION"
}
