import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5432/budget',
  // Validated lazily by the crypto module so `key:gen` can run without it.
  encryptionKey: process.env.APP_ENCRYPTION_KEY ?? '',
  plaid: {
    clientId: required('PLAID_CLIENT_ID'),
    secret: required('PLAID_SECRET'),
    env: (process.env.PLAID_ENV ?? 'sandbox') as
      | 'sandbox'
      | 'development'
      | 'production',
    products: (process.env.PLAID_PRODUCTS ?? 'transactions').split(','),
    countryCodes: (process.env.PLAID_COUNTRY_CODES ?? 'US').split(','),
  },
};
