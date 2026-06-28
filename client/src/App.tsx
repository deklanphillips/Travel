import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import {
  api,
  type Account,
  type Category,
  type Transaction,
} from './api.js';

export function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<string>('');

  const refresh = useCallback(async () => {
    const [a, t, c] = await Promise.all([
      api.getAccounts(),
      api.getTransactions(),
      api.getCategories(),
    ]);
    setAccounts(a);
    setTransactions(t);
    setCategories(c);
  }, []);

  useEffect(() => {
    refresh().catch((e) => setStatus(String(e)));
  }, [refresh]);

  return (
    <div className="app">
      <header>
        <h1>Budget</h1>
        <ConnectBank
          onLinked={async () => {
            setStatus('Syncing accounts and transactions…');
            await api.refreshAccounts();
            await api.syncTransactions();
            await refresh();
            setStatus('');
          }}
          onStatus={setStatus}
        />
      </header>

      {status && <p className="status">{status}</p>}

      <section>
        <h2>Accounts</h2>
        {accounts.length === 0 ? (
          <p className="muted">No accounts linked yet.</p>
        ) : (
          <ul className="accounts">
            {accounts.map((a) => (
              <li key={a.id}>
                <span>
                  {a.institution_name ? `${a.institution_name} · ` : ''}
                  {a.name}
                  {a.mask ? ` ••${a.mask}` : ''}
                </span>
                <strong>
                  {a.current_balance != null
                    ? formatMoney(a.current_balance, a.iso_currency_code)
                    : '—'}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="row">
          <h2>Transactions</h2>
          <button
            onClick={async () => {
              setStatus('Syncing…');
              await api.syncTransactions();
              await refresh();
              setStatus('');
            }}
          >
            Sync
          </button>
        </div>
        {transactions.length === 0 ? (
          <p className="muted">No transactions yet. Link a bank and sync.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th className="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>
                    {t.merchant_name ?? t.name}
                    {t.pending && <span className="pending"> pending</span>}
                  </td>
                  <td>
                    <select
                      value={t.category_id ?? ''}
                      onChange={async (e) => {
                        const value = e.target.value
                          ? Number(e.target.value)
                          : null;
                        await api.setTransactionCategory(t.id, value);
                        await refresh();
                      }}
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="right">
                    {formatMoney(t.amount, t.iso_currency_code)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function ConnectBank({
  onLinked,
  onStatus,
}: {
  onLinked: () => Promise<void>;
  onStatus: (s: string) => void;
}) {
  const [linkToken, setLinkToken] = useState<string | null>(null);

  const startLink = async () => {
    try {
      const { link_token } = await api.createLinkToken();
      setLinkToken(link_token);
    } catch (e) {
      onStatus(String(e));
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: async (publicToken, metadata) => {
      await api.exchangePublicToken(publicToken, metadata.institution ?? null);
      setLinkToken(null);
      await onLinked();
    },
  });

  // Open Plaid Link automatically once we have a token and the SDK is ready.
  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  return <button onClick={startLink}>Connect a bank</button>;
}

function formatMoney(amount: string, currency: string | null): string {
  const n = Number(amount);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency ?? 'USD',
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}
