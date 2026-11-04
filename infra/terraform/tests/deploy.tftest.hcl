mock_provider "aws" {
  mock_data "aws_iam_openid_connect_provider" {
    defaults = {
      arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
    }
  }

  mock_resource "aws_ssm_document" {
    defaults = {
      arn = "arn:aws:ssm:eu-west-2:123456789012:document/mock"
    }
  }
}

variables {
  aws_account_id    = "123456789012"
  instance_id       = "i-01234567890123456"
  github_repository = "example/audisport"
}

override_resource {
  override_during = plan
  target          = aws_ssm_document.deploy["staging"]
  values = {
    arn = "arn:aws:ssm:eu-west-2:123456789012:document/audi-deploy-staging"
  }
}

override_resource {
  override_during = plan
  target          = aws_ssm_document.deploy["production"]
  values = {
    arn = "arn:aws:ssm:eu-west-2:123456789012:document/audi-deploy-production"
  }
}

run "least_privilege" {
  command = plan

  assert {
    condition = alltrue([
      for key, env in { staging = ["staging", "staging"], production = ["Production", "main"] } :
      jsondecode(aws_iam_role.deploy[key].assume_role_policy).Statement == [{
        Action    = "sts:AssumeRoleWithWebIdentity"
        Effect    = "Allow"
        Principal = { Federated = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" }
        Condition = { StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:example/audisport:environment:${env[0]}:ref:refs/heads/${env[1]}"
        } }
      }]
    ])
    error_message = "Trust must bind each audience, repository, environment and branch exactly."
  }

  assert {
    condition = alltrue([
      for env, policy in aws_iam_role_policy.deploy :
      length(jsondecode(policy.policy).Statement) == 3 &&
      toset(jsondecode(policy.policy).Statement[0].Resource) == toset([
        "arn:aws:ec2:eu-west-2:123456789012:instance/i-01234567890123456",
        "arn:aws:ssm:eu-west-2:123456789012:document/audi-deploy-${env}",
      ]) &&
      jsondecode(policy.policy).Statement[0].Action == "ssm:SendCommand" &&
      jsondecode(policy.policy).Statement[1].Action == "ssm:DescribeDocument" &&
      jsondecode(policy.policy).Statement[1].Resource == "arn:aws:ssm:eu-west-2:123456789012:document/audi-deploy-${env}" &&
      jsondecode(policy.policy).Statement[2].Action == "ssm:GetCommandInvocation" &&
      jsondecode(policy.policy).Statement[2].Resource == "*" &&
      jsondecode(policy.policy).Statement[2].Condition.StringEquals["aws:RequestedRegion"] == "eu-west-2"
    ])
    error_message = "Deploy roles must only describe/invoke their own document, target one instance and read regional status."
  }

  assert {
    condition = alltrue([
      for env, doc in aws_ssm_document.deploy :
      jsondecode(doc.content).parameters.Manifest.interpolationType == "ENV_VAR" &&
      length(jsondecode(doc.content).mainSteps) == 1 &&
      endswith(jsondecode(doc.content).mainSteps[0].inputs.runCommand[2], "' ${env}")
    ])
    error_message = "Each command document must pass the manifest as data and hard-code its own target."
  }
}

run "reject_bad_inputs" {
  command = plan

  variables {
    aws_account_id    = "wrong"
    instance_id       = "*"
    github_repository = "*/*"
  }
  expect_failures = [var.aws_account_id, var.instance_id, var.github_repository]
}
