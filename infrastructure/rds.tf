resource "random_password" "db_password" {
  length  = 16
  special = false
}

resource "aws_db_instance" "default" {
  allocated_storage      = 20
  storage_type          = "gp2"
  engine                = "postgres"
  engine_version        = "15.4"
  instance_class        = "db.t3.micro"
  identifier            = "umroc-db"
  username              = "umroc_admin"
  password              = random_password.db_password.result
  parameter_group_name  = "default.postgres15"
  skip_final_snapshot   = true
  publicly_accessible   = true 
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.default.name
}

resource "aws_db_subnet_group" "default" {
  name       = "umroc-main"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "My DB subnet group"
  }
}
