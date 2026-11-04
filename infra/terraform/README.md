# Audi Terraform

There are two roots. `bootstrap/` owns one dedicated private state bucket.
The parent root owns two Audi IAM roles, two inline policies and two SSM
Command documents. It looks up the existing AWS GitHub OIDC provider and
targets the existing EC2 instance by exact ARN. Account is mandatory,
region is fixed to `eu-west-2`, and provider versions and checksums are pinned.

## Bootstrap and state access

Use Terraform 1.14.5, an approved short-lived operator identity in the account,
and a private working directory with `umask 077`. Separate bootstrap and
deployment operator access from the GitHub roles, which have no state access.

1. Create a reviewed bootstrap plan with `terraform -chdir=bootstrap init
-lockfile=readonly` and `terraform -chdir=bootstrap plan -out=bootstrap.tfplan
-var aws_account_id=YOUR-APPROVED-ACCOUNT -var bucket_name=YOUR-DEDICATED-BUCKET`.
   Review the six bucket resources and check the name is unused. Apply that exact
   saved plan only in the separately approved bootstrap operation. Keep the
   bootstrap local state in a protected, encrypted operator state store with
   recovery access, alongside ownership records. It remains separate from the
   deployment state. The AWS account must already have the shared OIDC provider.
2. Copy `audi.s3.tfbackend.example` to `audi.s3.tfbackend` and supply the bucket
   output. Confirm bucket ownership, versioning, encryption, block public access,
   ACLs disabled and HTTPS-only policy. Allow time for first-time S3 versioning
   propagation before creating state objects. Use the default workspace and the
   single configured state key. The backend uses the native S3 lockfile and SSE-S3.
   Trivy's customer-managed-key rule is scoped out for this encryption resource.
   The dedicated bucket uses scoped operator access and version recovery.
   A customer-managed KMS key would add a second permission and recovery dependency.
3. Scope deployment operator state access to `s3:ListBucket` on that dedicated
   bucket, `s3:GetObject` and `s3:PutObject` on
   `audi/deployment.tfstate`, and `s3:GetObject`, `s3:PutObject`,
   `s3:DeleteObject` on `audi/deployment.tfstate.tflock`. Restrict other
   bucket and version recovery actions to the bootstrap/recovery identity.
   Plan operators also need AWS read access for provider and refresh calls.
   An apply operator separately needs the scoped Audi IAM/SSM mutations.
   The routine deploy roles may read SSM invocation output in the region
   because AWS exposes no invocation resource ARN. Keep sensitive material
   out of SSM stdout/stderr across the shared account.

## Review the deployment plan

From this directory, after bootstrap approval, copy the example inputs and verify
the account, instance and repository against private operator records. Supply immutable GitHub IDs only if
GitHub uses that subject format. `staging` and `Production` must use the
custom subject template in the operations runbook.

```bash
umask 077
cp -n environments/audi.tfvars.example audi.tfvars
terraform init -backend-config=audi.s3.tfbackend -lockfile=readonly
terraform plan -lock-timeout=30s -var-file=audi.tfvars -out=audi.tfplan
terraform show -json audi.tfplan | jq -e '
  all(.resource_changes[] | select(.mode == "managed");
    (.type | IN("aws_iam_role", "aws_iam_role_policy", "aws_ssm_document")) and
    (.name == "deploy") and
    (.index | IN("staging", "production")) and
    (.change.actions | index("delete") | not))
'
```

Review `terraform show -no-color audi.tfplan` privately. Reject replacement,
deletion, unexpected resource addresses, wrong targets, trust broadening and
new policy grants. The initial deployment plan should contain six creates.
Check the document body, environment, bootstrap hash and absence of arbitrary
commands. An authorised operator applies only the reviewed saved plan. Never
attach raw plans, backend configs, credentials or state to the PR. PR CI uses
mock plans and static checks with the backend disabled.

Read-only IAM and SSM inventory found no Audi-named resources at discovery.
Recheck the exact names and Terraform ownership before apply. If a name already
exists, stop and determine the owner, callers, role policies, and document
versions/hashes. Import only reviewed Audi-owned resources after approval,
using the provider's import identifiers (IAM role name, inline role policy
`ROLE:POLICY`, SSM document name) at the correct `deploy["staging"]` or
`deploy["production"]` address. Plan again and resolve every unexpected change.
Keep the shared instance, OIDC provider, IAM profile and Vellum resources
outside both state roots.

For document changes, review every callable version and keep the approved
numeric version and AWS hash together in the GitHub environment. IAM scopes
document name and target. The dispatch code supplies and checks the version
and SHA-256. If a callable version becomes unsafe, disable access and retire it
as a separate operator change. A different protected asset bundle needs a
coordinated install and updated AWS pins. Treat documents as private to the
account. The first live command is a separate approved staging operation.

## State recovery

Freeze applies and confirm the original writer has stopped before releasing a
stale Terraform lock with the reviewed lock ID. Inspect version history and
recover the last known-good state object with the state recovery identity.
Compare lineage, serial and resource inventory, record the recovery, then
review a refresh/plan before allowing writes. Retain state versions, operator
audit evidence and backups. The bucket and SSM documents have destruction
guards. Any eventual retirement requires its own reviewed ownership and
dependency assessment.
