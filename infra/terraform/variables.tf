variable "aws_account_id" {
  type        = string
  description = "Explicitly approved AWS account that owns the shared host and OIDC provider."
  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "Supply the exact 12-digit AWS account ID."
  }
}

variable "instance_id" {
  type        = string
  description = "Existing SSM-managed EC2 instance; never managed by this root."
  validation {
    condition     = can(regex("^i-[0-9a-f]{17}$", var.instance_id))
    error_message = "Supply the exact long-form EC2 instance ID."
  }
}

variable "github_repository" {
  type        = string
  description = "Exact case-sensitive owner/repository spelling in the GitHub OIDC subject."
  validation {
    condition     = can(regex("^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$", var.github_repository))
    error_message = "Supply a GitHub owner/repository pair."
  }
}

variable "github_immutable_ids" {
  type        = object({ owner = string, repository = string })
  description = "Set both numeric IDs only if GitHub is configured for immutable default subjects."
  default     = null
  validation {
    condition = var.github_immutable_ids == null ? true : (
      can(regex("^[1-9][0-9]*$", var.github_immutable_ids.owner)) &&
      can(regex("^[1-9][0-9]*$", var.github_immutable_ids.repository))
    )
    error_message = "Supply both positive GitHub IDs."
  }
}

variable "resource_prefix" {
  type        = string
  description = "Audi-owned IAM and SSM resource name prefix."
  default     = "audi"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,23}$", var.resource_prefix))
    error_message = "Use 2-24 lowercase letters, digits, and dashes, starting with a letter."
  }
}
