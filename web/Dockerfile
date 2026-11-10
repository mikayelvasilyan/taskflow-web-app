# TaskFlow web (static build served by nginx, proxying /api and /docs to the API).
# Build from the repository root:
#   docker build -f web/Dockerfile -t taskflow-web .

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --workspace web --include-workspace-root=false --no-audit --no-fund
COPY web/ web/
RUN npm run build --workspace web

FROM nginx:1.27-alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
