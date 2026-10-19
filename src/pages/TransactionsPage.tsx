import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useExperienceUser } from '../hooks/useLocalExperience';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getTransactions, type AccountTransaction, type TransactionCategory, type TransactionPage } from '../services/transactionService';
import '../styles/transactions.css';

const categories: { id: TransactionCategory; label: string }[] = [
  { id: 'recharges', label: 'Recargas' },
  { id: 'purchases', label: 'Compras' },
  { id: 'chapters', label: 'Capítulos comprados' },
  { id: 'bonuses', label: 'Bonificaciones' },
];
const statuses = { completed: 'Completado', pending: 'Pendiente', cancelled: 'Cancelado', refunded: 'Reembolsado' };
const formatAmount = (item: AccountTransaction) => item.unit === 'coins'
  ? `${new Intl.NumberFormat('es-PE').format(item.amount)} monedas`
  : new Intl.NumberFormat('es-PE', { style: 'currency', currency: item.unit, currencyDisplay: 'code' }).format(item.amount);

export default function TransactionsPage() {
  const { signedIn, id } = useExperienceUser();
  const [query, setQuery] = useSearchParams();
  const category = categories.find(item => item.id === query.get('tipo')) ?? categories[0];
  const [result, setResult] = useState<TransactionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [cursor, setCursor] = useState<string>();
  useDocumentTitle('Transacciones');

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    if (!cursor) setResult(null);
    void getTransactions(category.id, { cursor, signal: controller.signal }).then(page => {
      if (controller.signal.aborted) return;
      setResult(previous => cursor && previous && page ? { ...page, items: [...previous.items, ...page.items] } : page);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [category.id, signedIn, id, cursor, attempt]);

  if (!signedIn) return <Navigate to="/auth/login" replace state={{ returnTo: `/transacciones?${query}` }} />;

  return <main className="transactions-page">
    <div className="transactions-shell">
      <header className="transactions-heading">
        <h1>Transacciones</h1>
      </header>
      <div className="transactions-categories" role="group" aria-label="Tipo de transacción">
        {categories.map(item => <button key={item.id} type="button" aria-pressed={category.id === item.id} aria-controls="transactions-history" onClick={() => {
          setCursor(undefined);
          setQuery({ tipo: item.id }, { replace: true });
        }}>
          <span>{item.label}</span>
        </button>)}
      </div>
      <section id="transactions-history" className="transactions-history" aria-labelledby="transactions-history-title" aria-busy={loading}>
        <header><h2 id="transactions-history-title">{category.label}</h2><span>Historial</span></header>
        {result && result.items.length > 0 && <ul className="transactions-list">
          {result.items.map(item => <li key={item.id}>
            <div><h3>{item.category === 'chapters' && item.status === 'completed' && item.chapterId ? <Link to={`/read/${encodeURIComponent(item.chapterId)}`}>{item.title}</Link> : item.title}</h3><time dateTime={item.createdAt}>{new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(item.createdAt))}</time></div>
            <div className="transactions-amount"><strong>{formatAmount(item)}</strong><span>{statuses[item.status]}</span></div>
          </li>)}
        </ul>}
        <div aria-live="polite">
          {loading ? <p className="transactions-empty" role="status">Cargando movimientos</p>
            : error ? <div className="transactions-empty"><p>No pudimos cargar tu historial.</p><button className="transactions-action" type="button" onClick={() => setAttempt(value => value + 1)}>Reintentar</button></div>
            : !result || result.items.length === 0 ? <p className="transactions-empty">Sin datos todavía</p> : null}
        </div>
        {!loading && !error && result?.nextCursor && <button className="transactions-action transactions-more" type="button" onClick={() => setCursor(result.nextCursor!)}>Ver más movimientos</button>}
      </section>
    </div>
  </main>;
}
