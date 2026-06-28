// Thin API client for the backend. All requests go same-origin via the Vite
// dev proxy (/api -> http://localhost:4000).

export interface Account {
  id: number;
  name: string;
  mask: string | null;
  type: string | null;
  subtype: string | null;
  current_balance: string | null;
  iso_currency_code: string | null;
  institution_name: string | null;
}

export interface Transaction {
  id: number;
  amount: string;
  iso_currency_code: string | null;
  name: string | null;
  merchant_name: string | null;
  plaid_category: string | null;
  pending: boolean;
  date: string;
  category_id: number | null;
  category_name: string | null;
  account_name: string | null;
}

export interface Category {
  id: number;
  name: string;
  monthly_budget: string | null;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  createLinkToken: () =>
    fetch('/api/plaid/create_link_token', { method: 'POST' }).then(
      json<{ link_token: string }>,
    ),

  exchangePublicToken: (
    public_token: string,
    institution: { name?: string } | null,
  ) =>
    fetch('/api/plaid/exchange_public_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_token, institution }),
    }).then(json<{ ok: boolean; item_id: string }>),

  getAccounts: () => fetch('/api/accounts').then(json<Account[]>),
  refreshAccounts: () =>
    fetch('/api/accounts/refresh', { method: 'POST' }).then(json),

  getTransactions: () =>
    fetch('/api/transactions').then(json<Transaction[]>),
  syncTransactions: () =>
    fetch('/api/transactions/sync', { method: 'POST' }).then(json),
  setTransactionCategory: (id: number, category_id: number | null) =>
    fetch(`/api/transactions/${id}/category`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id }),
    }).then(json),

  getCategories: () => fetch('/api/categories').then(json<Category[]>),
};
