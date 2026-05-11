<#
.SYNOPSIS
Fast automated deployment script for Brain Tumor Detector using Terraform and Ansible.

.DESCRIPTION
This script will provision AWS infrastructure using Terraform, extract the IP, 
and deploy the application using Ansible in one click.
#>

$ErrorActionPreference = "Stop"

# Add Ansible to PATH
$AnsiblePath = "C:\Users\aniket\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\LocalCache\local-packages\Python311\Scripts"
if ($env:PATH -notlike "*$AnsiblePath*") {
    $env:PATH = "$AnsiblePath;$env:PATH"
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Fast Deploy: Brain Tumor Detector to AWS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check for AWS Keys file
if (!(Test-Path "aws_keys.tfvars")) {
    Write-Host "ERROR: aws_keys.tfvars not found!" -ForegroundColor Red
    Write-Host "Please update aws_keys.tfvars with your AWS credentials before running." -ForegroundColor Yellow
    exit 1
}

# Ensure env vars for Email are set for Ansible to pass to Docker
if (-not $env:SMTP_EMAIL -or -not $env:SMTP_PASSWORD) {
    Write-Host "WARNING: SMTP_EMAIL or SMTP_PASSWORD environment variables are not set." -ForegroundColor Yellow
    Write-Host "The Email Alert feature will not work until these are set." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

# 1. Terraform Phase
Write-Host "[1/3] Provisioning AWS Infrastructure with Terraform..." -ForegroundColor Magenta
cd terraform
terraform init -input=false
terraform apply -var-file="../aws_keys.tfvars" -auto-approve

if ($LASTEXITCODE -ne 0) {
    Write-Host "Terraform deployment failed." -ForegroundColor Red
    exit 1
}

# Get the newly created IP
$SERVER_IP = terraform output -raw instance_public_ip
cd ..

Write-Host "Infrastructure ready! Server IP: $SERVER_IP" -ForegroundColor Green

# 2. Setup Ansible Inventory
Write-Host "[2/3] Configuring Ansible Inventory..." -ForegroundColor Magenta
$InventoryContent = @"
[app_servers]
$SERVER_IP ansible_user=ubuntu ansible_ssh_private_key_file=../deploy_key.pem ansible_ssh_common_args='-o StrictHostKeyChecking=no'
"@
Set-Content -Path "ansible/inventory.ini" -Value $InventoryContent

# 3. Ansible Phase
Write-Host "[3/3] Deploying Application and Starting Docker..." -ForegroundColor Magenta
cd ansible
ansible-playbook -i inventory.ini deploy.yml

if ($LASTEXITCODE -ne 0) {
    Write-Host "Ansible deployment failed." -ForegroundColor Red
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "Live URL: http://$SERVER_IP:5000" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
