# Local deployment validation

Prepared on 25 October 2026. No live infrastructure was changed.

## Discovered application

- React 19.2.7, Vite 8.1.0, TypeScript 6.0.3 and Tailwind CSS 4.3.1 in the
  existing pnpm lockfile (v9). The local pnpm version is 10.17.0.
- `pnpm build` invokes `vite build` and emits a static SPA to `dist/`.
- No SSR, application router, backend, database, or frontend build-time
  environment variables were found.
- The owner corrected the intended hostname to `audisport.kacpergajdarski.com`;
  existing canonical metadata already matches it. Staging uses
  `staging.audisport.kacpergajdarski.com`.

## Results

| Check                                            | Result                                                                                                                                                                                                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`                                     | Passed on local Node 25.2.1.                                                                                                                                                                                                                   |
| `pnpm lint`                                      | Passed.                                                                                                                                                                                                                                        |
| `pnpm exec tsc --noEmit`                         | Passed.                                                                                                                                                                                                                                        |
| `pnpm test`                                      | Exited 1: no test files exist. No test failures were hidden.                                                                                                                                                                                   |
| `pnpm check`                                     | Exited 1 for existing formatting in `.cta.json`, `prettier.config.js`, `tailwind.config.js`, and `tsconfig.json`. These files were not changed.                                                                                                |
| Targeted Prettier check                          | New deployment Markdown and Compose YAML passed.                                                                                                                                                                                               |
| `sh -n deploy/build-image.sh`                    | Passed.                                                                                                                                                                                                                                        |
| Release helper on this uncommitted checkout      | Correctly refused a release build.                                                                                                                                                                                                             |
| Release helper in a temporary committed snapshot | Built from the archived commit with a full SHA tag and matching revision label, reused the image unchanged on a second call, and refused a subsequent tracked source change. The snapshot image was removed; repository history was untouched. |
| `git diff --check`                               | Passed.                                                                                                                                                                                                                                        |
| Env-file ignores                                 | Real staging/production env files and `.env.previous` backups are ignored; example templates remain trackable.                                                                                                                                 |
| Compose configuration                            | Both example environments passed `docker compose --env-file deploy/<environment>.env.example -f deploy/compose.yml config --quiet`. Expanded names, aliases and absence of host port mappings were checked.                                    |
| Docker build                                     | Passed using digest-pinned Node 24.22.1 and Nginx unprivileged 1.30.6, pnpm 10.17.0 and a frozen lockfile install.                                                                                                                             |
| Runtime Nginx configuration                      | `nginx -t` passed in both environments.                                                                                                                                                                                                        |
| Caddy example                                    | `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` passed using a temporary `caddy:2.10.2-alpine` container with networking disabled and no published ports.                                                                   |

Docker runtime checks used local Docker Engine 29.0.1 on Linux ARM64 through
Docker Desktop, with Compose v2.40.3. The uncommitted deployment image was tagged
`audi/frontend:deployment-validation` and labelled `uncommitted-validation`;
it is **not** a released SHA-tagged artifact. Nothing was pushed to a registry.
Do not promote this validation tag. Commit the reviewed files, then build the
release on the target architecture using the runbook.

## Serving, networking and security checks

Two local Compose projects ran simultaneously as `audi-staging` and
`audi-production`. A temporary override selected an isolated external network
named `audi-deploy-validation-01a17291` so the existing `web` network and other
local workloads were untouched. The actual environment-specific aliases were
used for HTTP requests between containers.

Both environments passed these checks:

- Compose `up --wait` reached healthy; `/healthz` returned `200`, `ok` and
  `Cache-Control: no-store`.
- `/`, `/index.html`, and direct `/story/quattro` returned the same SPA HTML
  with `Cache-Control: no-cache`.
- Actual hashed JS and CSS returned their expected content types and
  `public, max-age=31536000, immutable` caching.
- A public WebP image, local OTF font, `robots.txt`, sitemap and manifest were
  served successfully with revalidation headers.
- Missing JS and image paths returned 404; the missing hashed asset had no
  immutable cache header. `/.env` was denied with 403.
- Stable aliases resolved to their corresponding containers. Both containers
  used the same tested image ID, with no published host ports.
- UID/GID `101:101`, read-only root, all capabilities dropped,
  `no-new-privileges`, bounded tmpfs, restart policy and rotated logs matched
  the configuration. `/proc/1/status` confirmed zero effective capabilities
  and `NoNewPrivs: 1`.
- Writes to the served directory failed; writes to `/tmp` succeeded. Node,
  pnpm and the build-stage `/app` directory were absent from the runtime.

The first serving pass found owner-only font permissions in this local
checkout. The Dockerfile now normalizes `dist/` permissions before copying it
to the unprivileged runtime; the repeated checks passed after that fix.
All temporary application containers and the validation network were removed.
The local validation image and downloaded build caches remain available.

## Remaining operator checks

- A release from the reviewed commit on EC2 and future registry
  pull/push/immutability controls still need validation. The helper passed a
  temporary committed snapshot test and checks local existing tags; it cannot
  prevent a registry overwrite.
- The ARM64 runtime was exercised; AMD64 on the actual EC2 instance was not.
  Base manifests include both architectures. Build natively or deliver a
  suitable multi-platform artifact.
- Real `web` network membership, shared Caddy mounts/service name/version,
  Elastic IP, firewall/security groups and server capacity require EC2 access.
- Production and staging DNS, TTL, IPv6, CAA, ACME certificate issuance,
  `curl --resolve` against EC2, and Vercel fallback require real infrastructure
  access and are documented as operator steps.
- Browser interaction/device testing was not performed during this deployment
  preparation. Scroll animations, responsive layouts and external Google Font
  requests should be checked on staging.
- A health check confirms HTTP serving, not full application behavior.
  Compose replacement on one EC2 host can briefly interrupt service; this is
  not a zero-downtime or high-availability deployment.
