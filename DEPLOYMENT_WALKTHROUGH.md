# Deployment Walkthrough: UMRoCMemberApp Serverless

This guide details how to deploy the backend and infrastructure for the UMRoCMemberApp.

## Prerequisites
Ensure the following tools are installed and in your system PATH:
*   **Node.js** (v18+)
*   **Terraform** (v1.0+)
*   **AWS CLI** (Configured with profile `BushyProjects`)

## 1. Build the Backend
The backend logic (Lambda functions) is written in TypeScript and needs to be compiled.

```powershell
cd backend
npm install
npm run build
```

This will create a `dist/` directory containing the JavaScript code waiting to be zipped.

## 2. Provision Infrastructure (Terraform)
We use Terraform to set up the RDS Database, Lambda Functions, HTTP API, and EventBridge Scheduler.

```powershell
cd infrastructure
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Review the plan (it will show ~15 resources to be added) and confirm.

## 3. Database Initialization
Once Terraform completes, it will output the `db_host`. You need to apply the schema.
The RDS instance is configured to be `publicly_accessible` for ease of setup.

**Using psql:**
Retrieve the password from AWS SSM Parameter Store (`/umroc/db/password`) or the Terraform state.

```bash
export PGPASSWORD=$(aws ssm get-parameter --name /umroc/db/password --with-decryption --query Parameter.Value --output text --profile BushyProjects)
export DB_HOST=$(terraform output -raw db_host)

psql -h $DB_HOST -U umroc_admin -d postgres -f ../backend/schema.sql
```

## 4. Frontend Deployment
The Amplify App has been created in "Manual Deployment" mode. 

1.  Zip your frontend files (`index.html`, `js/`, `css/`, `img/`).
2.  Go to the [AWS Console > Amplify](https://ap-southeast-2.console.aws.amazon.com/amplify/home?region=ap-southeast-2).
3.  Open `umroc-member-app`.
4.  Drag and drop your zip file to deploy.

## 5. Verification
*   **API**: Test the endpoint `$(terraform output -raw api_url)/events`.
*   **Reminders**: 
    *   Go to AWS Console > Lambda.
    *   Find `umroc-reminder`.
    *   Create a Test Event and run it. Check CloudWatch logs for the "Running Daily Reminder Job" message.

## Troubleshooting
*   **"npm not found"**: Install Node.js from https://nodejs.org/.
*   **"terraform not found"**: Install Terraform from https://developer.hashicorp.com/terraform/downloads.
