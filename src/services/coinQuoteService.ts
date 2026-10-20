import { MANGAMUKAI_API } from '../config/api';

export interface PaymentQuote {
  pack: string;
  price_pen: number;
  rate: number;
  date: string;
  expires: number;
  token: string;
}

const quotes = new Map<string, { until: number; promise: Promise<PaymentQuote> }>();
let fallbackRate: Promise<{ rate: number; date: string }> | undefined;
let fallbackUntil = 0;

function getFallbackRate() {
  if (!fallbackRate || Date.now() >= fallbackUntil) {
    fallbackUntil = Date.now() + 3600000;
    fallbackRate = (async () => {
      const response = await fetch('https://api.frankfurter.dev/v2/rate/USD/PEN', { signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      const date = Date.parse(data.date);
      if (!response.ok || data.base !== 'USD' || data.quote !== 'PEN' || !Number.isFinite(data.rate) || data.rate <= 0 || !Number.isFinite(date) || date < Date.now() - 7 * 86400000 || date > Date.now() + 86400000) {
        throw new Error('No se pudo consultar el tipo de cambio. Inténtalo nuevamente.');
      }
      return { rate: data.rate as number, date: data.date as string };
    })().catch((error: unknown) => { fallbackRate = undefined; throw error; });
  }
  return fallbackRate;
}

export function getCoinQuote(pack: { id: string; price: number }): Promise<PaymentQuote> {
  const key = `${pack.id}:${pack.price}`;
  const cached = quotes.get(key);
  if (cached && cached.until > Date.now()) return cached.promise;
  const promise = (async (): Promise<PaymentQuote> => {
    const response = await fetch(`${MANGAMUKAI_API}/coin-quote?pack=${encodeURIComponent(pack.id)}`, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
    if (response.status === 404) {
      const rate = await getFallbackRate();

      return {
        pack: pack.id,
        price_pen: (Math.ceil(Math.round(pack.price * rate.rate * 1e8) / 1e8 - 0.90) * 100 + 90) / 100,
        ...rate,
        expires: Date.now() / 1000 + 86400,
        token: '',
      };
    }
    const data = await response.json();
    if (!response.ok || data.pack !== pack.id || !Number.isFinite(data.price_pen) || data.price_pen <= 0 || !data.token || !Number.isFinite(data.expires) || data.expires <= Date.now() / 1000) {
      throw new Error('No se pudo consultar el tipo de cambio. Inténtalo nuevamente.');
    }
    const entry = quotes.get(key);
    if (entry) entry.until = Math.min(entry.until, data.expires * 1000);
    return data;
  })().catch((error: unknown) => { quotes.delete(key); throw error; });
  quotes.set(key, { until: Date.now() + 3600000, promise });
  return promise;
}
