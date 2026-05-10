# auth-hub

Centralized identity management service for the Brainwave platform. Acts as a facade for Keycloak with JWT-based security and zero-trust internal gRPC calls.

## Responsibilities

- User login / logout via Keycloak password grant
- Token refresh and validation
- gRPC server for internal service-to-service auth checks
- Health and metrics endpoints

## Tech Stack

- Node.js 20 + TypeScript + Express
- Keycloak (OIDC provider)
- gRPC (internal communication)
- `@brainwave-project/core` (shared domain types)

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login with username + password |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout and revoke token |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |
| GET | `/docs` | Swagger UI |

## Development

```bash
cp .env.example .env
npm install
npm run dev
```

## Docker

```bash
docker build -t auth-hub .
docker run -p 3000:3000 --env-file .env auth-hub
```

## CI/CD

On push to `main`, GitHub Actions builds and pushes the image to:
```
ghcr.io/brainwave-project/brainwave-auth-hub:latest
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default: 3000) |
| `GRPC_PORT` | gRPC port (default: 50051) |
| `KEYCLOAK_BASE_URL` | Keycloak server URL |
| `KEYCLOAK_REALM` | Keycloak realm name |
| `KEYCLOAK_CLIENT_ID` | Client ID for this service |
| `KEYCLOAK_CLIENT_SECRET` | Client secret |
| `DB_HOST` | PostgreSQL host |
| `DB_USER` | PostgreSQL user |
| `DB_PASS` | PostgreSQL password |
