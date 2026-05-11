# AWS Provider Configuration
provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

# Security Group for the Application
resource "aws_security_group" "app_sg" {
  name        = "brain-tumor-app-sg"
  description = "Allow inbound traffic for web and SSH"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Flask App"
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Generate an SSH Key Pair dynamically for fast access
resource "tls_private_key" "deploy_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "generated_key" {
  key_name   = "brain-tumor-deploy-key-${random_id.id.hex}"
  public_key = tls_private_key.deploy_key.public_key_openssh
}

resource "random_id" "id" {
  byte_length = 4
}

# EC2 Instance (Ubuntu 22.04 LTS)
data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  owners = ["099720109477"] # Canonical
}

resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type # Using t3.medium or larger is recommended for ML
  key_name      = aws_key_pair.generated_key.key_name
  
  vpc_security_group_ids = [aws_security_group.app_sg.id]

  tags = {
    Name = "Brain-Tumor-Detector-Prod"
  }

  # Provisioner to save the private key locally for Ansible
  provisioner "local-exec" {
    command = "echo ${tls_private_key.deploy_key.private_key_pem} > ../deploy_key.pem"
  }
}

# Output the IP for Ansible to use
output "instance_public_ip" {
  value = aws_instance.app_server.public_ip
}

output "private_key" {
  value     = tls_private_key.deploy_key.private_key_pem
  sensitive = true
}
