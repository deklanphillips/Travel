# Budget — personal budgeting app with Plaid

A personal budgeting app that connects to real bank accounts through
[Plaid](https://plaid.com), pulls in transactions, and lets you organize them
into budget categories.

## Architecture

```
client/   React + Vite + TypeScript frontend (Plaid Link UI)
server/   Node + Express + TypeScript API (Plaid SDK, Postgres)
```

A backend is **required**: Plaid's `public_token` → `access_token` exchange and
all account/transaction calls must happen server-side. The `access_token` is the
most sensitive secret in the system, so it is **encrypted at rest** with
AES-256-GCM before it ever touches the database.

## PII & security model

- **No raw bank credentials or full account numbers are ever stored.** Plaid
  holds those; we only hold a Plaid `access_token` per linked institution.
- **`access_token` is encrypted** (AES-256-GCM, field-level) with a key from
  `APP_ENCRYPTION_KEY`. A stolen database dump alone cannot be used to call Plaid.
- **Secrets live in `.env`** (gitignored). Never commit real Plaid keys.
- **Minimize stored PII**: only transactions/accounts needed for budgeting.
- Use TLS to Postgres and serve the API over HTTPS in production.

## Getting started

### 1. Prerequisites

- Node 20+
- Postgres 14+ (running locally or a connection string)
- A free [Plaid developer account](https://dashboard.plaid.com/signup) for
  sandbox API keys.

### 2. Server

```bash
cd server
cp .env.example .env        # then fill in PLAID_* and APP_ENCRYPTION_KEY
npm install
npm run key:gen             # prints a fresh APP_ENCRYPTION_KEY to paste in .env
npm run migrate             # create database tables
npm run dev                 # starts API on http://localhost:4000
```

### 3. Client

```bash
cd client
npm install
npm run dev                 # starts UI on http://localhost:5173
```

Open the UI, click **Connect a bank**, and use Plaid's sandbox credentials
(`user_good` / `pass_good`) to link a test institution.

## API overview

| Method | Route                              | Purpose                                  |
|--------|------------------------------------|------------------------------------------|
| POST   | `/api/plaid/create_link_token`     | Get a Link token to open Plaid Link       |
| POST   | `/api/plaid/exchange_public_token` | Exchange + store encrypted access token   |
| GET    | `/api/accounts`                    | List linked accounts                      |
| GET    | `/api/transactions`                | List synced transactions                  |
| POST   | `/api/transactions/sync`           | Pull latest transactions from Plaid       |
| GET    | `/api/categories`                  | List budget categories                    |

> **Note:** this scaffold has no end-user auth yet — it operates as a single
> local user. Add authentication before deploying anywhere real.
