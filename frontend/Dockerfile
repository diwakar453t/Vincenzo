# ═══════════════════════════════════════════════════════════════════════
# PreSkool ERP — Frontend Dockerfile (Multi-stage)
# Build: Node → Production: Nginx
# ═══════════════════════════════════════════════════════════════════════

# ── Stage 1: Dependencies ─────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Copy package files first (layer cache)
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline


# ── Stage 2: Builder ──────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy deps from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for API URL (configurable at build time)
ARG VITE_API_URL=http://localhost:8000/api/v1
ENV VITE_API_URL=${VITE_API_URL}

# Build production bundle (skip tsc — CI handles type-checking separately)
RUN npx vite build


# ── Stage 3: Production (Nginx) ──────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/preskool.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q --spider http://localhost:3000/ || exit 1

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
