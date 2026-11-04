# New-project CI/CD checklist

1. **Repository and integration**. Inventory application entry points,
   runtime data, ports, platform, test commands and existing owners. Select
   protected staging and production refs. Set required CI and exact
   deployment-environment branch rules. Document enforced reviewers and
   individual operator conventions.
2. **Terraform ownership**. Start from the Audi deployment root only where
   the project has the same shape. Set exact repository, AWS account, host
   instance and unique resource names. Inventory pre-existing resources and
   ownership. Bootstrap a dedicated versioned, encrypted, private S3 backend
   with lockfile and scoped operator access. Review and save a plan before
   approved apply. Keep external network and shared host out of project state.
3. **Deploy identity**. Scope exact audience, repository, environment and ref
   in OIDC trust. Configure the matching GitHub subject template. Give each
   environment its own Command document, exact managed instance and minimal
   status permission. Verify AWS numeric document version, identity and hash,
   SSM Agent capabilities and accepted parameter patterns.
4. **Immutable artifacts**. Select unique package name and package permissions.
   Use a single production-equivalent build, image tests, dependency/secret
   and vulnerability checks, then record digest, source SHA, repository,
   workflow/run attempt and bundle identity. Use a protected host registry
   identity if private. Verify artifact archive digests and receipt links.
5. **Host boundary**. Install verified deployment assets and configuration
   under protected paths. Confirm project names, container ownership,
   Compose network aliases, host port ownership, metadata credential
   boundary and capacity. Record exact shared lock and recovery protocol.
   Keep runtime secrets out of the application checkout.
6. **Proxy**. Identify current Caddy route owners and the published target
   hostname. Validate the complete configuration privately. Arrange a
   separate approved change for DNS, certificate or proxy reload if needed.
   Check public HTTPS health, source and environment-specific upstream.
7. **First staging**. Enable publishing, verify registry pulls and inspect
   role/pins before separately enabling staging. Observe host receipts and
   public health, capture prior images and exercise negative cases in an
   isolated environment. Review fail-closed recovery before production.
8. **Production**. Require a protected reviewed commit, explicit manual
   confirmation, the exact eligible staging artifact and approved timing.
   Preserve digest, command and host receipts. Verify the public upstream.
   Document and rehearse project-only recovery using retained images.
9. **Operations and costs**. Record resource owners, AWS region, storage,
   runner and transfer usage, measured resource headroom, retention and
   escalation contacts. Teardown only project-owned resources after checking
   dependency and state retention. Treat shared host, network, proxy and
   account-level services as external unless ownership explicitly changes.
