# Both multi-platform base images are pinned by digest; update them deliberately.
FROM node:24.22.1-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS build

WORKDIR /app
RUN npm install --global pnpm@10.17.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY index.html vite.config.ts tsconfig.json tailwind.config.js ./
COPY src ./src
COPY public ./public
# Public files can have restrictive permissions in a developer's checkout.
# Normalize compiled output so the unprivileged runtime can read every asset.
ARG VCS_REF=uncommitted
RUN pnpm build && printf '%s\n' "$VCS_REF" > dist/release-sha.txt && chmod -R a=rX dist

FROM nginx/nginx-unprivileged:1.30.6-alpine@sha256:44e74ca483234093081138b6d7b6f561d55557756a2deefc3a5056148defeb99 AS runtime

# Remove this targeted Alpine patch once the pinned base carries the fix.
USER root
RUN apk add --no-cache --upgrade 'libexpat>=2.10.0-r0'

ARG VCS_REF=uncommitted
LABEL org.opencontainers.image.title="Audi frontend" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.source="https://github.com/Kacperkg/audisport"
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
STOPSIGNAL SIGQUIT
# Skip upstream entrypoint scripts: configuration is baked in and read-only.
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
