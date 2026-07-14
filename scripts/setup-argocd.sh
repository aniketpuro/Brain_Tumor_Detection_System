#!/bin/bash
set -e

echo "🚀 Installing ArgoCD on K3s..."

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Create namespace
sudo kubectl create namespace argocd || echo "Namespace argocd already exists"

# Install ArgoCD
echo "📦 Downloading and applying ArgoCD manifests..."
sudo kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

echo "⏳ Waiting for ArgoCD Server to be ready..."
sudo kubectl wait --for=condition=Available deployment/argocd-server -n argocd --timeout=300s

# Expose ArgoCD UI (NodePort)
echo "🌐 Exposing ArgoCD UI on NodePort 30002..."
sudo kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort", "ports": [{"port": 443, "nodePort": 30002, "name": "https"}]}}'

# Apply our NeuroScan App to ArgoCD
echo "🔄 Connecting NeuroScan Git repository to ArgoCD..."
sudo kubectl apply -f k8s/argocd-app.yaml

# Fetch the default admin password
ARGOCD_PASS=$(sudo kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

PUBLIC_IP=$(curl -s ifconfig.me || echo "YOUR_VPS_IP")
echo "🎉 ArgoCD is successfully installed!"
echo "---------------------------------------------------"
echo "🖥️  ArgoCD UI: https://$PUBLIC_IP:30002"
echo "👤 Username: admin"
echo "🔑 Password: $ARGOCD_PASS"
echo "---------------------------------------------------"
echo "ArgoCD will now automatically sync your K8s deployment from GitHub!"
