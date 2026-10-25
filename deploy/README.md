# AudiSport on the existing EC2 host

These files prepare a deployment; they do not change live infrastructure.
Production stays on Vercel until the staged checks and cutover below succeed.
Use `audisport.kacpergajdarski.com` for production and
`staging.audisport.kacpergajdarski.com` for staging. The original assignment's
`audi` hostname was corrected to `audisport` by the owner.

## What runs

- React 19 + TypeScript + Vite 8 SPA, Tailwind CSS 4, GSAP and Lenis.
- pnpm lockfile v9; pinned pnpm 10.17.0 installs with `--frozen-lockfile`.
- `pnpm build` runs `vite build`, producing `dist/`. There is no SSR, backend,
  database, API, or router. Extensionless deep links serve the same SPA shell;
  the application does not implement separate pages at those URLs.
- No frontend environment variables are currently required. All URLs in page
  metadata, `robots.txt`, and the sitemap already use the production hostname.
  Any future Vite build-time variables are public in browser bundles: never put
  credentials or other secrets in them. Compose env files select the image and
  project; they are not injected into the bundle or container.
- The build uses Node 24.22.1 on Debian; the runtime uses Nginx unprivileged
  1.30.6 on Alpine. Both multi-platform base images are digest-pinned. Refresh
  these pins deliberately in a new commit for security updates.
- Only compiled output and Nginx configuration enter the runtime. UID/GID
  `101:101` serves HTTP on port 8080 with a read-only filesystem and a 64 MiB
  `/tmp` tmpfs. Capabilities are dropped; privilege escalation is disabled.
- Only the existing Caddy publishes ports and terminates TLS. Both Compose
  projects join the existing external `web` network. There are no host ports,
  new host proxies, or extra services in this definition.

Nginx revalidates HTML and public files, caches Vite's hashed `/assets/` for a
year, returns 404 for missing assets/files, and answers `/healthz` with `ok`.
Docker logs rotate at 10 MiB × 3 files. `unless-stopped` restarts exited
containers; an unhealthy status alone does **not** trigger a Docker restart.
Staging's Caddy block discourages indexing with `X-Robots-Tag`; it does not
provide access control.

## 1. Prepare the checkout and validate configuration

Review and commit these deployment files before preparing a release. On EC2,
use the reviewed commit checked out at `/opt/hosting/projects/audi/`. Do not
build a release from uncommitted changes. Commands below run in **Bash** on
Ubuntu with permission to use Docker. Compose v2 with `up --wait` is required.

```bash
cd /opt/hosting/projects/audi/
git status --short
git rev-parse HEAD
docker version
docker compose version
docker network inspect web
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Networks}}'

cp -n deploy/staging.env.example deploy/staging.env
cp -n deploy/production.env.example deploy/production.env
chmod 600 deploy/staging.env deploy/production.env

# Keep Compose interpolation isolated from any exported shell values.
dc() {
  local target="$1"
  shift
  env -u COMPOSE_PROJECT_NAME -u IMAGE_PREFIX -u IMAGE_TAG \
    docker compose --env-file "deploy/$target.env" -f deploy/compose.yml "$@"
}

dc staging config --quiet
dc production config --quiet
```

The templates contain a deliberately unusable all-zero SHA placeholder.
In each new shell, repeat the `cd` and `dc` function definition above.
Actual `*.env` files are Git-ignored and excluded from Docker build context.
Keep project names exactly `audi-staging` and `audi-production` so their
network aliases match Caddy. Do not supply `-p` or export `COMPOSE_PROJECT_NAME`
to rename a deployment. There is no `container_name`; the two projects remain
independent. Other services may share the service-name alias `frontend` on
`web`; Caddy must use the explicit `audi-…-frontend` aliases.

Before starting anything, confirm the existing Caddy container is connected to
`web` and owns ports 80/443. Do not create `web` on EC2 to mask a missing or
misconfigured shared proxy. Check security groups/firewalls permit the existing
HTTP/HTTPS ingress, the instance has a stable Elastic IP, and the selected
image architecture matches `docker info --format '{{.Architecture}}'`.

## 2. Build once, then start staging

Build on EC2 for its native architecture. The helper checks the checkout is
clean, tags with the full 40-character HEAD SHA, records that SHA in the image
label, and reuses an existing local tag rather than rebuilding it. Its build
context comes from `git archive` of that commit, excluding ignored local files.

```bash
cd /opt/hosting/projects/audi/
RELEASE_SHA=$(git rev-parse HEAD)
sh deploy/build-image.sh audi/frontend
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$RELEASE_SHA/" deploy/staging.env
dc staging config --quiet
dc staging up -d --no-build --pull never --wait --wait-timeout 90
dc staging ps
dc staging logs --tail=100 frontend
dc staging exec -T frontend wget -qO- http://127.0.0.1:8080/healthz
dc staging exec -T frontend wget -qO /dev/null http://127.0.0.1:8080/story/quattro

STAGING_ID=$(dc staging ps -q frontend)
docker inspect --format '{{.State.Health.Status}} {{.Image}}' "$STAGING_ID"
docker inspect --format '{{json .NetworkSettings.Networks}}' "$STAGING_ID"
```

Record the full SHA and `docker image inspect --format '{{.Id}}'
"audi/frontend:$RELEASE_SHA"` in your release notes. Keep the previous working
image locally for rollback. Do not run global image-prune commands.

A SHA identifies an immutable release artifact by convention. Do not remove
and rebuild a released tag, retag different bytes under it, or overwrite it in
a registry. If an image has been published or built on another machine, fetch
that artifact instead of building again. Fixes, dependency changes, config
changes, and base-image updates need a new commit and a new tag. The helper
guards local tag reuse; it cannot enforce registry tag immutability.

For future GHCR delivery, set the same `IMAGE_PREFIX=ghcr.io/<owner>/audi-frontend`
in both real env files, use a full SHA tag, authenticate separately if private,
and explicitly run `dc staging pull frontend` before `up`. Compare the fetched
image digest with the tested release record. Registry credentials belong in
Docker's credential store, not frontend variables. No workflow is added here.
Use a native EC2 build or a multi-platform registry artifact if a development
machine has a different CPU architecture.

## 3. Integrate with the existing Caddy and verify staging

Review `deploy/Caddyfile.example` and manually merge the appropriate site blocks
into `/opt/hosting/proxy/Caddyfile`, preserving every existing site and global
option. Do not copy this example over the real file. For the staging-first
phase, enable only the staging block until production or its preview is ready;
enabling production early may cause certificate issuance retries while DNS
still points to Vercel.

Discover the actual proxy Compose service name and Caddyfile mount first:

```bash
docker compose -f /opt/hosting/proxy/compose.yml config --services
# Set this to the existing service name shown above, e.g. caddy.
PROXY_SERVICE=caddy
docker compose -f /opt/hosting/proxy/compose.yml exec -T "$PROXY_SERVICE" \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose -f /opt/hosting/proxy/compose.yml exec -T "$PROXY_SERVICE" \
  caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

The proxy's Compose filename, service name, mount path and reload procedure
must be checked on the real server; substitute its actual paths if different.
Back up its Caddyfile before editing. Do not restart unrelated projects.

In Namecheap, create only an **A record `staging.audisport`** pointing to the
Elastic IP. Check this specific hostname has no conflicting CNAME or stale
AAAA record. Caddy should then obtain its staging certificate automatically.
Do not touch `@`, `www`, mail, or records belonging to other projects.

```bash
curl --fail --show-error -I https://staging.audisport.kacpergajdarski.com/
curl --fail --show-error https://staging.audisport.kacpergajdarski.com/healthz
curl --fail --show-error -I https://staging.audisport.kacpergajdarski.com/story/quattro
# Copy an actual /assets/index-<hash>.js URL from the served HTML:
curl --fail --show-error https://staging.audisport.kacpergajdarski.com/
```

Request the real hashed JS and CSS URLs with `curl -I`: expect their correct
content types and `Cache-Control: public, max-age=31536000, immutable`.
Expect `no-cache` for `/`, `/index.html`, public images and fonts; `/healthz`
returns `no-store`. A nonexistent `/assets/missing.js` should return 404 without
an immutable cache header. In a browser, verify homepage load, direct reload
of `/story/quattro`, local fonts/images, desktop scrolling, mobile layout and
the console. The deep link currently renders the same single-page experience.

## 4. Promote the exact staging image to production

Do this before changing production DNS. Keep the same prefix in both env
files. `RELEASE_SHA` below must come from the release that passed staging.

```bash
cd /opt/hosting/projects/audi/
RELEASE_SHA=$(sed -n 's/^IMAGE_TAG=//p' deploy/staging.env)
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$RELEASE_SHA/" deploy/production.env
dc production config --quiet
dc production up -d --no-build --pull never --wait --wait-timeout 90
dc production ps
dc production exec -T frontend wget -qO- http://127.0.0.1:8080/healthz
STAGING_ID=$(dc staging ps -q frontend)
PRODUCTION_ID=$(dc production ps -q frontend)
test "$(docker inspect --format '{{.Image}}' "$STAGING_ID")" = \
     "$(docker inspect --format '{{.Image}}' "$PRODUCTION_ID")"
```

For registry deployments on a different host, explicitly pull the previously
tested artifact before `up`, verify its recorded digest, and retain it for
rollback. Compose has no build section and uses `pull_policy: never`; starting
either environment cannot silently rebuild or replace its local image.

## 5. Validate production before its DNS change

Vercel continues receiving ordinary production traffic during this step.
Add the production Caddy block using the same validation/reload procedure.
Once Caddy has a certificate valid for `audisport.kacpergajdarski.com`, test
against the Elastic IP, replacing the documentation address below:

```bash
AWS_ELASTIC_IP=203.0.113.10
curl --fail --show-error \
  --resolve "audisport.kacpergajdarski.com:443:$AWS_ELASTIC_IP" \
  https://audisport.kacpergajdarski.com/healthz
curl --fail --show-error -I \
  --resolve "audisport.kacpergajdarski.com:443:$AWS_ELASTIC_IP" \
  https://audisport.kacpergajdarski.com/story/quattro
```

Also request `/`, real JS/CSS and images through this route. `--resolve`
preserves the hostname for both TLS SNI and HTTP Host while bypassing public
DNS. A Host header alone with an IP URL does not do this. TLS verification
requires a valid hostname certificate; do not use `-k` to call this a successful
HTTPS validation.

**Certificate bootstrap:** while production DNS points to Vercel, normal ACME
HTTP/TLS challenges usually reach Vercel rather than this Caddy. Choose one:

1. If the separately managed proxy already supports a suitable DNS challenge
   module or an operator-managed certificate process, obtain the production
   certificate through that process without changing its A/CNAME record.
   A DNS challenge requires carefully scoped TXT changes and appropriate
   credentials; this repository does not provision a Caddy module or secrets.
   Never copy out Vercel's managed private keys.
2. The simpler preview route needs no extra DNS record: temporarily add the
   following handler **inside the existing staging site block**, before its
   catch-all `reverse_proxy`. Both backends serve the same tested image.

   ```caddyfile
   handle_path /production-preview/* {
       reverse_proxy audi-production-frontend:8080
   }
   ```

   After validating and reloading Caddy, request
   `https://staging.audisport.kacpergajdarski.com/production-preview/healthz`,
   `/production-preview/`, `/production-preview/story/quattro`, and an actual
   `/production-preview/assets/index-<hash>.js`. This uses staging's valid
   certificate and directly tests the production upstream. In a browser,
   absolute `/assets/` paths go to staging; compare the production and staging
   image IDs as above and inspect the production asset paths explicitly.
   Remove the temporary handler after verification. This validates the
   production app through trusted HTTPS, but does not validate production's
   certificate; that must be checked immediately at cutover.

See [Caddy's HTTPS challenge documentation](https://caddyserver.com/docs/automatic-https#challenges)
and the [unprivileged Nginx image documentation](https://github.com/nginx/docker-nginx-unprivileged)
for the upstream behavior behind these choices.

## 6. Cut over and verify, keeping Vercel available for rollback

1. Record the existing **`audisport`** DNS record type/value and TTL in
   Namecheap, including any hostname-specific IPv6 record. Keep the Vercel
   project and domain configuration intact. If lowering this record's TTL in
   advance, wait out its previous TTL before the planned cutover.
2. After staging and production preview checks pass, replace only the
   `audisport` CNAME/A record with an **A `audisport` → Elastic IP**. A CNAME
   cannot coexist with an A record at the same name. Remove or correct only a
   stale `audisport` AAAA record if IPv6 would send visitors elsewhere. Keep
   `staging.audisport` → Elastic IP. Leave `@`, `www`, email, and other projects
   alone. Do not change nameservers.
3. If using the preview bootstrap, watch Caddy certificate issuance and logs.
   HTTP/HTTPS must reach this EC2 instance; CAA policy must allow its issuer.
   TLS issuance can lag DNS propagation. If verified production TLS is not
   available, restore the previous production DNS record and investigate.
4. Verify `dig +short audisport.kacpergajdarski.com A`, any `AAAA`, and the
   staging record from multiple resolvers. Re-run the `--resolve` tests without
   disabling verification, then use ordinary `curl` and browsers against both
   hostnames. Check direct links, assets, headers, health and Caddy/app logs.
   Resolver and browser caches can retain the old answer for the prior TTL or
   longer; traffic may reach both Vercel and EC2 during propagation.
5. Monitor after propagation, keep previous images and Vercel available through
   a comfortable rollback window, and remove the temporary preview handler.
   Remove the Vercel domain/project only after successful cutover, verification
   and the rollback window. Removing it immediately prevents a quick DNS undo.

## Updates and rollback

For each update, check out the next reviewed commit in a clean checkout, build
once with `sh deploy/build-image.sh audi/frontend` (or pull its existing
registry artifact), update only staging's `IMAGE_TAG`, and repeat staging tests.
For example, after setting `NEXT_SHA` to that reviewed full commit SHA:

```bash
cd /opt/hosting/projects/audi/
git fetch origin
git checkout --detach "$NEXT_SHA"
sh deploy/build-image.sh audi/frontend
RELEASE_SHA=$(git rev-parse HEAD)
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$RELEASE_SHA/" deploy/staging.env
dc staging config --quiet
dc staging up -d --no-build --pull never --wait --wait-timeout 90
```

Repeat the staging verification, then save the previous production selection
before promoting:

```bash
cp deploy/production.env deploy/production.env.previous
chmod 600 deploy/production.env.previous
```

Repeat promotion and the image-ID comparison, then browser checks. No DNS
change is required for routine image updates. Keep the Compose definition
compatible with the old release; if changing it, retain the old deployment
files too. Use the exact previously tested tag for an application rollback:

```bash
cp deploy/production.env.previous deploy/production.env
dc production config --quiet
dc production up -d --no-build --pull never --wait --wait-timeout 90
dc production logs --tail=100 frontend
curl --fail --show-error https://audisport.kacpergajdarski.com/healthz
```

Apply the same saved-env process to staging if needed. If a previous image is
missing locally, pull its recorded registry artifact or restore a saved image;
do not rebuild it under the old SHA. Save local-only images with `docker image
save` before off-host backup if disaster recovery is needed.

For a failed initial cutover, restore only Namecheap's original `audisport`
record type/value (and its hostname-specific IPv6 record, if changed). Keep
Vercel's domain active so cached DNS answers remain served during rollback.
DNS reversal also takes time. Avoid stopping the AWS container until caches
have cleared. Stopping either Audi project with `docker compose down` leaves
the external `web` network intact. Do not stop or replace the shared proxy.

## Validation and remaining checks

Validation results from the preparation session are recorded in
[`VALIDATION.md`](VALIDATION.md). Server-specific permissions, Elastic IP,
architecture, firewall, DNS records/TTL/CAA, certificate issuance, the shared
Caddy configuration, actual Vercel domain settings and real browser behavior
must be verified by the operator. No SSH, DNS changes, Vercel changes, registry
pushes, GitHub Actions, or live infrastructure changes are performed here.
