import { Router } from 'express';
import { query } from '../lib/db.js';

export const categoriesRouter = Router();

/** List budget categories with their monthly targets. */
categoriesRouter.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, name, monthly_budget FROM categories ORDER BY name',
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/** Create a new budget category. */
categoriesRouter.post('/', async (req, res, next) => {
  try {
    const { name, monthly_budget } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const { rows } = await query(
      `INSERT INTO categories (name, monthly_budget) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET monthly_budget = EXCLUDED.monthly_budget
       RETURNING id, name, monthly_budget`,
      [name, monthly_budget ?? null],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/** Update a category's monthly budget target. */
categoriesRouter.patch('/:id', async (req, res, next) => {
  try {
    const { monthly_budget } = req.body ?? {};
    await query('UPDATE categories SET monthly_budget = $1 WHERE id = $2', [
      monthly_budget ?? null,
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
