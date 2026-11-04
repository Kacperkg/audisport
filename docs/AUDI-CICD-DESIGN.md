# Audi CI/CD design

## Read-only inventory, 4 November 2026

Audi is the public `Kacperkg/audisport` repository. Remote `main` at
`1ca4c840650f93f66cc3b47cb4d9ae6f8feee79a` is the integration baseline.
GitHub listed `main` and `fix/timeline-accessibility` as unprotected, no
`staging` branch, no rulesets or registered Actions workflows, and a
`Production` environment with no branch policy or reviewers. Enable releases
only after an operator creates and protects `staging`, protects `main`, and
sets exact environment branch policies. Use PRs from feature branches into
staging, then a merge or fast-forward that preserves the staged tree into main.

`index.html` loads `src/main.tsx` and `App.tsx`. React 19, TypeScript 6,
Vite 8, Tailwind 4, GSAP and Lenis produce one static SPA. Install with pnpm
10.17.0 and the frozen lockfile, then run lint, Prettier, TypeScript and
`pnpm build`. Vitest exists in package scripts and the baseline has zero
specs. The image test covers production Nginx and the static SPA. Nginx runs
as UID 101 on 8080 with `/healthz`. The application has no backend, database,
migrations, persistent volumes, or runtime secrets. One linux/amd64 image
serves both environments.

Read-only discovery confirmed the selected SSM-managed host is online in
`eu-west-2`, supports ENV_VAR interpolation and uses x86_64. The account
already has the GitHub OIDC provider. GitHub reported the default OIDC
subject format. The IAM and SSM inventory found no Audi-named deployment
resources. Resolve and record the exact account, instance and current AWS
ownership in private operator records before plan review.

Read-only host inspection confirmed both Audi frontend projects use the
existing external `web` network and have the expected Compose ownership.
Both public HTTPS health checks passed. The repository runbook documents
the existing checkout-based local build and full-SHA tags. The migration
preserves the project names, network aliases, Caddy routes and previous
local image.

## Architecture and ownership

A protected staging push runs shared CI, builds and validates one image, and
publishes to the public Audi GHCR package. Only its digest enters the manifest.
A successful SSM invocation and public HTTPS release SHA and target checks
produce an immutable Actions artifact. Production has one manual confirmation.
It derives the reviewed SHA from the protected main dispatch, then finds the
unique eligible ordinary staging push among the last 30 days and at most
300 runs. The tested commit must be an ancestor with the exact same Git
tree, including deployment inputs. Merge commits and fast-forwards can
preserve that guarantee. A squash, rebase or additional main change that
breaks it requires new staging evidence.

The resolver checks the latest attempt's application, deployment configuration,
publish and deploy jobs. It binds the GitHub artifact digest to the archive,
manifest, target-specific receipt and successful pinned staging invocation.
It verifies anonymous availability of the exact image digest and repeats
resolution after AWS credential acquisition. The main tip is checked before
credentials and as the last GitHub check before dispatch. These checks do
not make GitHub state and AWS command submission atomic.

A confirmation lasts at most 20 minutes from the original GitHub dispatch.
Production job reruns require a fresh dispatch. SSM gets the unchanged staging
manifest in a production-only envelope valid for 510 seconds. The host checks
freshness on receipt and under shared locks before mutation and requires
the full 420-second execution budget. Per-release durable attempt markers
reject replay even while an envelope is fresh. Staging keeps its existing
manifest format. Audi has one static frontend and needs no database controls.

GitHub must use a custom subject containing the exact repository, environment
and ref. The default subject observed during discovery cannot satisfy the new
trust policy. Exact GitHub environment branch restrictions and protected
branches are separate prerequisites. The two roles can
each invoke one fixed-purpose SSM document on the one instance. Workflow
verification binds the reviewed numeric version and AWS SHA-256 document hash.
IAM cannot scope SendCommand to a document version. Keep every callable
revision safe and retire unsafe generations through separately approved changes.

The audited Vellum integration reference is
`3112fb0584006671b9f7c050db27b4a51f9dafde`. Read-only inspection verified the installed controller, backup implementation
and coordination module against the reference. The Audi runner
loads verified bytes of that root-owned coordination module in memory and
participates in its exact nonblocking order under `/var/lib/vellum-cd`:
`backup.lock`, `staging.lock`, then `production.lock`. Vellum's module
checks and exclusively creates `operation-pending.json` under those locks,
syncs the marker, and retains it on incomplete operations. Never replace lock
inodes. Verify all installed deployment/backup entry points understand the same
pending record before installation. The runner uses a separate Audi receipt
directory. Production and staging replacement target one fixed Compose service
and project at a time.

The shared network and instance profile remain a host-level trust boundary.
IMDSv2 alone does not isolate application containers from the instance role.
Verify the live metadata hop limit, container reachability and instance role
permissions in an approved maintenance window. Review any host-level egress
restriction with Vellum and SSM owners before applying it. Measure memory,
CPU, disk headroom and deployment peaks under representative traffic and
backup activity before setting limits or rollout windows.

No additional EC2, load balancer, DNS, VPC, security groups or proxy resources
are planned. State S3 stores small versioned objects and charges for storage
and requests. GHCR and Actions usage depend on package visibility and GitHub
billing terms. Image pulls consume EC2 traffic and disk. Keep observed
usage separate from cost estimates and existing EC2 charges.

Install reviewed root-owned assets and confirm package visibility, GitHub
controls, EC2 compatibility and host resource headroom before enabling the
staging gate. Keep the previous image ID and Compose inputs for rollback.
First confirm staging and manually promote the exact staged digest. Recovery
from a failed or interrupted operation requires checking the shared marker,
daemon activity and receipts under the shared locks. See the operations runbook.
