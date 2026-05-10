# =============================================================================
# auth-hub — Multi-stage Dockerfile
# =============================================================================
# Must be built from the monorepo root (brainwave/) — not from auth-hub/:
#
#   cd brainwave/
#   docker build -t auth-hub -f auth-hub/Dockerfile .
#
# Reason: @brainwave-project/core is a file:../core local dependency.
# The build context must include core/ so npm can resolve it at /core.
# =============================================================================

# ---- Stage 1: Production dependencies ----
FROM node:20-alpine AS deps

WORKDIR /app

# Place core at /core so npm resolves file:../core from /app
COPY core/ /core/
COPY auth-hub/package*.json ./
RUN npm ci --omit=dev


# ---- Stage 2: Build (TypeScript → JavaScript) ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY core/ /core/
COPY auth-hub/package*.json ./
COPY auth-hub/tsconfig.json ./
RUN npm ci

COPY auth-hub/src/ ./src/
COPY auth-hub/*.proto ./

RUN npm run build


# ---- Stage 3: Runtime image ----
FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 appuser

COPY --from=deps    --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --chown=appuser:nodejs auth-hub/*.proto ./
COPY --chown=appuser:nodejs auth-hub/package.json ./

USER appuser

EXPOSE 3000 50051

CMD ["node", "dist/index.js"]
