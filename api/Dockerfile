# TaskFlow API. Build from the repository root:
#   docker build -f api/Dockerfile -t taskflow-api .
# Debian slim (glibc) so @libsql/client uses its prebuilt native binary.

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --workspace api --include-workspace-root=false --no-audit --no-fund
COPY api/ api/
RUN npm run build --workspace api

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_URL=file:/data/taskflow.db
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --workspace api --include-workspace-root=false --omit=dev --no-audit --no-fund \
    && npm cache clean --force \
    && mkdir -p /data && chown node:node /data
COPY --from=build /app/api/dist api/dist
COPY api/drizzle api/drizzle
USER node
VOLUME ["/data"]
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "api/dist/index.js"]
