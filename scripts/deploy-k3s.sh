#!/bin/bash
set -e

echo "🚀 Starting Production Deployment for NeuroScan on K3s..."

# 1. Install K3s if not present
if ! command -v k3s &> /dev/null; then
    echo "📦 Installing K3s..."
    curl -sfL https://get.k3s.io | sh -
    echo "⏳ Waiting for K3s to be ready..."
    sleep 15
else
    echo "✅ K3s is already installed."
fi

# 2. Setup AppArmor Profile
echo "🛡️ Setting up AppArmor Profile..."
bash scripts/apparmor-setup.sh || echo "⚠️ AppArmor setup skipped or failed (is it supported on this OS?)"

# 3. Create persistent directories
echo "📁 Setting up persistent volumes..."
sudo mkdir -p /opt/neuroscan/instance
sudo chmod 777 /opt/neuroscan/instance

# 4. Apply Kubernetes Manifests
echo "☸️ Applying Kubernetes security and deployment manifests..."
# Make sure kubectl knows where the config is
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Apply RBAC and Network Policies
sudo kubectl apply -f k8s/rbac.yaml
sudo kubectl apply -f k8s/network-policy.yaml

# Apply Deployment and Service
sudo kubectl apply -f k8s/deployment.yaml
sudo kubectl apply -f k8s/service.yaml

echo "⏳ Waiting for pods to start..."
sudo kubectl rollout status deployment/neuroscan-deployment -w --timeout=120s

PUBLIC_IP=$(curl -s ifconfig.me || echo "YOUR_VPS_IP")
echo "🎉 Deployment Complete!"
echo "🌐 NeuroScan is accessible at: http://$PUBLIC_IP:30001"
