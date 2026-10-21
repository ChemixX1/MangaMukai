import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CircleCheck, ReceiptText, UploadCloud, X } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/coin-market.css';
import { MANGAMUKAI_API } from '../config/api';
import { getCoinQuote, type PaymentQuote } from '../services/coinQuoteService';
import { getStoredToken, refreshUser, startSubscriptionPayment } from '../services/authService';
import { PLANS } from '../data/subscriptionPlans';
import saleIcon from '../assets/recharge/icon-0.svg';
import coins50 from '../assets/recharge/icon-1.webp';
import coins1000 from '../assets/recharge/icon-2.webp';
import coins1500 from '../assets/recharge/icon-3.webp';
import coins2500 from '../assets/recharge/icon-4.webp';
import coins5000 from '../assets/recharge/icon-5.webp';
import coins10000 from '../assets/recharge/icon-6.webp';
import paypalIcon from '../assets/recharge/paypal-logo.webp';
import plinIcon from '../assets/recharge/plin-identico.webp';
import receiptIcon from '../assets/recharge/icon-9.svg';
import yapeIcon from '../assets/recharge/yape-identico.webp';
import transferIcon from '../assets/recharge/icon-11.svg';
import proLogo from '../assets/profile-icons/mukai-pro.svg';
import walletQr from '../assets/recharge/wallet-qr.svg';

interface CoinPack {
  id: string;
  coins: number;
  price: number;
  image: string;
  sale?: boolean;
}

const SUBSCRIPTION_PACKS: Record<string, CoinPack> = {
  monthly: { id: 'sub_monthly', coins: 0, price: PLANS.monthly.price, image: proLogo },
  yearly: { id: 'sub_yearly', coins: 0, price: PLANS.yearly.price, image: proLogo },
};

const COIN_PACKS: CoinPack[] = [
  { id: 'c50', coins: 500, price: 5, image: coins50 },
  { id: 'c1000', coins: 1000, price: 10, image: coins1000 },
  { id: 'c1500', coins: 1500, price: 15, image: coins1500, sale: true },
  { id: 'c2500', coins: 2500, price: 25, image: coins2500 },
  { id: 'c5000', coins: 5000, price: 50, image: coins5000 },
  { id: 'promo10000', coins: 10000, price: 80, image: coins10000 },
];

type PaymentMethod = 'paypal' | 'plin' | 'yape' | 'transfer';
const PAYMENT_METHODS = [
  { id: 'paypal', label: 'PayPal', image: paypalIcon },
  { id: 'plin', label: 'Plin', image: plinIcon },
  { id: 'yape', label: 'Yape', image: yapeIcon },
  { id: 'transfer', label: 'Transfer', image: transferIcon },
] as const;

const PAYMENT_PHONE = '998 996 963';
const BCP_ACCOUNT = '191-2345678-0-12';
const BCP_INTERBANK_ACCOUNT = '002-191-002345678012-34';
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const CopyPaymentNumber = ({ value, label }: { value: string; label: string }) => {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const timer = window.setTimeout(() => setStatus('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value.replace(/\D/g, ''));
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  };

  const description = status === 'copied' ? 'Número copiado' : status === 'error' ? 'No se pudo copiar. Vuelve a intentarlo.' : `Copiar ${label}`;

  return <button className="coin-copy" type="button" onClick={() => void copy()} aria-label={description} title={description}>
    {status === 'copied' ? <CircleCheck size={24} /> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path opacity="0.2" d="M22.2399 7.92001C22.2399 5.09001 22.2399 3.68001 21.3599 2.80001C20.4799 1.92001 19.0599 1.92001 16.2399 1.92001H10.7199C10.3165 1.94486 9.9222 2.05097 9.56079 2.23199C9.19938 2.41301 8.87828 2.6652 8.61677 2.97341C8.35526 3.28162 8.15872 3.6395 8.03897 4.02557C7.91922 4.41163 7.87873 4.81791 7.91991 5.22001L7.93991 5.66001C7.99556 6.41693 8.33604 7.12463 8.89273 7.64049C9.44942 8.15636 10.1809 8.44206 10.9399 8.44001L11.8499 8.51001C12.6999 8.58001 13.1299 8.61001 13.4799 8.73001C13.9413 8.88489 14.3582 9.14972 14.6944 9.50164C15.0306 9.85356 15.2762 10.282 15.4099 10.75C15.5099 11.11 15.5199 11.53 15.5499 12.38L15.5699 13.04L15.5999 13.61C15.6806 14.2974 15.9964 14.9358 16.494 15.417C16.9915 15.8981 17.6402 16.1924 18.3299 16.25L18.8999 16.26H19.4999C20.2033 16.1965 20.8617 15.8869 21.3592 15.3857C21.8568 14.8845 22.1616 14.2238 22.2199 13.52C22.2399 13.39 22.2399 13.24 22.2399 12.93V7.92001Z" fill="currentColor" />
      <path d="M4.75977 22.27H13.0998C14.7566 22.27 16.0998 20.9269 16.0998 19.27V10.93C16.0998 9.27316 14.7566 7.93002 13.0998 7.93002H4.75977C3.10291 7.93002 1.75977 9.27316 1.75977 10.93V19.27C1.75977 20.9269 3.10291 22.27 4.75977 22.27Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" />
      <path d="M16.3404 16.07C19.0704 16.07 20.4304 16.07 21.3004 15.25L21.4204 15.13C22.2404 14.27 22.2404 12.9 22.2404 10.18V7.73001V7.73C22.2404 4.90001 22.2404 3.49001 21.3604 2.61001C20.4804 1.73001 19.0604 1.73001 16.2404 1.73001H13.7504C11.0604 1.73001 9.72039 1.73001 8.85039 2.53001L8.70039 2.69001C7.90039 3.55001 7.90039 4.89001 7.90039 7.59001" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" />
    </svg>}
  </button>;
};

export const CoinMarketPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPaymentPage = /^\/(recargar|tienda|pro)\/pago$/.test(location.pathname.replace(/\/+$/, ''));
  const selectedPack = COIN_PACKS.find((option) => option.id === searchParams.get('paquete'));
  const isSubscription = location.pathname === '/pro/pago';
  const subscriptionPlan = ['yearly', 'pro'].includes(searchParams.get('plan') || '') ? 'yearly' : 'monthly';
  const subscriptionName = `Mukai Pro ${subscriptionPlan === 'yearly' ? 'anual' : 'mensual'}`;
  const pack = isSubscription ? SUBSCRIPTION_PACKS[subscriptionPlan] : selectedPack || COIN_PACKS[1];
  const rawMonto = Number(searchParams.get('monto'));
  const customAmount = !isSubscription && Number.isFinite(rawMonto) && rawMonto > 0 ? rawMonto : null;
  const effectivePrice = customAmount ?? pack.price;
  const method: PaymentMethod = PAYMENT_METHODS.find((option) => option.id === searchParams.get('metodo'))?.id || 'yape';
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [receiptSent, setReceiptSent] = useState(false);
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const needsSoles = isPaymentPage && method !== 'paypal';
  const currentQuote = quote?.pack === pack.id ? quote : null;
  const effectivePen = currentQuote
    ? customAmount
      ? Number((customAmount * (currentQuote.rate || currentQuote.price_pen / pack.price)).toFixed(2))
      : currentQuote.price_pen
    : null;
  const receiptInput = useRef<HTMLInputElement>(null);
  const checkoutHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {

    void Promise.allSettled(COIN_PACKS.map(getCoinQuote));
  }, []);

  useEffect(() => {
    let active = true;
    setQuoteError('');
    void getCoinQuote({ id: pack.id, price: pack.price }).then((data) => {
      if (active) setQuote(data);
    }).catch(() => {
      if (active) setQuoteError('No se pudo consultar el tipo de cambio. Inténtalo nuevamente.');
    });
    return () => { active = false; };
  }, [pack.id, pack.price, quoteAttempt]);

  useEffect(() => {
    if (isPaymentPage) checkoutHeading.current?.focus({ preventScroll: true });
  }, [isPaymentPage]);

  useEffect(() => {
    if (!receipt || !receipt.type.startsWith('image/')) {
      setReceiptPreview('');
      return;
    }
    const url = URL.createObjectURL(receipt);
    setReceiptPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receipt]);

  const resetReceipt = () => {
    setReceipt(null);
    setReceiptSent(false);
    if (receiptInput.current) receiptInput.current.value = '';
  };

  const selectPack = (id: string) => {
    setError('');
    resetReceipt();
    const params = new URLSearchParams({ paquete: id, metodo: method });
    navigate(`/recargar/pago?${params}`);
  };

  const selectMethod = (id: PaymentMethod) => {
    setError('');
    resetReceipt();
    const nextParams: Record<string, string> = { paquete: pack.id, metodo: id };
    if (isSubscription) nextParams.plan = subscriptionPlan;
    if (customAmount !== null) nextParams.monto = customAmount.toFixed(2);
    setSearchParams(nextParams, { replace: true, preventScrollReset: true });
  };

  const attachReceipt = (file?: File) => {
    setError('');
    resetReceipt();
    if (!file) return;
    if (!RECEIPT_TYPES.includes(file.type)) {
      setError('El comprobante debe ser una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size === 0 || file.size > MAX_RECEIPT_SIZE) {
      setError('Selecciona un comprobante válido de hasta 5 MB.');
      return;
    }
    setReceipt(file);
  };

  const checkout = async () => {
    if (pending || (method !== 'paypal' && (!receipt || receiptSent || !currentQuote?.token))) return;
    if (method !== 'paypal' && currentQuote && currentQuote.expires <= Date.now() / 1000) {
      setQuote(null);
      setQuoteError('La cotización venció. Consulta el importe actualizado antes de pagar.');
      return;
    }
    const returnParams: Record<string, string> = { paquete: pack.id, metodo: method };
    if (isSubscription) returnParams.plan = subscriptionPlan;
    if (customAmount !== null) returnParams.monto = customAmount.toFixed(2);
    const returnTo = `${isSubscription ? '/pro/pago' : '/recargar/pago'}?${new URLSearchParams(returnParams)}`;
    const token = getStoredToken();
    if (!token) {
      navigate('/auth/login', { state: { returnTo } });
      return;
    }
    setPending(true);
    setError('');
    try {
      if (method !== 'paypal' && receipt && currentQuote) {
        const body = new FormData();
        body.append('receipt', receipt);
        body.append('pack', pack.id);
        body.append('method', method);
        body.append('quote', currentQuote.token);
        body.append('_token', token);
        const response = await fetch(`${MANGAMUKAI_API}/coin-receipts`, {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
          body,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) {
          throw new Error(response.status === 404
            ? 'El envío de comprobantes aún no está habilitado. Inténtalo más tarde.'
            : data?.message || 'No se pudo enviar el comprobante. Inténtalo nuevamente.');
        }
        setReceiptSent(true);
        return;
      }
      await refreshUser();
      const currentToken = getStoredToken();
      if (!currentToken) {
        navigate('/auth/login', { state: { returnTo } });
        return;
      }
      if (isSubscription) {
        const result = await startSubscriptionPayment(subscriptionPlan);
        if (result.success && result.url) {
          window.location.href = result.url;
          return;
        }
        setError(result.message || 'No se pudo generar el pago de la suscripción.');
        return;
      }
      const response = await fetch(`${MANGAMUKAI_API}/buy-coins`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({ amount: pack.coins, cost: effectivePrice, method: 'paypal', _token: currentToken }),
      });
      const data = await response.json();
      if (response.ok && data.success && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.message || 'No se pudo generar el pago.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos conectar. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className={`coin-market-page coin-recharge${isPaymentPage ? ' coin-recharge--payment' : ''}`}>
      <div className="coin-recharge__content">
        {!isPaymentPage && <header className="coin-recharge__header">
          <h1 className="coin-recharge__title"><span className="coin-recharge__title-desktop">Recargar Monedas</span><span className="coin-recharge__title-mobile">Recarga</span></h1>
        </header>}
        <div className="coin-recharge__layout">
          {!isPaymentPage && <section className="coin-recharge__packs" aria-label="Paquetes de monedas">
            {COIN_PACKS.map((option) => (
              <button key={option.id} className="coin-pack" data-coins={option.coins} type="button" aria-pressed={pack.id === option.id} disabled={pending} onClick={() => selectPack(option.id)}>
                <span className="coin-pack__name">
                  <span className="coin-pack__amount">{option.coins.toLocaleString('es-PE')}</span>
                  <span className="coin-pack__unit">Monedas</span>
                </span>
                <img className="coin-pack__art" src={option.image} alt="" width="168" height="120" decoding="async" loading="eager" />
                <span className="coin-pack__price">
                  $ {option.price.toFixed(2)}
                  {option.sale && <img className="coin-pack__sale" src={saleIcon} alt="Oferta" />}
                </span>
              </button>
            ))}
          </section>}
          {isPaymentPage && <aside className="coin-checkout" aria-labelledby="coin-checkout-heading">
            <div className="coin-checkout__heading">
              <button
                className="coin-recharge__back"
                type="button"
                aria-label={isSubscription ? 'Volver a los planes' : customAmount !== null ? 'Volver a la tienda' : 'Volver a las monedas'}
                disabled={pending}
                onClick={() => navigate(isSubscription ? '/pro' : customAmount !== null ? '/tienda' : `/recargar?${new URLSearchParams({ paquete: pack.id, metodo: method })}`, { replace: true })}
              ><ArrowLeft size={20} /></button>
              <h1 id="coin-checkout-heading" ref={checkoutHeading} tabIndex={-1}>Orden de Compra</h1>
            </div>
            <div className="coin-checkout__summary" aria-live="polite">
              <span className="coin-checkout__product">
                <img src={pack.image} alt="" width="76" height="76" />
                <span>{isSubscription ? subscriptionName : customAmount !== null ? `Tienda Mukai ($ ${effectivePrice.toFixed(2)} USD)` : `${pack.coins} Monedas`}</span>
              </span>
              <strong>{method === 'paypal' ? `$ ${effectivePrice.toFixed(2)}` : effectivePen !== null ? `S/ ${effectivePen.toFixed(2)}` : `$ ${effectivePrice.toFixed(2)}`}</strong>
            </div>
            {needsSoles && !currentQuote && quoteError && <p className="coin-checkout__note" role="status">
              {quoteError} <button type="button" onClick={() => setQuoteAttempt((attempt) => attempt + 1)}>Reintentar</button>
            </p>}
            <fieldset className="coin-checkout__payments" disabled={pending}>
              <legend>Métodos de Pago</legend>
              <div className="coin-recharge__methods">
                {PAYMENT_METHODS.map((option) => (
                  <label key={option.id} className={`coin-recharge__method coin-recharge__method--${option.id}`}>
                    <input type="radio" name="payment-method" value={option.id} checked={method === option.id} onChange={() => selectMethod(option.id)} aria-label={option.label} />
                    <img src={option.image} alt={option.id === 'transfer' ? '' : option.label} width={option.id === 'transfer' ? 19 : 100} height={option.id === 'transfer' ? 19 : 43} loading="eager" decoding="async" />
                    {option.id === 'transfer' && <span>Transfer</span>}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className={`coin-checkout__details${method === 'yape' || method === 'plin' ? ' coin-checkout__details--wallet' : ''}`}>
            {(method === 'yape' || method === 'plin') && (
              <div className="coin-wallet">
                <div className={`coin-wallet__card coin-wallet__card--${method}`}>
                  <h3>{isSubscription ? 'Paga con' : 'Recarga con'} {method === 'plin' ? 'Plin' : 'Yape'}</h3>
                  <img className="coin-wallet__qr" src={walletQr} alt={`QR de ${method === 'plin' ? 'Plin' : 'Yape'}`} width="174" height="174" />
                  <span>{isSubscription ? 'Paga con' : 'Recarga con'} {method === 'plin' ? 'Plin' : 'Yape'}</span>
                  <div className="coin-wallet__number"><strong>{PAYMENT_PHONE}</strong><CopyPaymentNumber key={method} value={PAYMENT_PHONE} label={`número de ${method === 'plin' ? 'Plin' : 'Yape'}`} /></div>
                </div>
              </div>
            )}
            {method === 'transfer' && <div className="coin-transfer">
              <div className="coin-transfer__account">
                <h3>Cuenta Bancaria BCP</h3>
                <div className="coin-transfer__number"><p className="coin-market-number">{BCP_ACCOUNT}</p><CopyPaymentNumber value={BCP_ACCOUNT} label="cuenta bancaria BCP" /></div>
              </div>
              <div className="coin-transfer__account">
                <h3>Cuenta interbancaria</h3>
                <div className="coin-transfer__number"><p className="coin-market-number">{BCP_INTERBANK_ACCOUNT}</p><CopyPaymentNumber value={BCP_INTERBANK_ACCOUNT} label="cuenta interbancaria" /></div>
              </div>
            </div>}
            {method !== 'paypal' && <div className="coin-wallet__proof">
              <div className="coin-wallet__receipt">
              <div className="coin-wallet__receipt-header">
                <h3 className="coin-wallet__receipt-title">
                  <img src={receiptIcon} alt="" width="32" height="32" />
                  {method === 'transfer' ? 'Tu comprobante de transferencia' : `Tu comprobante de ${method === 'plin' ? 'Plin' : 'Yape'}`}
                </h3>
              </div>
              <input className="coin-wallet__file-input" ref={receiptInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} aria-label="Seleccionar imagen del comprobante" onChange={(event) => attachReceipt(event.target.files?.[0])} />
              <div className="coin-wallet__actions">
                <button className="coin-wallet__upload" type="button" disabled={pending} onClick={() => receiptInput.current?.click()}>
                  <UploadCloud size={19} />{receipt ? 'Cambiar imagen' : 'Subir comprobante'}
                </button>
              </div>
              {receipt && <div className="coin-wallet__attachment">
                {receiptPreview ? <img src={receiptPreview} alt="Vista previa del comprobante" /> : <ReceiptText size={26} />}
                <span>{receipt.name}</span>
                <button type="button" disabled={pending} onClick={resetReceipt} aria-label="Quitar comprobante"><X size={16} /></button>
              </div>}
              </div>
              {receipt && currentQuote && !currentQuote.token && <p className="coin-checkout__note" role="status">El envío de comprobantes está temporalmente fuera de servicio. Espera a que esté disponible antes de pagar.</p>}
              {receipt && <button className="coin-checkout__submit coin-wallet__send" type="button" onClick={() => void checkout()} disabled={pending || receiptSent || !currentQuote?.token} aria-busy={pending}>
                <svg width="18" height="18" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M26.3001 3.7C25.8626 3.2625 25.2313 3.125 24.6563 3.3375L3.5313 11.1187C2.9438 11.3312 2.5438 11.875 2.51255 12.5C2.47505 13.125 2.8188 13.7062 3.37505 13.9875L10.9188 17.7625L16.8376 11.8437L18.1626 13.1687L12.2438 19.0875L16.0188 26.6312C16.2813 27.1625 16.8251 27.4937 17.4126 27.4937H17.5001C18.1251 27.4562 18.6626 27.0562 18.8813 26.475L26.6626 5.34375C26.8751 4.76875 26.7376 4.1375 26.3001 3.7Z" fill="currentColor" />
                </svg>
                Enviar Comprobante
              </button>}
            </div>}
            {method === 'paypal' && <div className="coin-checkout__online">
              <button className="coin-checkout__paypal" type="button" onClick={() => void checkout()} disabled={pending} aria-busy={pending}>
                <span>Continuar con</span><img src={paypalIcon} alt="PayPal" width={88} height={24} loading="eager" decoding="async" />
              </button>
            </div>}
            </div>
            {error && <p role="alert" className="coin-recharge__error">{error}</p>}
            {receiptSent && <p className="coin-wallet__success" role="status"><CircleCheck size={18} />{isSubscription ? 'Comprobante enviado. Revisaremos tu pago para activar la suscripción.' : 'Comprobante enviado. Revisaremos tu pago para acreditar las monedas.'}</p>}
          </aside>}
        </div>
      </div>
    </main>
  );
};

export default CoinMarketPage;
