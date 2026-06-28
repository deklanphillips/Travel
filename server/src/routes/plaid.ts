import { Router } from 'express';
import { plaidClient, plaidProducts, plaidCountryCodes } from '../lib/plaid.js';
import { encrypt } from '../lib/crypto.js';
import { query } from '../lib/db.js';

export const plaidRouter = Router();

/**
 * Create a Link token used by the frontend to open Plaid Link.
 * No secrets are returned to the client beyond this short-lived token.
 */
plaidRouter.post('/create_link_token', async (_req, res, next) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'local-user' }, // single-user scaffold
      client_name: 'Budget',
      products: plaidProducts,
      country_codes: plaidCountryCodes,
      language: 'en',
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    next(err);
  }
});

/**
 * Exchange the public_token (from Plaid Link) for a long-lived access_token,
 * encrypt it, and persist the Item. The access_token never leaves the server.
 */
plaidRouter.post('/exchange_public_token', async (req, res, next) => {
  try {
    const { public_token, institution } = req.body ?? {};
    if (!public_token) {
      return res.status(400).json({ error: 'public_token is required' });
    }

    const exchange = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    await query(
      `INSERT INTO plaid_items (item_id, institution_name, access_token_encrypted)
       VALUES ($1, $2, $3)
       ON CONFLICT (item_id) DO UPDATE
         SET access_token_encrypted = EXCLUDED.access_token_encrypted`,
      [itemId, institution?.name ?? null, encrypt(accessToken)],
    );

    res.json({ ok: true, item_id: itemId });
  } catch (err) {
    next(err);
  }
});
