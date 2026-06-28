import { Router } from 'express';
import { plaidClient } from '../lib/plaid.js';
import { decrypt } from '../lib/crypto.js';
import { query } from '../lib/db.js';

export const transactionsRouter = Router();

/** List synced transactions, most recent first. */
transactionsRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT t.id, t.amount, t.iso_currency_code, t.name, t.merchant_name,
              t.plaid_category, t.pending, t.date,
              t.category_id, c.name AS category_name,
              a.name AS account_name
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         LEFT JOIN accounts a ON a.id = t.account_id
        ORDER BY t.date DESC, t.id DESC
        LIMIT 500`,
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/** Assign a budget category to a transaction. */
transactionsRouter.patch('/:id/category', async (req, res, next) => {
  try {
    const { category_id } = req.body ?? {};
    await query('UPDATE transactions SET category_id = $1 WHERE id = $2', [
      category_id ?? null,
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * Pull the latest transactions from Plaid for every linked Item using the
 * incremental /transactions/sync endpoint, and upsert them locally.
 */
transactionsRouter.post('/sync', async (_req, res, next) => {
  try {
    const items = await query<{
      id: number;
      access_token_encrypted: string;
      transactions_cursor: string | null;
    }>('SELECT id, access_token_encrypted, transactions_cursor FROM plaid_items');

    let added = 0;
    let modified = 0;
    let removed = 0;

    for (const item of items.rows) {
      const accessToken = decrypt(item.access_token_encrypted);
      let cursor = item.transactions_cursor ?? undefined;
      let hasMore = true;

      while (hasMore) {
        const resp = await plaidClient.transactionsSync({
          access_token: accessToken,
          cursor,
        });
        const data = resp.data;

        for (const txn of [...data.added, ...data.modified]) {
          // Map Plaid's account id to our local account row.
          const acct = await query<{ id: number }>(
            'SELECT id FROM accounts WHERE plaid_account_id = $1',
            [txn.account_id],
          );
          await query(
            `INSERT INTO transactions
               (plaid_transaction_id, account_id, amount, iso_currency_code,
                name, merchant_name, plaid_category, pending, date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (plaid_transaction_id) DO UPDATE SET
               amount = EXCLUDED.amount,
               name = EXCLUDED.name,
               merchant_name = EXCLUDED.merchant_name,
               pending = EXCLUDED.pending,
               date = EXCLUDED.date`,
            [
              txn.transaction_id,
              acct.rows[0]?.id ?? null,
              txn.amount,
              txn.iso_currency_code ?? null,
              txn.name,
              txn.merchant_name ?? null,
              txn.personal_finance_category?.primary ?? null,
              txn.pending,
              txn.date,
            ],
          );
        }
        added += data.added.length;
        modified += data.modified.length;

        for (const removedTxn of data.removed) {
          await query(
            'DELETE FROM transactions WHERE plaid_transaction_id = $1',
            [removedTxn.transaction_id],
          );
        }
        removed += data.removed.length;

        cursor = data.next_cursor;
        hasMore = data.has_more;
      }

      await query(
        'UPDATE plaid_items SET transactions_cursor = $1 WHERE id = $2',
        [cursor ?? null, item.id],
      );
    }

    res.json({ ok: true, added, modified, removed });
  } catch (err) {
    next(err);
  }
});
