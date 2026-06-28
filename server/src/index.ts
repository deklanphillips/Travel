import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { plaidRouter } from './routes/plaid.js';
import { accountsRouter } from './routes/accounts.js';
import { transactionsRouter } from './routes/transactions.js';
import { categoriesRouter } from './routes/categories.js';

const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/plaid', plaidRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);

// Centralized error handler. We log server-side but never leak internals (or
// any Plaid error detail that might contain sensitive context) to the client.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  },
);

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
  console.log(`Plaid environment: ${config.plaid.env}`);
});
