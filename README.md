# auth-hub

Centralized identity management service for the Brainwave platform. Acts as a facade over Keycloak with a direct-grant login flow, OIDC callback support, JWT token refresh/logout, and a gRPC server for zero-trust internal token validation.

## Responsibilities

- User login / logout via Keycloak password grant or OIDC redirect flow
- Access token refresh and revocation
- gRPC server (`ValidateToken`) for service-to-service auth checks
- Kafka event emission on every material auth action
- Health, readiness, and Prometheus metrics endpoints

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript (ESM) |
| HTTP | Express 4 |
| Identity provider | Keycloak 24 (OIDC) |
| Internal transport | gRPC (`@grpc/grpc-js`) |
| Events | Kafka (`kafkajs`) |
| Observability | pino (structured JSON logs) · prom-client (metrics) |
| Shared library | `@brainwave-project/core` |

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login — direct grant (username + password) or OIDC redirect |
| POST | `/api/auth/logout` | Logout and revoke the refresh token in Keycloak |
| GET | `/api/auth/callback` | OIDC authorization code callback |
| POST | `/api/tokens/refresh` | Exchange a refresh token for a new access token |
| GET | `/api/health` | Liveness check |
| GET | `/health/live` | Liveness probe (Kubernetes-compatible) |
| GET | `/health/ready` | Readiness probe |
| GET | `/metrics` | Prometheus scrape endpoint |
| GET | `/api/docs` | Swagger UI |

## Kafka Events Emitted

| Topic | Action | Trigger |
|---|---|---|
| `brainwave.auth.events` | `LOGIN_SUCCESS` | Successful login |
| `brainwave.auth.events` | `LOGIN_FAILURE` | Failed login attempt |
| `brainwave.auth.events` | `LOGOUT` | Logout |
| `brainwave.auth.events` | `TOKEN_REFRESHED` | Token refresh |

Events are fire-and-forget — a Kafka outage never blocks auth responses.

## Development

```bash
cp .env.example .env        # fill in required values
npm install
npm run dev                 # tsx watch mode
```

## npm Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start with hot reload (`nodemon` + `tsx`) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run lint` | ESLint |

## Docker

```bash
docker build -t auth-hub .
docker run -p 3000:3000 -p 50051:50051 --env-file .env auth-hub
```

## CI/CD

On push to `main`, GitHub Actions builds the Docker image and pushes it to:
```
ghcr.io/brainwave-project/brainwave-auth-hub:latest
```
Semantic Release handles versioning via Conventional Commits.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP listen port |
| `GRPC_PORT` | No | `50051` | gRPC listen port |
| `SERVICE_NAME` | Yes | — | Service identifier (used in logs and traces) |
| `NODE_ENV` | Yes | `development` | `development` / `staging` / `production` |
| `DB_HOST` | Yes | — | PostgreSQL host |
| `DB_USER` | Yes | — | PostgreSQL user |
| `DB_PASS` | Yes | — | PostgreSQL password |
| `KEYCLOAK_BASE_URL` | Yes | — | Keycloak base URL (e.g. `http://keycloak:8080`) |
| `KEYCLOAK_REALM` | Yes | — | Keycloak realm (e.g. `brainwave`) |
| `KEYCLOAK_CLIENT_ID` | Yes | — | Keycloak client ID |
| `KEYCLOAK_CLIENT_SECRET` | No | — | Keycloak client secret |
| `KEYCLOAK_REDIRECT_BASE_URL` | No | — | Public base URL for OIDC redirect URIs |
| `KAFKA_BROKERS` | No | `kafka:9092` | Comma-separated Kafka broker list |
| `LOG_LEVEL` | No | `info` | `debug` / `info` / `warn` / `error` |

## License

MIT © Ahmad Awad
