#!/bin/bash

# Fast automated deployment script for Brain Tumor Detector (WSL/Linux Version)

set -e

echo "=========================================="
echo "🚀 Fast Deploy: Brain Tumor Detector to AWS (WSL)"
echo "=========================================="

# Check for AWS Keys
if [ ! -f "aws_keys.tfvars" ]; then
    echo "❌ ERROR: aws_keys.tfvars not found!"
    exit 1
fi

# 1. Terraform Phase
echo -e "\n[1/3] 🌍 Provisioning AWS Infrastructure..."
cd terraform
terraform init -input=false
terraform apply -var-file="../aws_keys.tfvars" -auto-approve

# Get IP and Private Key
SERVER_IP=$(terraform output -raw instance_public_ip)
terraform output -raw private_key > ../deploy_key.pem
chmod 400 ../deploy_key.pem
cd ..

echo -e "✅ Infrastructure ready! Server IP: $SERVER_IP"

# 2. Setup Ansible Inventory
echo -e "\n[2/3] ⚙️ Configuring Ansible Inventory..."
cat <<EOF > ansible/inventory.ini
[app_servers]
$SERVER_IP ansible_user=ubuntu ansible_ssh_private_key_file=../deploy_key.pem ansible_ssh_common_args='-o StrictHostKeyChecking=no'
EOF

# 3. Ansible Phase
echo -e "\n[3/3] 📦 Deploying Application with Ansible..."
cd ansible
ansible-playbook -i inventory.ini deploy.yml

echo -e "\n=========================================="
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "🌐 Live URL: http://$SERVER_IP:5000"
echo "=========================================="
