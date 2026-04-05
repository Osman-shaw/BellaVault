# BellaVault

Web app and API for tracking gold-related operations: deals, purchases, sales, partners, borrows, reports, operating cash (**Vault**), and optional **phone-based sign-in** for Sierra Leone mobile numbers.

## Repository layout

| Area | Stack | Path |
|------|--------|------|
| Frontend | Next.js (App Router), TypeScript | `frontend/` |
| Backend | Express, Mongoose (MongoDB), JWT auth | `backend/` |

Key frontend areas:

- `frontend/src/app` — routes (e.g. `/`, `/vault`, `/entities`, `/auth/*`)
- `frontend/src/screens` — feature screens
- `frontend/src/services/apiService.ts` — API client
- `frontend/src/navigations` — main nav
- `frontend/src/state` — session + RBAC helpers

Key backend areas:

- `backend/src/routes` — HTTP routes mounted under `/api`
- `backend/src/controllers` — request handlers
- `backend/src/model` — Mongoose models
- `backend/src/services` — domain logic (auth, vault, market, etc.)
- `backend/src/config` — env, validation (Zod), RBAC

## Prerequisites

- Node.js (LTS recommended)
- MongoDB (local or hosted)

## Configuration (do not commit secrets)

1. Copy `backend/.env.example` to `backend/.env`.
2. Set variables **only** in `backend/.env` (and optional frontend env files). **Never commit** real `.env` files or paste live secrets into the README.

### Backend environment variables

| Variable | Purpose |
|----------|---------|
| `PORT` | API listen port (default `4000`). |
| `MONGODB_URI` | MongoDB connection string. **Keep private.** |
| `JWT_SECRET` | Secret used to sign JWT access/refresh tokens. **Use a long random value in production; never share it.** |
| `RATE_LIMIT_WINDOW_MS` | API rate-limit window in milliseconds. |
| `RATE_LIMIT_MAX` | Max requests per window per client. |
| `NODE_ENV` | `development` / `production` (affects OTP-in-response behavior below). |
| `AUTH_RETURN_OTP_IN_RESPONSE` | Optional. Controls whether phone OTP codes are included in JSON responses for testing. **Do not enable in production unless you fully understand the risk** (codes would be exposed to anyone who can call the API). |
| `GOLDAPI_API_KEY` | Optional. **Secret.** API key from [GoldAPI](https://www.goldapi.io/) (served via `app.goldapi.net`). Used only on the server for live precious-metal spots (XAU, XAG, XPT, XPD in USD). **Never expose in the frontend or in git.** |
| `GOLDAPI_BASE_URL` | Optional. Defaults to `https://app.goldapi.net`. Override only if your plan uses another HTTPS base documented by the provider. |

### Frontend environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Optional. Base URL for the API (must include `/api` path if your API is mounted there), e.g. `http://localhost:4000/api`. If unset, the app defaults to `http://localhost:4000/api`. |

## Install and run (development)

From `backend/`:

```bash
npm install
npm run dev
```

From `frontend/`:

```bash
npm install
npm run dev
```

Typical URLs:

- Frontend: `http://localhost:3000` (or the port Next.js prints if 3000 is busy)
- Backend: `http://localhost:4000` — health: `GET http://localhost:4000/api/health`

Ensure MongoDB is running and `MONGODB_URI` in `backend/.env` points to your database.

## Docker (production-like)

1. Provide `backend/.env` (same rules as above; no secrets in git).
2. From the repo root (if `docker-compose.yml` is present):

```bash
docker compose up --build -d
```

```bash
docker compose down
```

## Authentication and roles

### Email and password

- Register with email, strong password, and role.
- Email verification is required before password login (in development the API may return a verification token for testing — treat that as sensitive).
- JWT **access** token (short-lived) and **refresh** token (longer-lived); refresh rotates on use; logout revokes the refresh session.

### Sierra Leone phone (Orange, Africell, QCell)

- Alternative to email/password: **register** or **sign in** using a validated Sierra Leone mobile number (normalized to country code `232` with allowlisted operator prefixes).
- Flow: request a one-time code, then verify with a 6-digit code.
- **SMS is not wired in this codebase** — you must integrate a provider for production. In non-production environments, the API may return a `devOtp` field when policy allows (see `AUTH_RETURN_OTP_IN_RESPONSE` / `NODE_ENV`). **Never rely on dev OTP exposure in production.**

### RBAC (high level)

Roles: `admin`, `secretary`, `associate_director`. Permissions are checked on the backend; the frontend mirrors them for UI (e.g. hiding create buttons).

- **Guests** (not logged in) can read selected resources where the API allows public access (e.g. live market, vault summary, movements, read-only lists for deals/partners/purchases/sales/borrows as configured).

Backend authorization uses the JWT; the `x-user-role` header described in older docs is not the source of truth for security — the token is.

## Documented product features

### Vault (operating cash)

- **Purpose:** Single **cash balance** intended as “money available to buy and sell gold,” with an **append-only style movement log** (each line has delta, balance after, label, timestamp).
- **Automatic updates:**
  - Creating a **gold purchase** deducts `buyingPrice` from the vault (blocked if that would make the balance negative).
  - Updating a purchase adjusts the vault by the change in `buyingPrice`.
  - Deleting a purchase restores the deducted `buyingPrice`.
  - Creating a **sale** adds `amountReceived` to the vault (zero is allowed).
  - Updating a sale adjusts by the change in `amountReceived` (large decreases can be allowed even if balance goes negative, to mirror reversing recorded inflows).
  - Deleting a sale reverses the recorded `amountReceived`.
- **Manual deposits:** Admin and secretary can **add cash** via the Vault screen (authenticated API).
- **Visibility:** Vault **balance** and **recent movements** are readable by **visitors and logged-in users** (public read permission on the API for those endpoints).
- **UI:** `/vault` in the app nav; home banner links to Vault; balance polling refreshes periodically.

API (all under `/api` prefix on the server):

- `GET /vault` — current balance and currency metadata.
- `GET /vault/movements?limit=` — recent movements (capped server-side).
- `POST /vault/deposit` — authenticated; admin/secretary; body: amount (+ optional note).

### Partners — capital and profits ledger

- Per **partner (entity)**, you can record ledger lines with **date/time**, **money invested**, **money received / profits**, and derived **running totals** (total capital and remaining balance as defined in the UI).
- API: nested under entities, e.g. `GET/POST /entities/:entityId/ledger`, `DELETE` for a line (permissions apply).
- UI: **Partners** screen — partner selector, form for new rows, table of history.

### Live market (home)

- **`GET /api/market/live`** returns a JSON bundle for the home page. **No API keys are sent to the browser.**
- **Precious metals (GoldAPI):** When `GOLDAPI_API_KEY` is set in `backend/.env`, the server calls GoldAPI’s real-time endpoint pattern  
  `GET {GOLDAPI_BASE_URL}/price/{METAL}/{CURRENCY}?x-api-key=…`  
  for **XAU, XAG, XPT, XPD** vs **USD** (gold, silver, platinum, palladium spots).
- **Without `GOLDAPI_API_KEY`:** gold falls back to a **public** Yahoo-style quote (`GC=F`); silver/platinum/palladium tiles are omitted.
- **Forex and indices (no GoldAPI key required):** **EUR/USD**, **S&P 500**, and **NASDAQ** are loaded server-side from the same **public** quote feed as before (no secret).
- The response includes `metalsSource` (`goldapi` | `yahoo` | `unavailable`) so the UI can explain the data source.

### Other modules (existing)

- **Deals** — linked to partners and commodities, totals and payment status.
- **Purchases / sales** — gold buy/sell records (also drive Vault as above).
- **Borrows** — cash borrow tracking.
- **Reports** — aggregated reporting over purchases/sales.
- **RBAC-gated** create/update/delete on sensitive modules per role.

## API validation and limits

- Request bodies for many routes are validated with **Zod** (`backend/src/config/validation.js`).
- Global **rate limiting** applies to the API (`backend/src/middleware/rateLimiter.js`).

## Security reminders

- Rotate **`JWT_SECRET`** if it is ever leaked.
- Treat **`MONGODB_URI`** as confidential (credentials in the URL).
- Do not enable **`AUTH_RETURN_OTP_IN_RESPONSE`** in production unless you have a compelling reason and understand you are exposing OTPs in API responses.
- Prefer HTTPS and secure cookie/storage practices when deploying the frontend.

## Troubleshooting (frontend / Windows)

- **SWC native binary:** The frontend `package.json` dev/build scripts set `NEXT_DISABLE_SWC_NATIVE=1` so the toolchain can fall back on Windows.
- **`Cannot find module '@swc/helpers-…/_interop_require_default'` (dev):** That path comes from **Turbopack** (see `[turbopack]_runtime.js` in the stack). The app is configured to use **webpack** in dev (`IS_WEBPACK_TEST=1`, `next dev --webpack`, Next invoked via `node …/next/dist/bin/next` so flags are not dropped). From `frontend/`, run **`npm run dev`** (not plain `next dev`). If the error persists, run **`npm run dev:fresh`** once (clears `.next` then starts webpack dev). If you have a user/system **`TURBOPACK`** or **`IS_TURBOPACK_TEST`** variable set, remove it so it does not force Turbopack.
