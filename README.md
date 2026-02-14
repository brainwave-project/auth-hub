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