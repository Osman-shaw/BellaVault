Error: Failed to load SWC binary for win32/x64, see more info here: https://nextjs.org/docs/messages/failed-loading-swc
[1]     at ignore-listed frames
[1] 
[1] npm error Lifecycle script `dev` failed with error:
[1] npm error code 1
[1] npm error path D:\BellaVault\frontend
[1] npm error workspace frontend@1.0.0
[1] npm error location D:\BellaVault\frontend
[1] npm error command failed
[1] npm error command C:\Windows\system32\cmd.exe # BellaVault (Web + API)

Converted from mobile architecture into a clean split codebase:

- frontend: Next.js web application
- backend: Express + Mongoose API

## Structure

- frontend/src/components
- frontend/src/services
- frontend/src/screens
- frontend/src/assets
- frontend/src/navigations
- backend/src/config
- backend/src/model
- backend/src/controllers
- backend/src/services
- backend/src/routes
- backend/src/server

## Run

1. Install dependencies at root:
   - npm install
2. Create backend env file:
   - copy backend/.env.example backend/.env
3. Start both apps:
   - npm run dev

Frontend runs on `http://localhost:3000` and backend on `http://localhost:4000`.

## Added Features

- Frontend create forms for partners and deals (`frontend/src/screens`)
- Backend schema validation with Zod middleware (`backend/src/config/validation.js`)
- Global API rate limiting (`backend/src/middleware/rateLimiter.js`)
- Dockerized production setup for frontend, backend, and MongoDB (`docker-compose.yml`)
- RBAC with 3 roles: `admin`, `secretary`, `associate_director`
- Responsive UI layout for mobile, tablet, and desktop
- Public home page with live market tiles (Gold, Forex, S&P 500, NASDAQ)
- Auth flow with register/login using JWT and role-based access for write operations

## Docker (Production-like)

1. Ensure `backend/.env` exists (you can copy from `.env.example`)
2. Build and run:
   - `docker compose up --build -d`
3. Stop:
   - `docker compose down`

## RBAC

Backend expects role in request header:

- `x-user-role: admin`
- `x-user-role: secretary`
- `x-user-role: associate_director`

Frontend uses register/login and sends `Authorization: Bearer <token>` plus role metadata for protected APIs.

## Public Home + Auth Gating

- `/` is public and shows live market data.
- Visitors can browse the home page without logging in.
- Guests can read deals and partners in read-only mode.
- Users must login/register and verify email before they can create, update, or delete records.

## Auth Lifecycle

- Strong password policy is enforced on registration.
- Registration returns a verification token in dev mode; verify via `/auth/verify-email`.
- Login issues short-lived access token + refresh token.
- `/api/auth/refresh` rotates refresh tokens.
- `/api/auth/logout` invalidates refresh token sessions.
