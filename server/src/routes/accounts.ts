import { Router } from 'express';
import { plaidClient } from '../lib/plaid.js';
import { decrypt } from '../lib/crypto.js';
import { query } from '../lib/db.js';

export const accountsRouter = Router();

/** List linked accounts with their last-known balances. */
accountsRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT a.id, a.name, a.mask, a.type, a.subtype,
              a.current_balance, a.iso_currency_code,
              i.institution_name
         FROM accounts a
         JOIN plaid_items i ON i.id = a.item_id
        ORDER BY i.institution_name, a.name`,
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * Refresh account metadata + balances from Plaid for every linked Item and
 * upsert them locally. Safe to call after linking a new bank.
 */
accountsRouter.post('/refresh', async (_req, res, next) => {
  try {
    const items = await query<{ id: number; access_token_encrypted: string }>(
      'SELECT id, access_token_encrypted FROM plaid_items',
    );

    let count = 0;
    for (const item of items.rows) {
      const accessToken = decrypt(item.access_token_encrypted);
      const resp = await plaidClient.accountsGet({ access_token: accessToken });

      for (const acct of resp.data.accounts) {
        await query(
          `INSERT INTO accounts
             (item_id, plaid_account_id, name, mask, type, subtype,
              current_balance, iso_currency_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (plaid_account_id) DO UPDATE SET
             name = EXCLUDED.name,
             current_balance = EXCLUDED.current_balance,
             iso_currency_code = EXCLUDED.iso_currency_code`,
          [
            item.id,
            acct.account_id,
            acct.name,
            acct.mask ?? null,
            acct.type,
            acct.subtype ?? null,
            acct.balances.current ?? null,
            acct.balances.iso_currency_code ?? null,
          ],
        );
        count += 1;
      }
    }

    res.json({ ok: true, accounts: count });
  } catch (err) {
    next(err);
  }
});
