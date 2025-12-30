data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security Group for Lambda to access RDS
resource "aws_security_group" "lambda_sg" {
  name        = "umroc-lambda-sg"
  description = "Allow outbound access"
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Security Group for RDS
resource "aws_security_group" "rds_sg" {
  name        = "umroc-rds-sg"
  description = "Allow inbound from Lambda"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda_sg.id]
  }
  
  # Allow access from local machine (BushyProjects) if needed for debugging
  # In a real secure env, we'd use a bastion or strict CIDR key
}
