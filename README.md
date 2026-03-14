# AuthHub

AuthHub is a Node.js microservice responsible for authentication, user identity management, and integration with Keycloak. It is designed to be cloud-native and container-friendly for seamless deployment and development.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Docker & Dev Container](#docker--dev-container)
- [CI/CD](#cicd)
- [Commit Conventions](#commit-conventions)
- [License](#license)

---

## Overview

AuthHub handles:

- User registration and login
- Token issuance (JWT / OAuth2)
- Role-based access control
- Integration with Keycloak (via infra stack)
- User identity lifecycle management

It separates authentication concerns from business logic, ensuring a modular and maintainable architecture.

---

## Features

- REST API for authentication
- Secure password hashing
- Session and token management
- Role-based access control
- Cloud-native and containerized
- Ready for CI/CD automation

---

## Tech Stack

- **Node.js** v20 (LTS)
- **Express.js**
- **PostgreSQL** (for user persistence)
- **Docker & Dev Containers**
- **Keycloak** (identity provider)

---

## Getting Started

Clone the repository:

```bash
git clone <repo-url> authhub
cd authhub

### Install Dependencies

```bash
npm install
```

---

## Configuration

Environment variables are handled via `.env` and `config` files.

Example `.env`:

```
NODE_ENV=development
DATABASE_URL=postgres://user:password@localhost:5432/core_db
PORT=3000
```

Core loads config from:

* `config.dev.ts` → `NODE_ENV=development`
* `config.prod.ts` → `NODE_ENV=production`

> Secrets and sensitive information should never be committed. Use environment variables or a vault for production.

---

## Running Locally

Start the development server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Lint & format:

```bash
npm run lint
npm run format
```

---

## Testing with Keycloak

When Keycloak runs (e.g. from your `infra/keycloak` docker-compose on port 8080), you can test the auth flow.

### 1. Start Keycloak

From your solution folder (e.g. `brainwave/infra/keycloak`):

```bash
docker compose up -d
```

Keycloak: **http://localhost:8080**  
Admin: `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` from docker-compose (e.g. `admin` / `admin`).

### 2. Create client in Keycloak

1. Open **http://localhost:8080/admin** → sign in.
2. Select realm **master** (or create a realm and use it in `KEYCLOAK_REALM`).
3. **Clients** → **Create client**:
   - **Client ID:** `auth-hub` (must match `KEYCLOAK_CLIENT_ID`).
   - **Client type:** OpenID Connect.
   - **Next** → Capability config:
     - **Client authentication:** ON (confidential) if you want to use `KEYCLOAK_CLIENT_SECRET`; OFF for public client.
     - **Authorization:** OFF.
     - **Authentication flow:** ✅ Standard flow, ✅ Direct access grants (for password login).
   - **Next** → Login settings:
     - **Root URL:** `http://localhost:3000`
     - **Valid redirect URIs:** `http://localhost:3000/api/auth/callback`
     - **Valid post logout redirect URIs:** `http://localhost:3000`
     - **Web origins:** `http://localhost:3000` or `*`
   - **Save**.
4. If confidential: **Clients** → **auth-hub** → **Credentials** → copy **Client secret** into `.env.development` as `KEYCLOAK_CLIENT_SECRET`.

### 3. Create a test user (for direct login)

1. **Users** → **Add user**:
   - **Username:** `testuser`
   - **Email:** (optional)
   - **Create**.
2. Open the user → **Credentials** → **Set password** (e.g. `testpass`), turn off **Temporary**.

### 4. Run AuthHub and test

```bash
# From auth-hub folder
npm run dev
```

- **Direct login (password grant):**
  ```bash
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"testpass"}'
  ```
- **OIDC redirect:** Open in browser (or use `redirect: true` from your app):
  `http://localhost:8080/realms/master/protocol/openid-connect/auth?client_id=auth-hub&redirect_uri=http://localhost:3000/api/auth/callback&response_type=code&scope=openid`
- **Refresh:** Use `refresh_token` from login response in `POST /api/auth/refresh` body.

Env for this setup: `.env.development` with `KEYCLOAK_BASE_URL=http://localhost:8080`, `KEYCLOAK_REALM=master`, `KEYCLOAK_CLIENT_ID=auth-hub`, `KEYCLOAK_REDIRECT_BASE_URL=http://localhost:3000`. If AuthHub runs elsewhere, change the redirect URLs in Keycloak and `KEYCLOAK_REDIRECT_BASE_URL` to match.

---

## Docker

Build and run Core using Docker:

```bash
docker build -t core-service .
docker run -p 3000:3000 --env-file .env core-service
```


## CI/CD & Release

* GitHub Actions workflow: `.github/workflows/release.yml`
* Semantic Release handles automatic versioning and GitHub releases based on **Conventional Commits**
* Make commits using the pattern:

```
feat: new feature → minor version bump
fix: bug fix → patch version bump
feat!: breaking change → major version bump
```

> Only commits following this pattern trigger a release.

---

## Project Structure

```
core/             
├─ .eslintrc
├─ .prettierrc
├─ package.json
├─ tsconfig.json
├─ release.config.cjs
└─ README.md
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make commits using **Conventional Commits**
4. Push the branch and create a pull request
5. Ensure tests pass and linting is clean

---