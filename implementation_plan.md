# Implementation Plan - UMRoCMemberApp Serverless Deployment

## Goal
Deploy the UMRoCMemberApp to AWS using a serverless-first architecture (Free Tier optimized), including an RDS Postgres database, Lambda backend, and Amplify frontend hosting.

## Architecture
- **Frontend**: AWS Amplify (Hosting the existing static site).
- **Backend API**: AWS Lambda (Node.js/TypeScript) serving an Express-style API via API Gateway.
- **Scheduled Tasks**: AWS Lambda (Node.js/TypeScript) triggered daily by AWS EventBridge for 14-day event/membership reminders.
- **Database**: AWS RDS PostgreSQL (`db.t3.micro`, 20GB, Free Tier eligible).
- **Configuration**: AWS Systems Manager (SSM) Parameter Store for secrets (DB credentials, PayPal keys).
- **Infrastructure as Code**: Terraform.

## Phase 1: Backend Setup
1.  **Initialize Backend Directory**: Create `backend/` with `package.json`.
2.  **Dependencies**: Install `pg` (Postgres client), `aws-sdk`, `express`, `serverless-http` (for API Gateway compatibility), `typescript`.
3.  **Database Migration Script**: Create `schema.sql` based on the data structure in `app.js` (Users, Events, RSVPs, Products, Orders).
4.  **API Logic**:
    *   Create handlers for Users and Events.
5.  **Reminder Logic**:
    *   Create a dedicated Lambda handler for the daily cron job.
    *   Logic: Query events occurring in 14 days, check membership due dates, log/mock sending notifications.

## Phase 2: Infrastructure (Terraform)
1.  **Directory**: Create `infrastructure/`.
2.  **Network**: Use AWS Default VPC (simplest for Free Tier) or create a lean VPC.
3.  **Database**:
    *   `aws_db_instance`: `db.t3.micro` Postgres.
    *   Pass credentials via SSM.
4.  **Compute (Serverless)**:
    *   `aws_lambda_function`: One for API, one for Reminders.
    *   `aws_apigatewayv2_api`: HTTP API for the backend.
    *   `aws_cloudwatch_event_rule`: Schedule expression `rate(1 day)` for the Reminder Lambda.
5.  **Hosting**:
    *   `aws_amplify_app`: For hosting the frontend.
6.  **Secrets**:
    *   `aws_ssm_parameter`: Securely store strings.

## Phase 3: Deployment & Verification
1.  **Build**: Compile TypeScript backend and package into `.zip`.
2.  **Apply**: Run `terraform init` and `terraform apply`.
3.  **Db Init**: Check connectivity and run `schema.sql` against the new RDS instance (possibly via a one-off Lambda invocation or Bastion).
4.  **Frontend**: Connect the local codebase to the Amplify app (manual zip upload or repo connection instructions).
5.  **Verify**:
    *   Test API endpoints (curl).
    *   Manual trigger of the Reminder Lambda to verify functionality.
    *   Visit Amplify URL.

## Deliverables
1.  Terraform Configuration (`*.tf` files).
2.  Backend Source Code (`backend/`).
3.  Deployed URLs (API & Frontend).
4.  Walkthrough Artifact (Verification of Reminder Trigger).

## Plan Approval
Please review and approve this plan to proceed with creating the files.
