import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/coin-market.css';
import { MANGAMUKAI_API } from '../config/api';
import { MANGAMUKAI_COIN_3D_ICON } from '../components/common/MangaDetailIcons';
import { useTheme } from '../hooks/useTheme';
import { getStoredToken, refreshUser } from '../services/authService';

interface CoinPack {
  id: string;
  coins: number;
  price: number;
  /** Etiqueta opcional: solo la llevan los paquetes destacados. */
  tag?: string;
}

const COIN_PACKS: CoinPack[] = [
  { id: 'c500', coins: 500, price: 5 },
  { id: 'c1000', coins: 1000, price: 10 },
  { id: 'c1500', coins: 1500, price: 15 },
  { id: 'c2500', coins: 2500, price: 25 },
  { id: 'c5000', coins: 5000, price: 50 },
  { id: 'promo10000', coins: 10000, price: 80, tag: 'Super promo' },
];

type PaymentMethod = 'paypal' | 'card';

/**
 * Métodos de cobro. La tarjeta ya está cableada de punta a punta (selector,
 * despacho y estado); solo hay que poner `enabled: true` cuando la pasarela
 * exista. Mientras haya uno solo activo, el selector no se dibuja para no
 * dejar controles muertos en pantalla.
 */
const PAYMENT_METHODS: Array<{ id: PaymentMethod; label: string; enabled: boolean }> = [
  { id: 'paypal', label: 'PayPal', enabled: true },
  { id: 'card', label: 'Tarjeta', enabled: false },
];

const AVAILABLE_METHODS = PAYMENT_METHODS.filter((method) => method.enabled);

const formatCoins = (value: number) => value.toLocaleString('es-PE');

/** Los paquetes grandes muestran una pila más alta. */
const stackSize = (index: number) => Math.min(5, 3 + Math.floor(index / 2));

export const CoinMarketPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [method, setMethod] = useState<PaymentMethod>(AVAILABLE_METHODS[0]?.id ?? 'paypal');
  const [pendingPack, setPendingPack] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/auth/login', { replace: true, state: { returnTo: '/recargar' } });
      return;
    }
    void refreshUser();
  }, [navigate]);

  /** Pide la URL de pago al backend y manda al usuario a la pasarela. */
  const requestCheckoutUrl = async (pack: CoinPack, paymentMethod: PaymentMethod) => {
    const token = getStoredToken();
    if (!token) {
      navigate('/auth/login', { state: { returnTo: '/recargar' } });
      return;
    }

    const response = await fetch(`${MANGAMUKAI_API}/buy-coins`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: pack.coins, cost: pack.price, method: paymentMethod, _token: token }),
    });
    const data = await response.json();

    if (data.success && data.url) {
      window.location.href = data.url;
      return;
    }
    setError(data.message || 'No se pudo generar el pago.');
  };

  const buy = async (pack: CoinPack) => {
    if (pendingPack !== null) return;
    setPendingPack(pack.id);
    setError('');
    try {
      await refreshUser();
      if (method === 'card') {
        // Cuando la pasarela de tarjeta esté lista, este método usa el mismo
        // contrato que PayPal: /buy-coins devuelve la URL a la que redirigir.
        setError('El pago con tarjeta todavía no está disponible.');
        return;
      }
      await requestCheckoutUrl(pack, method);
    } catch {
      setError('No pudimos conectar con la pasarela de pago. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      setPendingPack(null);
    }
  };

  return (
    <main className="coin-market-page coin-recharge" data-theme={isLight ? 'light' : 'dark'}>
      <div className="coin-recharge__content">
        <header className="coin-recharge__header">
          <h1 className="coin-recharge__title">Recargar <span>Monedas</span></h1>
          <p className="coin-recharge__subtitle">No dejes de disfrutar del mejor contenido de mangas</p>
        </header>

        {AVAILABLE_METHODS.length > 1 && (
          <div className="coin-recharge__methods" role="radiogroup" aria-label="Método de pago">
            {AVAILABLE_METHODS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={method === option.id}
                onClick={() => setMethod(option.id)}
                className="coin-recharge__method"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <div className="coin-recharge__packs">
          {COIN_PACKS.map((pack, index) => {
            const isPending = pendingPack === pack.id;
            return (
              <article key={pack.id} className={`coin-pack${pack.tag ? ' coin-pack--featured' : ''}`}>
                <span className="coin-pack__stack" data-coins={stackSize(index)} aria-hidden="true">
                  {Array.from({ length: stackSize(index) }, (_, position) => (
                    <img key={position} src={MANGAMUKAI_COIN_3D_ICON} alt="" decoding="async" draggable={false} />
                  ))}
                </span>

                <span className="coin-pack__info">
                  {pack.tag && <span className="coin-pack__tag">{pack.tag}</span>}
                  <span className="coin-pack__amount coin-market-number">{formatCoins(pack.coins)}</span>
                </span>

                <span className="coin-pack__checkout">
                  <span className="coin-pack__price coin-market-number">${pack.price.toFixed(2)}</span>
                  <button
                    type="button"
                    className="coin-pack__buy"
                    onClick={() => void buy(pack)}
                    disabled={pendingPack !== null}
                    aria-busy={isPending}
                    aria-label={`Comprar ${formatCoins(pack.coins)} monedas por ${pack.price.toFixed(2)} dólares`}
                  >
                    {isPending ? 'Conectando…' : 'Comprar'}
                  </button>
                </span>
              </article>
            );
          })}
        </div>

        {error && <p role="alert" className="coin-recharge__error">{error}</p>}
      </div>
    </main>
  );
};

export default CoinMarketPage;
