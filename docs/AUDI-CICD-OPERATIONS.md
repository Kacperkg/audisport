# Audi CI/CD operations

## Operator activation

1. Create protected `staging` from the reviewed integration commit. Protect
   `staging` and `main` with PRs, required Audi CI checks, review rules where
   feasible, and force-push and deletion restrictions. Apply the protections to
   maintainers as supported. Avoid path filters on the required CI checks.
   Only allow the `staging` branch in the `staging` environment and only
   `main` in `Production`, using selected branch rules. A solo maintainer
   records their own release decision as an operator convention. To enforce
   independent approval, configure a second eligible reviewer and prevent
   self-review where supported. The workflow's confirmation field is an
   intentional manual action, not independent review.
2. Apply the approved Audi Terraform plan using the
   [state and ownership procedure](../infra/terraform/README.md). Set Audi's
   repo-specific GitHub OIDC subject template under an approved settings change.
   The PUT endpoint is `/repos/Kacperkg/audisport/actions/oidc/customization/sub`
   with the JSON body below. Before enabling deploy jobs, verify that the
   signed subject on each approved ref equals the role's exact subject.
   Record only the subject, never the token. The existing shared AWS OIDC
   provider and Vellum repository settings are external dependencies.

   ```json
   {
     "use_default": false,
     "include_claim_keys": ["repo", "environment", "ref"]
   }
   ```

3. Keep repository variables `AUDI_PUBLISH_ENABLED`,
   `AUDI_STAGING_DEPLOY_ENABLED` and `AUDI_PRODUCTION_DEPLOY_ENABLED` unset
   until their respective operation is approved. In each GitHub deployment
   environment set `AUDI_AWS_ACCOUNT_ID`, `AUDI_INSTANCE_ID`,
   `AUDI_ROLE_ARN`, `AUDI_DOCUMENT`, `AUDI_DOCUMENT_VERSION` and
   `AUDI_DOCUMENT_SHA256`. For each selected numeric version, use
   `aws ssm get-document --region eu-west-2 --name "$DOCUMENT"
--document-version "$VERSION"` to compare its content with the reviewed
   plan, then read the AWS-reported hash using `aws ssm describe-document
--region eu-west-2 --name "$DOCUMENT" --document-version "$VERSION"
--query 'Document.[Owner,Name,DocumentVersion,HashType,Hash]'`.
   Recheck SSM online status and ENV_VAR support. Retain the reviewed values
   together in operator records. Never use `$DEFAULT` or `$LATEST`.
   In `Production`, also set `AUDI_STAGING_DOCUMENT_VERSION` and
   `AUDI_STAGING_DOCUMENT_SHA256` to the approved staging values. Promotion
   checks the receipt against those pins, the staging document name derived
   from the same Terraform prefix, and the configured shared instance.
   Update both SSM document pins after installing a new reviewed runner.
   Review the installed bundle, document versions and pins together before
   enabling the workflows. The production runner requires an expiring request.
4. Plan a drained maintenance window. Verify every active Vellum deployment,
   backup and maintenance entry point honours the shared pending file and
   lock order. Verify protected path ownership and the pinned coordinator
   digest. Observe both current Audi services, stable Caddy aliases, Compose
   ownership, Docker/curl/Compose prerequisites and realistic capacity.
   Privately retain each existing image ID, its original local tag and the
   reviewed legacy Compose inputs. Retain the image locally for first-release
   recovery. Avoid pruning or replacing any lock inode.
5. Verify reviewed bundle bytes in a private root-owned staging directory
   against independently computed `sha256sum` values for `deploy/host/deploy.py`,
   `deploy/manifest.py` and `deploy/host/compose.yml`. From that private
   directory, after verification and under the maintenance freeze, install:

   ```bash
   sudo install -d -o root -g root -m 755 /usr/local/lib/audi-cd
   sudo install -d -o root -g root -m 700 /var/lib/audi-cd /var/lib/audi-cd/docker-config
   sudo install -o root -g root -m 644 deploy.py manifest.py compose.yml /usr/local/lib/audi-cd/
   ```

   Check all path components for symlinks and untrusted ownership. Keep
   `docker-config` empty and root-private. Validate each installed Compose target
   with its exact project and image digest using `config --quiet`. The live
   Caddy routing was verified during discovery. If it differs at activation,
   validate the complete Caddyfile privately and obtain separate approval for
   route changes and reload. The external `web` network must already exist.

6. Enable publishing first. Push a reviewed protected staging commit to
   create the GHCR package. Approve anonymous read access to
   `ghcr.io/kacperkg/audisport-frontend` and confirm the repo's Actions
   package access. Initial package creation may default to private. Keep
   package write/delete access restricted and retain active and previous
   release digests. Once anonymous pull, host installation, Terraform and
   GitHub gates are verified, separately enable staging deployment.
   Production has its own activation variable.

## Release and promotion

On a protected staging push, CI validates the SPA, IaC and build. The publish
job scans and pushes the tested image once. An enabled staging job checks the
digest anonymously, uses temporary AWS credentials, and dispatches the
pinned SSM command. The target runner checks its installed bundle, previous
Compose ownership, pulled image identity, container health, and public HTTPS
health, release SHA and target. The immutable `audi-staged-RUN-ATTEMPT`
artifact contains the manifest and two receipts. A publish-only run or a
failed deployment has no eligible artifact. If a rebuild is appropriate,
rerun **all jobs** or push a new reviewed staging commit. A rerun changes the
run attempt and makes the older attempt ineligible.

After staging succeeds, merge the tested staging commit into `main` with a
merge commit that preserves its ancestry and full tree. A fast-forward also
preserves both. Squash and rebase promotions are ineligible if they drop the
tested ancestor. A merge with additional changes needs a fresh staging release.

In Actions, choose **Promote Audi production**, select `main`, and check
**Deploy the verified staging image now and stay available for recovery**.
Use a fresh dispatch when you can remain available through deployment and
any recovery. The production job requires protected `main`, a checked
confirmation and an enabled, restricted `Production` environment. Merges
have no production trigger. GitHub may show other refs in its dispatch
picker. Environment reviewer rules, where configured, are separate from the
operator checkbox.

The resolver searches up to 300 ordinary staging pushes created in the last
30 days, in pages of 100. It requires exactly one same-tree ancestor with a
successful latest attempt, successful required jobs and a valid, unexpired
deployment artifact. It verifies the archive and receipt hashes, staging
SSM pin, public HTTPS evidence and anonymous availability of the exact GHCR
digest. An ambiguous match, truncated search, changed run attempt or
invalid artifact stops promotion. The job summary records the selected run,
digest and verification evidence.

The job checks the protected `main` tip after any environment wait and again
before SSM submission. It repeats release resolution and compares the evidence
after obtaining credentials. GitHub and SSM do not share an atomic transaction.
A ref or release may change after the last GitHub check.

The initial confirmation lasts up to 20 minutes from GitHub run creation.
A queued or delayed job must have at least 510 seconds remaining before
submission. Start a new confirmed dispatch if the confirmation expires.
Rerunning production jobs cannot renew approval. The request expires 510
seconds after issuance. The runner requires 420 seconds remaining on receipt
and again under the shared locks before mutation, so delayed commands have
at most 90 seconds to begin. Keep workflow and host clocks synchronised.
The command's 420-second execution cap and durable attempt record still apply.
A time limit does not replace operator availability or the recovery procedure.
Activation, bundle updates and recovery still use the separately approved,
drained maintenance procedure. Check the job summary, production receipt
and public target after completion.

Artifacts are retained for 30 days. The invocation receipts contain the
instance identifier and SSM pin metadata. Confirm that the repository's
artifact visibility is acceptable before enabling releases. Retain known-good digests and authorised
receipt copies for the rollback horizon. Pin the reviewed document and runner
revision before each compatible bundle migration. Scan findings depend on
registry advisories and the Trivy database. The dependency gate covers the
production dependency graph. Image scans cover detectable vulnerabilities
and secret patterns in the shipped image, and static IaC scans complement
exact IAM tests. Review build inputs independently because scanner signatures
cannot prove the absence of credentials. No npm dependency or scan result
proves live host compatibility.

## Failures and rollback

Read the workflow's command ID and status artifact. If submission failed with
no command ID, inspect SSM command history before retrying because AWS can
accept a request whose response was lost. If GitHub is cancelled or times out,
the SSM command can continue. The workflow role observes command status only.
Any cancellation is an operator operation and does not establish daemon
quiescence. Check target-specific SSM and Docker status privately and avoid
printing resolved Compose data or credentials.

A benign read-only preflight failure releases the shared marker. A pull,
replacement or smoke failure retains the marker and the Audi attempt record
under `/var/lib/audi-cd`. It contains the intended digest and previous
Docker image ID. A completed receipt is written atomically and durably before
releasing shared coordination. Cancellation or reboot can leave a pending
marker beside a complete receipt. Use live evidence, command status and
receipt together before deciding whether to roll forward or back.

For approved recovery, freeze new managed operations and acquire the three
Vellum locks in the documented order using the reviewed coordinator's
`host_locks` path. Confirm Docker, SSM, Vellum backup processes and the target
container are quiescent. Keep the original marker and all attempt evidence.
After identifying the operation owner, resolving the failure and verifying
shared state, archive the marker under the same held locks per the shared
operator procedure. Sync the state directory before releasing the locks.
A stale PID, reboot or free lock is insufficient evidence.

To roll back, prefer the last known-good verified digest or the retained first
migration image ID. Under a separately approved shared-coordinated operation,
verify a digest pull or locally tag the exact recorded image ID for the target,
and use the reviewed protected Compose file with the one exact project and
`frontend` service. Run `config --quiet` then `up -d --no-deps --no-build
--pull never --wait --wait-timeout 100 frontend`. Match the running image
ID and inspect the public route and health. Older legacy images may lack the
new release or target endpoints, so verify the legacy health and served
assets explicitly. Record a separate rollback receipt. Roll forward through
a new reviewed staging release. Never reuse a previously attempted release
as a normal workflow retry. Preserve receipts and lock inodes, and avoid
shared network changes, global image pruning and Compose `down` during
recovery.
