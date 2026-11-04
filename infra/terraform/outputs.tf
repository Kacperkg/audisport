output "deployment_roles" {
  value = { for env, role in aws_iam_role.deploy : env => role.arn }
}

output "deployment_documents" {
  value = { for env, doc in aws_ssm_document.deploy : env => doc.name }
}
