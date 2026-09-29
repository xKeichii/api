# Express TypeScript API

REST API starter built with Express 5 and TypeScript.

## Requirements

- Node.js 20 or newer
- npm

## Getting started

```bash
npm install
```

For direct development without Docker, provide the required environment variables to the Node.js process and apply the database schema in `migrations/001_create_auth_tables.sql`, then start the development server:

```bash
npm run dev
```

The API listens on `http://localhost:3000` by default.

## API Documentation

Human-readable instructions with ready-to-run PowerShell requests are in [`docs/API.md`](docs/API.md). The complete OpenAPI 3.1 specification, including request and response schemas, validation constraints, status codes, and Bearer JWT security, is in [`docs/openapi.yaml`](docs/openapi.yaml). The server URL for local development is `http://localhost:3000/api`.

## Docker

For an isolated local setup, create the private Docker environment file and run:

```powershell
Copy-Item .env.local.example .env.local
```

```bash
docker compose --env-file .env.local up --build
```

This starts the API and a local MariaDB container. The database schema is applied automatically when the database volume is first initialized; its data persists in the `mariadb_data` volume. The API is available at `http://localhost:3000`, and MariaDB is available to host tools on port `3307` by default. Stop the containers with `docker compose down`; this keeps database data. To delete the local database data as well, use `docker compose down -v`.

The `.env.local.example` credentials are only for local development. Change them before use outside your machine. Never commit `.env.local` or use production database credentials in a local test stack.

To run only the API container against your existing remote MariaDB, create `.env.remote` and fill it with the server connection values:

```powershell
Copy-Item .env.remote.example .env.remote
```

```bash
docker compose --env-file .env.remote -f docker-compose.remote.yml up --build
```

Apply the SQL migration in `migrations/001_create_auth_tables.sql` to the remote database first. The API container then uses the same database and data as your server. Ensure its firewall and database grants permit connections from your Docker host. Do not expose the database publicly just to make Docker connect; use a private network or VPN where possible. The local Compose setup creates a separate database with separate data; it does not copy or synchronize the server database.

`.env.local` and `.env.remote` are separate, ignored files. The local Compose command reads only `.env.local`; the remote Compose command reads only `.env.remote`. Your existing `.env` file is not used or changed by either Docker command.

## Authentication API

- `POST /api/auth/register` accepts `{ "email", "password", "displayName" }` and returns `201` with the created user. Passwords are stored as bcrypt hashes.
- `POST /api/auth/login` accepts `{ "email", "password" }` and returns a JWT, its `expiresAt` timestamp, and the user profile.
- `POST /api/auth/logout` requires `Authorization: Bearer <token>` and revokes that session in MariaDB.
- `GET /api/auth/me` requires a bearer token and returns the current profile.
- `PATCH /api/auth/me` requires a bearer token and accepts `displayName` and/or `bio`. Email is read-only.

Registration constraints: valid email, password of 8-72 UTF-8 bytes, and display name of 1-80 characters. The profile description is limited to 280 characters. Validation errors return `400`, duplicate email returns `409`, and invalid or revoked credentials return `401`.

The JWT secret and database credentials are read from environment variables. Private `.env` files are excluded from version control; never put real credentials in an example env file or commit a private env file.

## Scripts

- `npm run dev` starts the API with reload on changes.
- `npm run build` compiles TypeScript into `dist/`.
- `npm start` runs the compiled API.
- `npm test` runs the API tests.

## Structure

```text
src/
	app.ts
	server.ts
	controllers/   HTTP request handlers
	middleware/    auth, logging, not-found, and error handling
	routes/        API route definitions
	services/      application logic and database access
	types/         shared application types
migrations/     MariaDB schema
```