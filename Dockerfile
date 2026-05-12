# Two-stage build:
#  1) builder — pulls Node, installs deps, runs Vite + PWA build → dist/
#  2) runtime — copies dist/ into nginx:alpine. Final image is ~12 MB.
# Caching: the COPY of package*.json before the install step keeps the
# layer cache valid as long as deps don't change, so most rebuilds skip
# the npm step entirely.

# ---- builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy lockfile first so the dep-install layer is cacheable.
COPY package.json package-lock.json ./
RUN npm ci

# Then the source.
COPY . .
RUN npm run build

# ---- runtime ----
FROM nginx:alpine AS runtime

# PWA-aware cache headers: hashed assets get a 1-year immutable cache,
# index.html / sw.js stay fresh so service-worker updates land.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Built site.
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx:alpine listens on 80 by default.
EXPOSE 80

# Image health: nginx is fronted by Caddy, which handles TLS + proxying.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/ || exit 1
