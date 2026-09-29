# Express TypeScript API

REST API starter built with Express 5 and TypeScript.

## Requirements

- Node.js 20 or newer
- npm

## Getting started

```bash
npm install
```

Copy `.env.example` to `.env`, then start the development server:

```bash
npm run dev
```

The API listens on `http://localhost:3000` by default. Check `GET /api/health` for a health response.

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
	middleware/    logging, not-found, and error handling
	routes/        API route definitions
	services/      application logic
	types/         shared application types
```