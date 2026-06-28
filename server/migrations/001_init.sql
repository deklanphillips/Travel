-- Initial schema for the budgeting app.
--
-- PII note: we deliberately do NOT store bank login credentials or full account
-- numbers. Plaid holds those. The only sensitive secret here is the Plaid
-- access_token, stored ENCRYPTED in plaid_items.access_token_encrypted.

CREATE TABLE IF NOT EXISTS plaid_items (
  id                       SERIAL PRIMARY KEY,
  -- Plaid's identifier for the linked institution login ("Item").
  item_id                  TEXT NOT NULL UNIQUE,
  institution_name         TEXT,
  -- AES-256-GCM encrypted Plaid access_token. Never stored in plaintext.
  access_token_encrypted   TEXT NOT NULL,
  -- Cursor for Plaid's incremental /transactions/sync endpoint.
  transactions_cursor      TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id                 SERIAL PRIMARY KEY,
  item_id            INTEGER NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  plaid_account_id   TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  -- Last 2-4 digits Plaid exposes for display only; not a full account number.
  mask               TEXT,
  type               TEXT,
  subtype            TEXT,
  current_balance    NUMERIC(14, 2),
  iso_currency_code  TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  -- Optional monthly budget target for this category.
  monthly_budget NUMERIC(14, 2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id                    SERIAL PRIMARY KEY,
  plaid_transaction_id  TEXT NOT NULL UNIQUE,
  account_id            INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  category_id           INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  -- Positive = money out, negative = money in (Plaid's sign convention).
  amount                NUMERIC(14, 2) NOT NULL,
  iso_currency_code     TEXT,
  name                  TEXT,
  merchant_name         TEXT,
  -- Plaid's own category suggestion, kept for auto-categorization later.
  plaid_category        TEXT,
  pending               BOOLEAN NOT NULL DEFAULT false,
  date                  DATE NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);

-- Seed a few sensible default budget categories.
INSERT INTO categories (name) VALUES
  ('Groceries'),
  ('Dining'),
  ('Transport'),
  ('Housing'),
  ('Utilities'),
  ('Entertainment'),
  ('Income'),
  ('Uncategorized')
ON CONFLICT (name) DO NOTHING;
