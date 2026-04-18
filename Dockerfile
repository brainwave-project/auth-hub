# =============================================================================
# auth-hub — Multi-stage Dockerfile
# =============================================================================
# Stage 1 (deps)    — install production dependencies only
# Stage 2 (builder) — install all deps + compile TypeScript → dist/
# Stage 3 (runner)  — lean final image: prod node_modules + dist/ + non-root user
#
# Dev hot-reload:
#   compose.dev.yml bind-mounts the source and runs ts-node directly.
#   This Dockerfile is only used to build staging/prod images.
# =============================================================================

# ---- Stage 1: Production dependencies ----
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

# Install production deps only — this layer is cached unless package.json changes
RUN npm ci --omit=dev


# ---- Stage 2: Build (TypeScript → JavaScript) ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

# Install ALL deps (including devDeps: typescript, ts-node, @types/*)
RUN npm ci

COPY src/ ./src/
COPY *.proto ./

# Compile TypeScript → dist/
RUN npm run build


# ---- Stage 3: Runtime image ----
FROM node:20-alpine AS runner

WORKDIR /app

# Run as non-root user — principle of least privilege
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 appuser

# Copy production node_modules from deps stage (no devDependencies)
COPY --from=deps    --chown=appuser:nodejs /app/node_modules ./node_modules

# Copy compiled output from builder stage
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist

# Copy proto files (loaded at runtime by @grpc/proto-loader)
COPY --chown=appuser:nodejs *.proto ./

# Copy package.json for version info and "type": "module" resolution
COPY --chown=appuser:nodejs package.json ./

USER appuser

EXPOSE 3000 50051

# Runs the compiled JavaScript — no TypeScript toolchain in the final image
CMD ["node", "dist/index.js"]
