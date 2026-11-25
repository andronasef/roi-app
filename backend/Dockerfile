# syntax=docker/dockerfile:1

FROM node:24-slim AS bun-node
COPY --from=oven/bun:1-debian /usr/local/bin/bun /usr/local/bin/bun

FROM bun-node AS builder
WORKDIR /app
COPY package.json bunfig.toml bun.lock tsconfig.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY admin/package.json ./admin/
# The Expo app isn't built here: stub it so its React Native deps are never installed,
# then prune the lockfile to match (no versions change, only app entries drop).
RUN mkdir -p app && echo '{"name":"@roi/app","private":true}' > app/package.json \
 && bun install --lockfile-only && bun install --frozen-lockfile
COPY shared ./shared
COPY backend ./backend
COPY admin ./admin
RUN bun run --cwd backend build && bun run --cwd admin build

FROM bun-node AS prod-deps
WORKDIR /app
COPY package.json bunfig.toml bun.lock ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
# Runtime only needs backend deps: stub admin (shipped as static dist) and app.
RUN mkdir -p admin app \
 && echo '{"name":"@roi/admin","private":true}' > admin/package.json \
 && echo '{"name":"@roi/app","private":true}' > app/package.json \
 && bun install --lockfile-only && bun install --production --frozen-lockfile

FROM node:24-slim AS runner
WORKDIR /app/backend

# Preserve isolated-linker layout so backend/node_modules/* symlinks resolve to ../../node_modules/.bun/*
COPY --chown=node:node --from=prod-deps /app/node_modules /app/node_modules
COPY --chown=node:node --from=prod-deps /app/backend/node_modules /app/backend/node_modules
COPY --chown=node:node --from=builder /app/backend/package.json /app/backend/package.json
COPY --chown=node:node --from=builder /app/backend/dist /app/backend/dist
COPY --chown=node:node --from=builder /app/backend/drizzle /app/backend/drizzle
COPY --chown=node:node --from=builder /app/backend/seed /app/backend/seed
# Built admin SPA only (no admin/node_modules): resolveBackendRoot()=/app/backend -> ../admin/dist
COPY --chown=node:node --from=builder /app/admin/dist /app/admin/dist

# --chown on COPY above: a recursive chown here duplicated all of node_modules into a new layer.
RUN mkdir -p /data && chown node:node /data

USER node

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    BACKEND_ROOT=/app/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"

CMD ["node", "dist/main.cjs"]
