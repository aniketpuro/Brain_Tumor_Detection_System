#!/bin/bash
# Install AppArmor if not present
sudo apt-get update && sudo apt-get install -y apparmor apparmor-utils

# Create AppArmor profile for NeuroScan
cat << 'EOF' | sudo tee /etc/apparmor.d/k8s-neuroscan
#include <tunables/global>

profile k8s-neuroscan flags=(attach_disconnected) {
  #include <abstractions/base>
  #include <abstractions/python>
  #include <abstractions/nameservice>
  
  # Allow reading everything in /app
  /app/** r,
  
  # Allow writing only to instance directory (for SQLite db) and tmp
  /app/instance/** rw,
  /tmp/** rw,
  
  # Allow executing python and gunicorn
  /usr/local/bin/python ix,
  /usr/local/bin/gunicorn ix,
  
  # Deny accessing sensitive files
  deny /etc/shadow r,
  deny /etc/passwd r,
  deny /root/** rw,
}
EOF

# Load the profile
sudo apparmor_parser -q -r -W /etc/apparmor.d/k8s-neuroscan
echo "AppArmor profile loaded: k8s-neuroscan"
