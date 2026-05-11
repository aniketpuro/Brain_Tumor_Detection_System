variable "aws_region" {
  description = "The AWS region to deploy to"
  default     = "us-east-1"
}

variable "aws_access_key" {
  description = "AWS Access Key"
  type        = string
}

variable "aws_secret_key" {
  description = "AWS Secret Key"
  type        = string
}

variable "instance_type" {
  description = "EC2 Instance Type (t3.small minimum recommended for TensorFlow)"
  default     = "t3.small"
}
