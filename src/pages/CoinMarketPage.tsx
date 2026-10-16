import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CircleCheck, Send, ReceiptText, UploadCloud, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/coin-market.css';
import { MANGAMUKAI_API } from '../config/api';
import { getStoredToken, refreshUser } from '../services/authService';
import saleIcon from '../assets/recharge/icon-0.svg';
import coins50 from '../assets/recharge/icon-1.svg';
import coins1000 from '../assets/recharge/icon-2.svg';
import coins1500 from '../assets/recharge/icon-3.svg';
import coins2500 from '../assets/recharge/icon-4.svg';
import coins5000 from '../assets/recharge/icon-5.svg';
import coins10000 from '../assets/recharge/icon-6.svg';
import paypalIcon from '../assets/recharge/icon-7.svg';
import plinIcon from '../assets/recharge/icon-8.svg';
import receiptIcon from '../assets/recharge/icon-9.svg';
import yapeIcon from '../assets/recharge/icon-10.svg';
import transferIcon from '../assets/recharge/icon-11.svg';

interface CoinPack {
  id: string;
  coins: number;
  price: number;
  image: string;
  sale?: boolean;
}

const COIN_PACKS: CoinPack[] = [
  { id: 'c50', coins: 50, price: 5, image: coins50 },
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
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const WALLET_QR: Record<'yape' | 'plin', string> = {
  yape: import.meta.env.VITE_YAPE_QR_URL?.trim() || '',
  plin: import.meta.env.VITE_PLIN_QR_URL?.trim() || '',
};

export const CoinMarketPage = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState<PaymentMethod>('yape');
  const [selectedPackId, setSelectedPackId] = useState('c1000');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [receiptSent, setReceiptSent] = useState(false);
  const receiptInput = useRef<HTMLInputElement>(null);
  const pack = COIN_PACKS.find((option) => option.id === selectedPackId) || COIN_PACKS[1];


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
    setSelectedPackId(id);
    setError('');
    resetReceipt();
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
    if (pending || method === 'transfer' || (method !== 'paypal' && (!receipt || receiptSent))) return;
    const token = getStoredToken();
    if (!token) {
      navigate('/auth/login', { state: { returnTo: '/recargar' } });
      return;
    }
    setPending(true);
    setError('');
    try {
      if ((method === 'yape' || method === 'plin') && receipt) {
        const body = new FormData();
        body.append('receipt', receipt);
        body.append('pack', pack.id);
        body.append('method', method);
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
        navigate('/auth/login', { state: { returnTo: '/recargar' } });
        return;
      }
      const response = await fetch(`${MANGAMUKAI_API}/buy-coins`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({ amount: pack.coins, cost: pack.price, method: 'paypal', _token: currentToken }),
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
    <main className="coin-market-page coin-recharge">
      <div className="coin-recharge__content">
        <h1 className="coin-recharge__title">Recargar <span>Monedas</span></h1>
        <div className="coin-recharge__layout">
          <section className="coin-recharge__packs" aria-label="Paquetes de monedas" role="radiogroup">
            {COIN_PACKS.map((option) => (
              <label key={option.id} className="coin-pack">
                <input type="radio" name="coin-pack" value={option.id} checked={pack.id === option.id} disabled={pending} onChange={() => selectPack(option.id)} />
                <span className="coin-pack__name">{option.coins} Monedas</span>
                <img className="coin-pack__art" src={option.image} alt="" />
                <span className="coin-pack__price">$ {option.price.toFixed(2)}</span>
                {option.sale && <img className="coin-pack__sale" src={saleIcon} alt="Oferta" />}
              </label>
            ))}
          </section>
          <aside className="coin-checkout" aria-labelledby="coin-checkout-heading">
            <h2 id="coin-checkout-heading">Orden de Compra</h2>
            <div className="coin-checkout__summary" aria-live="polite">
              <span>{pack.coins} Monedas</span><strong>$ {pack.price.toFixed(2)}</strong>
            </div>
            <fieldset className="coin-checkout__payments" disabled={pending}>
              <legend>Métodos de Pago</legend>
              <div className="coin-recharge__methods">
                {PAYMENT_METHODS.map((option) => (
                  <label key={option.id} className={`coin-recharge__method coin-recharge__method--${option.id}`}>
                    <input type="radio" name="payment-method" value={option.id} checked={method === option.id} onChange={() => { setMethod(option.id); setError(''); resetReceipt(); }} aria-label={option.label} />
                    <img src={option.image} alt={option.id === 'transfer' ? '' : option.label} />
                    {option.id === 'transfer' && <span>Transfer</span>}
                  </label>
                ))}
              </div>
            </fieldset>
            {(method === 'yape' || method === 'plin') && (
              <div className="coin-wallet">
                <div className={`coin-wallet__card coin-wallet__card--${method}`}>
                  <h3>Recarga con {method === 'plin' ? 'Plin' : 'Yape'}</h3>
                  {WALLET_QR[method]
                    ? <img className="coin-wallet__qr" src={WALLET_QR[method]} alt={`Código QR de pago con ${method === 'plin' ? 'Plin' : 'Yape'}`} width="174" height="174" />
                    : <div className="coin-wallet__brand" aria-hidden="true">{method === 'plin' ? 'plin' : 'yape'}</div>}
                  <span>Recarga con {method === 'plin' ? 'Plin' : 'Yape'}</span>
                  <strong>{PAYMENT_PHONE}</strong>
                </div>
                <div className="coin-wallet__receipt">
                  <h3 className="coin-wallet__receipt-title">
                    <img src={receiptIcon} alt="" width="29" height="29" />
                    Tu comprobante de {method === 'plin' ? 'Plin' : 'Yape'}
                  </h3>
                  <input className="coin-wallet__file-input" ref={receiptInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} aria-label="Seleccionar imagen del comprobante" onChange={(event) => attachReceipt(event.target.files?.[0])} />
                  <div className="coin-wallet__actions">
                    <button className="coin-wallet__upload" type="button" disabled={pending} onClick={() => receiptInput.current?.click()}>
                      <UploadCloud size={19} />{receipt ? 'Cambiar imagen' : 'Subir comprobante'}
                    </button>
                    <button className="coin-checkout__submit" type="button" onClick={() => void checkout()} disabled={pending || !receipt || receiptSent} aria-busy={pending}>
                      <Send size={17} />{pending ? 'Enviando…' : receiptSent ? 'Enviado' : 'Enviar imagen'}
                    </button>
                  </div>
                  <p className="coin-checkout__note">JPG, PNG o WebP · hasta 5 MB</p>
                  {receipt && <div className="coin-wallet__attachment">
                    {receiptPreview ? <img src={receiptPreview} alt="Vista previa del comprobante" /> : <ReceiptText size={26} />}
                    <span>{receipt.name}</span>
                    <button type="button" disabled={pending} onClick={resetReceipt} aria-label="Quitar comprobante"><X size={16} /></button>
                  </div>}
                </div>
              </div>
            )}
            {method === 'paypal' && <div className="coin-checkout__online">
              <p className="coin-checkout__note">Continúa a PayPal para completar tu compra.</p>
              <button className="coin-checkout__submit" type="button" onClick={() => void checkout()} disabled={pending} aria-busy={pending}>
                {pending ? 'Conectando…' : 'Pagar con PayPal'}<ArrowRight size={17} />
              </button>
            </div>}
            {method === 'transfer' && <p className="coin-checkout__note coin-checkout__online" role="status">Las transferencias estarán disponibles cuando se configure la cuenta bancaria.</p>}
            {error && <p role="alert" className="coin-recharge__error">{error}</p>}
            {receiptSent && <p className="coin-wallet__success" role="status"><CircleCheck size={18} />Comprobante enviado. Revisaremos tu pago para acreditar las monedas.</p>}
          </aside>
        </div>
      </div>
    </main>
  );
};

export default CoinMarketPage;
