#!/bin/bash
set -e

echo "=== UMRoC Deployment Started ==="

# 1. Install & Build Backend
echo "--> Building Backend..."
cd backend
npm install
npm run build
cd ..

# 2. Provision Infrastructure
echo "--> Provisioning Infrastructure (Terraform)..."
cd infrastructure
# Initialize Terraform
terraform init

# Apply Terraform (Auto Approve)
terraform apply -auto-approve

# Capture Outputs for DB Init
DB_HOST=$(terraform output -raw db_host)
DB_USER="umroc_admin"
# Fetch password from SSM (Terraform stores it there)
# We need to read it using AWS CLI because Terraform masks it in outputs if sensitive, 
# or we can output it if we mark it nonsensitive? 
# It's better to fetch from SSM for reliability in this script context.
DB_PASSWORD_PARAM="/umroc/db/password"
DB_PASSWORD=$(aws ssm get-parameter --name "$DB_PASSWORD_PARAM" --with-decryption --query Parameter.Value --output text)

echo "--> Infrastructure Deployed."
echo "    DB Host: $DB_HOST"

# 3. Initialize Database
echo "--> Initializing Database..."
cd ../backend

# Set Env Vars for the script
export DB_HOST=$DB_HOST
export DB_USER=$DB_USER
export DB_PASSWORD=$DB_PASSWORD
export DB_NAME="postgres"

# copy schema to dist or just read it from root
# init-db.ts looks for ../schema.sql relative to dist/init-db.js. 
# so if we run: node dist/init-db.js, __dirname is backend/dist. ../schema.sql is backend/schema.sql. This is correct.

node dist/init-db.js

echo "=== Deployment Complete ==="
echo "You can view your API URL and Frontend details in the Terraform Output above."
cd ../infrastructure
terraform output
