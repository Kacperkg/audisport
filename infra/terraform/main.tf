locals {
  environments = {
    staging    = { name = "staging", branch = "staging" }
    production = { name = "Production", branch = "main" }
  }
  github_parts = split("/", var.github_repository)
  oidc_repo = var.github_immutable_ids == null ? var.github_repository : format(
    "%s@%s/%s@%s",
    local.github_parts[0], var.github_immutable_ids.owner,
    local.github_parts[1], var.github_immutable_ids.repository,
  )
  runner_hash      = filesha256("${path.module}/../../deploy/host/deploy.py")
  runner_bootstrap = <<-PYTHON
    import hashlib, stat, sys
    from pathlib import Path
    runner = Path("/usr/local/lib/audi-cd/deploy.py")
    for parent in reversed(runner.parents):
        info = parent.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
            sys.exit("unsafe Audi runner path")
    info = runner.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022 or info.st_nlink != 1:
        sys.exit("unsafe Audi runner file")
    source = runner.read_bytes()
    if hashlib.sha256(source).hexdigest() != "${local.runner_hash}":
        sys.exit("Audi runner SHA-256 mismatch")
    sys.argv[0] = str(runner)
    exec(compile(source, str(runner), "exec"))
  PYTHON
  instance         = "arn:aws:ec2:eu-west-2:${var.aws_account_id}:instance/${var.instance_id}"
}

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_ssm_document" "deploy" {
  for_each        = local.environments
  name            = "${var.resource_prefix}-deploy-${each.key}"
  document_type   = "Command"
  document_format = "JSON"

  content = jsonencode({
    schemaVersion = "2.2"
    description   = "Deploy the reviewed Audi frontend to ${each.key} only."
    parameters = {
      Manifest = {
        type              = "String"
        interpolationType = "ENV_VAR"
        allowedPattern    = "^[A-Za-z0-9+/=]+$"
        minChars          = 1
        maxChars          = 4096
      }
    }
    mainSteps = [{
      action       = "aws:runShellScript"
      name         = "deployAudi"
      precondition = { StringEquals = ["platformType", "Linux"] }
      inputs = {
        timeoutSeconds = "420"
        runCommand = [
          "set -eu",
          "test -n \"$${SSM_Manifest:-}\"",
          "exec /usr/bin/python3 -I -B -c '${trimspace(local.runner_bootstrap)}' ${each.key}",
        ]
      }
    }]
  })

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_iam_role" "deploy" {
  for_each             = local.environments
  name                 = "${var.resource_prefix}-github-${each.key}-deploy"
  max_session_duration = 3600
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = data.aws_iam_openid_connect_provider.github.arn }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${local.oidc_repo}:environment:${each.value.name}:ref:refs/heads/${each.value.branch}"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "deploy" {
  for_each = local.environments
  name     = "deploy-one-audi-service"
  role     = aws_iam_role.deploy[each.key].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ssm:SendCommand"
        Resource = [aws_ssm_document.deploy[each.key].arn, local.instance]
      },
      {
        Effect   = "Allow"
        Action   = "ssm:DescribeDocument"
        Resource = aws_ssm_document.deploy[each.key].arn
      },
      {
        Effect    = "Allow"
        Action    = "ssm:GetCommandInvocation"
        Resource  = "*"
        Condition = { StringEquals = { "aws:RequestedRegion" = "eu-west-2" } }
      }
    ]
  })
}
