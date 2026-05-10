# syntax=docker/dockerfile:1.4
# =============================================================================
# auth-hub — Multi-stage Dockerfile
# =============================================================================
# Build from service directory:
#
#   cd auth-hub/
#   docker build -t auth-hub .
#
# @brainwave-project/core is now a published npm package (@brainwave-project/core@^1.2.0)
# =============================================================================

# ---- Stage 1: Production dependencies ----
FROM node:20-alpine AS deps

ARG GITHUB_TOKEN

WORKDIR /app

COPY .npmrc package*.json ./
RUN GITHUB_TOKEN=$GITHUB_TOKEN npm ci --omit=dev


# ---- Stage 2: Build (TypeScript → JavaScript) ----
FROM node:20-alpine AS builder

ARG GITHUB_TOKEN

WORKDIR /app

COPY .npmrc package*.json ./
COPY tsconfig.json ./
RUN GITHUB_TOKEN=$GITHUB_TOKEN npm ci

COPY src/ ./src/
COPY *.proto ./

RUN npm run build


# ---- Stage 3: Runtime image ----
FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 appuser

COPY --from=deps    --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --chown=appuser:nodejs *.proto ./
COPY --chown=appuser:nodejs package.json ./

USER appuser

EXPOSE 3000 50051

CMD ["node", "dist/index.js"]
