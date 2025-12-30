# Deploying via AWS CloudShell

Since you prefer not to install tools locally, follow these steps to deploy using AWS CloudShell, which has all necessary tools pre-installed.

## Step 1: Prepare the Files
1.  Navigate to your project folder: `c:\Users\ellio\source\repos\UMRoCMemberApp`
2.  Create a **ZIP** file of the entire contents of this folder (including `backend`, `infrastructure`, and `cloudshell_deploy.sh`).
    *   Name it `umroc-deploy.zip`.

## Step 2: Upload to CloudShell
1.  Log in to the AWS Console (ap-southeast-2).
2.  Open **CloudShell** (Click the terminal icon in the top navigation bar).
3.  Wait for the terminal to prepare.
4.  Click **Actions** (top right of terminal) -> **Upload file**.
5.  Select your `umroc-deploy.zip` file.

## Step 3: Run the Deployment
Once the upload finishes, run the following commands in the CloudShell terminal:

```bash
# 1. Unzip the package
unzip -o umroc-deploy.zip -d umroc_app

# 2. Make the script executable
cd umroc_app
chmod +x cloudshell_deploy.sh

# 3. Launch Deployment
./cloudshell_deploy.sh
```

## Step 4: Finish Frontend
1. After the script finishes successfully, it will output variables like `amplify_app_id`.
2. Go to the **AWS Amplify Console**.
3. Find the app `umroc-member-app`.
4. Run the **"Manual Deployment"** step:
   *   Zip up your *Frontend Source Code* (only `index.html`, `css/`, `js/`, `img/` from your local machine).
   *   Drag and drop that zip into the Amplify Console deployment area.

## Troubleshooting
*   **Permissions**: If Terraform fails with generic permission errors, ensure your user/role has Admin access or sufficient permissions for RDS, Lambda, IAM, etc.
*   **Timeouts**: CloudShell sessions can time out. The script should run fast enough (< 10 mins).
*   **DB Connection**: If the init script hangs, the Security Group might strictly verify source. Terraform is configured to allow access from the default VPC, where CloudShell usually resides, but sometimes CloudShell is outside the VPC.
    *   *Fallback*: If the script fails to connect to DB, you can still proceed. The DB is created. You can use the AWS Console "Query Editor" (if enabled for Aurora) or a Bastion host later.
