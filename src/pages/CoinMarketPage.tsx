import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CircleCheck, Download, Mail, ReceiptText, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/coin-market.css';
import { MANGAMUKAI_API } from '../config/api';
import { MANGAMUKAI_COIN_3D_ICON } from '../components/common/MangaDetailIcons';
import { useTheme } from '../hooks/useTheme';
import { getStoredToken, getStoredUser, refreshUser } from '../services/authService';
import yapeDemoQr from '../assets/shop/yape-demo-qr.svg';

interface CoinPack {
  id: string;
  coins: number;
  price: number;
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

type PaymentMethod = 'paypal' | 'yape';

const configuredYapeEmail = import.meta.env.VITE_YAPE_CONTACT_EMAIL?.trim() || '';
const YAPE_EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(configuredYapeEmail)
  ? configuredYapeEmail : 'recargas@example.com';
const YAPE_HAS_CONTACT = YAPE_EMAIL !== 'recargas@example.com';
const YAPE_DEMO_PHONE = '999 999 999';
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const formatCoins = (value: number) => value.toLocaleString('es-PE');
const formatPrice = (value: number) => `$${value.toFixed(2)}`;
const stackSize = (index: number) => Math.min(5, 3 + Math.floor(index / 2));

const toMailBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary).match(/.{1,76}/g)?.join('\r\n') || '';
};

// Create an email draft with a real attachment; downloading never sends the mail
// or credits coins. Manual review is independent of the existing PayPal API.
const downloadYapeDraft = async (pack: CoinPack, receipt: File) => {
  const user = getStoredUser();
  const boundary = `mukai-receipt-${crypto.randomUUID()}`;
  const message = [
    'Solicitud de recarga por Yape',
    '',
    `Usuario: ${user?.username || 'Completar usuario'}`,
    `Correo de la cuenta: ${user?.email || 'Completar correo'}`,
    `Paquete: ${formatCoins(pack.coins)} monedas`,
    `Precio de referencia: ${formatPrice(pack.price)} USD`,
    'Monto pagado en soles: completar',
    'Numero de operacion Yape: completar',
    '',
    'Adjunto el comprobante para revision manual.',
    'La solicitud no confirma el pago ni acredita monedas.',
    ...(!YAPE_HAS_CONTACT ? ['', 'IMPORTANTE: reemplazar el destinatario de ejemplo por el correo confirmado de MangaMukai antes de enviar.'] : []),
  ].join('\r\n');
  const attachment = toMailBase64(new Uint8Array(await receipt.arrayBuffer()));
  const body = toMailBase64(new TextEncoder().encode(message));
  const extension = receipt.type === 'application/pdf' ? 'pdf' : receipt.type.split('/')[1];
  const draft = [
    `To: ${YAPE_EMAIL}`,
    `Subject: Solicitud de recarga Yape - ${pack.coins} monedas`,
    'X-Unsent: 1',
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '', body,
    `--${boundary}`,
    `Content-Type: ${receipt.type}`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="comprobante-yape.${extension}"`,
    '', attachment,
    `--${boundary}--`,
    '',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([draft], { type: 'message/rfc822' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `solicitud-yape-${pack.id}.eml`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const CoinMarketPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [method, setMethod] = useState<PaymentMethod>('paypal');
  const [selectedPackId, setSelectedPackId] = useState('c1000');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const receiptInput = useRef<HTMLInputElement>(null);
  const pack = COIN_PACKS.find((option) => option.id === selectedPackId) || COIN_PACKS[1];

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/auth/login', { replace: true, state: { returnTo: '/recargar' } });
      return;
    }
    void refreshUser();
  }, [navigate]);

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
    setDraftReady(false);
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
      setError('El comprobante debe ser una imagen JPG, PNG, WebP o un archivo PDF.');
      return;
    }
    if (file.size === 0 || file.size > MAX_RECEIPT_SIZE) {
      setError('Selecciona un comprobante válido de hasta 5 MB.');
      return;
    }
    setReceipt(file);
  };

  const checkout = async () => {
    if (pending || (method === 'yape' && !receipt)) return;
    const token = getStoredToken();
    if (!token) {
      navigate('/auth/login', { state: { returnTo: '/recargar' } });
      return;
    }
    setPending(true);
    setError('');
    try {
      if (method === 'yape' && receipt) {
        await downloadYapeDraft(pack, receipt);
        setDraftReady(true);
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
    } catch {
      setError(method === 'yape'
        ? 'No pudimos preparar el comprobante. Vuelve a seleccionar el archivo e inténtalo otra vez.'
        : 'No pudimos conectar con PayPal. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="coin-market-page coin-recharge" data-theme={theme === 'light' ? 'light' : 'dark'}>
      <div className="coin-recharge__content">
        <header className="coin-recharge__header">
          <span className="coin-recharge__eyebrow">TU PRÓXIMA HISTORIA TE ESPERA</span>
          <h1 className="coin-recharge__title">Recargar <span>Monedas</span></h1>
          <p className="coin-recharge__subtitle">Elige tu paquete y sigue disfrutando de tus mangas favoritos.</p>
        </header>

        <div className="coin-recharge__layout">
          <section className="coin-recharge__selection" aria-labelledby="coin-pack-heading">
            <div className="coin-recharge__section-heading">
              <span className="coin-recharge__step">01</span>
              <div><h2 id="coin-pack-heading">Elige tus monedas</h2><p>Un nuevo capítulo empieza aquí.</p></div>
            </div>
            <div className="coin-recharge__packs" role="radiogroup" aria-labelledby="coin-pack-heading">
              {COIN_PACKS.map((option, index) => (
                <label key={option.id} className={`coin-pack${option.tag ? ' coin-pack--featured' : ''}${pack.id === option.id ? ' coin-pack--selected' : ''}${pending ? ' coin-pack--disabled' : ''}`}>
                  <input className="coin-pack__radio" type="radio" name="coin-pack" value={option.id} checked={pack.id === option.id} disabled={pending} onChange={() => selectPack(option.id)} />
                  <span className="coin-pack__check" aria-hidden="true">{pack.id === option.id && <Check size={13} strokeWidth={3} />}</span>
                  {option.tag && <span className="coin-pack__tag">{option.tag}</span>}
                  <span className="coin-pack__stack" data-coins={stackSize(index)} aria-hidden="true">
                    {Array.from({ length: stackSize(index) }, (_, position) => (
                      <img key={position} src={MANGAMUKAI_COIN_3D_ICON} alt="" decoding="async" draggable={false} />
                    ))}
                  </span>
                  <span className="coin-pack__info">
                    <span className="coin-pack__amount coin-market-number">{formatCoins(option.coins)}</span>
                    <span className="coin-pack__label">monedas</span>
                  </span>
                  <span className="coin-pack__price coin-market-number">{formatPrice(option.price)} <small>USD</small></span>
                </label>
              ))}
            </div>
            <p className="coin-recharge__assurance"><ShieldCheck size={17} /> Revisa tu selección antes de confirmar el pago.</p>
          </section>

          <aside className="coin-checkout" aria-labelledby="coin-checkout-heading">
            <div className="coin-recharge__section-heading">
              <span className="coin-recharge__step">02</span>
              <div><h2 id="coin-checkout-heading">Detalle de tu compra</h2><p>Ya casi estás listo.</p></div>
            </div>
            <div className="coin-checkout__product" aria-live="polite">
              <span className="coin-checkout__coin"><img src={MANGAMUKAI_COIN_3D_ICON} alt="" /></span>
              <div><strong>{formatCoins(pack.coins)} monedas</strong><span>Saldo para tus lecturas</span></div>
              <strong className="coin-market-number">{formatPrice(pack.price)}</strong>
            </div>
            <div className="coin-checkout__total" aria-live="polite"><span>Total a pagar</span><strong className="coin-market-number">{formatPrice(pack.price)} <small>USD</small></strong></div>

            <fieldset className="coin-checkout__payments" disabled={pending}>
              <legend>Método de pago</legend>
              <div className="coin-recharge__methods">
                {(['paypal', 'yape'] as const).map((option) => (
                  <label key={option} className={`coin-recharge__method${method === option ? ' coin-recharge__method--selected' : ''}`}>
                    <input type="radio" name="payment-method" value={option} checked={method === option} onChange={() => { setMethod(option); setError(''); setDraftReady(false); }} />
                    <span className={`coin-recharge__brand coin-recharge__brand--${option}`} aria-hidden="true">{option === 'paypal' ? 'P' : 'Y'}</span>
                    <span><strong>{option === 'paypal' ? 'PayPal' : 'Yape'}</strong><small>{option === 'paypal' ? 'Pago en línea' : 'Revisión manual'}</small></span>
                    <span className="coin-recharge__method-check" aria-hidden="true">{method === option && <Check size={12} strokeWidth={3} />}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {method === 'paypal' ? (
              <p className="coin-checkout__payment-note">Continúa a PayPal para completar tu compra de forma segura.</p>
            ) : (
              <div className="coin-yape">
                <div className="coin-yape__payment-card">
                  <span className="coin-yape__demo-badge">Demostración</span>
                  <h3>Recarga con Yape</h3>
                  <div className="coin-yape__qr"><img src={yapeDemoQr} alt="QR de ejemplo de MangaMukai, no válido para realizar pagos" width="164" height="164" /></div>
                  <span className="coin-yape__phone-label">Número de ejemplo</span>
                  <strong className="coin-yape__phone">{YAPE_DEMO_PHONE}</strong>
                  <p>QR y número de muestra. No realices pagos a estos datos.</p>
                </div>
                <div className="coin-yape__heading"><ReceiptText size={17} /><strong>Tu comprobante de Yape</strong></div>
                <p>Confirma por correo el monto en soles y los datos de pago. Luego adjunta tu comprobante para preparar la solicitud.</p>
                {YAPE_HAS_CONTACT ? <a className="coin-yape__email" href={`mailto:${YAPE_EMAIL}`}><Mail size={15} />{YAPE_EMAIL}</a> : <span className="coin-yape__email"><Mail size={15} />{YAPE_EMAIL}</span>}
                {!YAPE_HAS_CONTACT && <p className="coin-yape__setup" role="note">Correo de ejemplo. Falta confirmar el contacto de Yape antes de realizar un pago o enviar tu solicitud.</p>}
                <label className={`coin-yape__upload${pending ? ' coin-yape__upload--disabled' : ''}`}>
                  <input ref={receiptInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={pending} onChange={(event) => attachReceipt(event.target.files?.[0])} />
                  <UploadCloud size={22} />
                  <strong>{receipt ? 'Cambiar comprobante' : 'Subir comprobante'}</strong>
                  <span>JPG, PNG, WebP o PDF · hasta 5 MB</span>
                </label>
                {receipt && <div className="coin-yape__attachment">
                  {receiptPreview ? <img src={receiptPreview} alt="Vista previa del comprobante seleccionado" /> : <ReceiptText size={26} />}
                  <span><strong>{receipt.name}</strong><small>{(receipt.size / 1024 / 1024).toFixed(2)} MB · Archivo seleccionado</small></span>
                  {!pending && <button type="button" onClick={resetReceipt} aria-label="Quitar comprobante"><X size={16} /></button>}
                </div>}
                <p className="coin-yape__local-note">Descarga un borrador de correo con tu comprobante adjunto y envíalo manualmente. No se envía ningún archivo desde esta página.</p>
              </div>
            )}

            {error && <p role="alert" className="coin-recharge__error">{error}</p>}
            {draftReady && <p className="coin-yape__success" role="status"><CircleCheck size={18} />Borrador descargado. Ábrelo en tu aplicación de correo, revisa el destinatario y envíalo para la verificación manual.</p>}
            <button type="button" className="coin-checkout__submit" onClick={() => void checkout()} disabled={pending || (method === 'yape' && !receipt)} aria-busy={pending}>
              {pending ? (method === 'yape' ? 'Preparando solicitud…' : 'Conectando con PayPal…') : method === 'paypal' ? 'Pagar con PayPal' : 'Descargar solicitud Yape'}
              {!pending && (method === 'paypal' ? <ArrowRight size={17} /> : <Download size={17} />)}
            </button>
            <p className="coin-checkout__footnote">{method === 'paypal' ? 'Tus monedas se acreditan al confirmar el pago.' : 'Las monedas se acreditan después de verificar el pago.'}</p>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default CoinMarketPage;
