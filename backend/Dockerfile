# syntax=docker/dockerfile:1

FROM node:24-slim AS bun-node
COPY --from=oven/bun:1-debian /usr/local/bin/bun /usr/local/bin/bun

FROM bun-node AS builder
WORKDIR /app
COPY package.json bunfig.toml bun.lock tsconfig.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY admin/package.json ./admin/
COPY app/package.json ./app/
RUN bun install --frozen-lockfile
COPY shared ./shared
COPY backend ./backend
COPY admin ./admin
RUN bun run --cwd backend build && bun run --cwd admin build

FROM bun-node AS prod-deps
WORKDIR /app
COPY package.json bunfig.toml bun.lock ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY admin/package.json ./admin/
COPY app/package.json ./app/
RUN bun install --production --frozen-lockfile

FROM node:24-slim AS runner
WORKDIR /app/backend

# Preserve isolated-linker layout so backend/node_modules/* symlinks resolve to ../../node_modules/.bun/*
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/backend/node_modules /app/backend/node_modules
COPY --from=builder /app/backend/package.json /app/backend/package.json
COPY --from=builder /app/backend/dist /app/backend/dist
COPY --from=builder /app/backend/drizzle /app/backend/drizzle
COPY --from=builder /app/backend/seed /app/backend/seed
# Built admin SPA only (no admin/node_modules): resolveBackendRoot()=/app/backend -> ../admin/dist
COPY --from=builder /app/admin/dist /app/admin/dist

RUN mkdir -p /data && chown -R node:node /app /data

USER node

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    BACKEND_ROOT=/app/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"

CMD ["node", "dist/main.cjs"]
