# Single-image deploy (e.g. Render): the API also serves the built web app.
#   docker build -t taskflow .
#   docker run -p 4000:4000 -e JWT_SECRET=<long random string> taskflow

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --include-workspace-root=false --workspaces --no-audit --no-fund
COPY api/ api/
COPY web/ web/
RUN npm run build --workspace api && npm run build --workspace web

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_URL=file:/data/taskflow.db \
    SERVE_WEB_DIR=/app/web/dist
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --workspace api --include-workspace-root=false --omit=dev --no-audit --no-fund \
    && npm cache clean --force \
    && mkdir -p /data && chown node:node /data
COPY --from=build /app/api/dist api/dist
COPY api/drizzle api/drizzle
COPY --from=build /app/web/dist web/dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "api/dist/index.js"]
