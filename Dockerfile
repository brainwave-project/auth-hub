# =============================================================================
# auth-hub — Multi-stage Dockerfile
# =============================================================================

# ---- Stage 1: Production dependencies ----
FROM node:20-alpine AS deps

ARG NPM_TOKEN

WORKDIR /app

COPY package*.json ./
RUN echo "@brainwave-project:registry=https://npm.pkg.github.com/" > .npmrc \
 && echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" >> .npmrc \
 && npm ci --omit=dev \
 && rm .npmrc


# ---- Stage 2: Build ----
FROM node:20-alpine AS builder

ARG NPM_TOKEN

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN echo "@brainwave-project:registry=https://npm.pkg.github.com/" > .npmrc \
 && echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" >> .npmrc \
 && npm ci \
 && rm .npmrc

COPY src/ ./src/
COPY *.proto ./
RUN npm run build


# ---- Stage 3: Runtime ----
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
