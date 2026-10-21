import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, X } from 'lucide-react';
import { CommunityIcon } from './CommunityIcons';
import { MukaiLoaderWheel } from '../common/MukaiLoaderWheel';
import { uploadProfilePostMedia } from '../../services/profilePostService';

type Attachment = { file: File; preview: string; url?: string };
const emojis = ['🌸', '❤️', '😂', '😍', '✨', '🔥', '😭', '📚', '👏', '🤯'];

export function MessageComposer({ onSend }: { onSend: (body: string) => Promise<void> }) {
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const emojiRoot = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const preview = attachment?.preview;
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (!emojiOpen) return;
    const close = (event: PointerEvent) => { if (!emojiRoot.current?.contains(event.target as Node)) setEmojiOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [emojiOpen]);
  const chooseFile = (gif = false) => {
    if (!fileInput.current) return;
    fileInput.current.accept = gif ? 'image/gif' : 'image/jpeg,image/png,image/webp,image/gif';
    fileInput.current.click();
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current || (!content.trim() && !attachment)) return;
    inFlight.current = true;
    setSending(true); setError(''); setEmojiOpen(false);
    try {
      let body = content.trim();
      if (attachment) {
        const url = attachment.url || (await uploadProfilePostMedia(attachment.file)).url;
        if (!mounted.current) return;
        setAttachment({ ...attachment, url });
        body += `${body ? '\n' : ''}[${attachment.file.type === 'image/gif' ? 'GIF' : 'Imagen'}](${url})`;
      }
      if (body.length > 2000) throw new Error('Acorta el mensaje para dejar espacio al archivo adjunto.');
      await onSend(body);
      if (!mounted.current) return;
      setContent(''); setAttachment(null); textarea.current?.focus();
    } catch (caught) {
      if (mounted.current) setError(caught instanceof Error ? caught.message : 'No se pudo enviar el mensaje.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setSending(false);
    }
  };
  return <form onSubmit={submit} className="messages-composer">
    {error && <p role="alert" className="mb-2 text-xs text-red-500">{error}</p>}
    {attachment && <div className="messages-attachment-preview">
      <img src={attachment.preview} alt="Archivo adjunto" />
      <button type="button" disabled={sending} onClick={() => setAttachment(null)} aria-label="Quitar archivo adjunto"><X size={16} /></button>
    </div>}
    <input ref={fileInput} type="file" className="hidden" aria-label="Adjuntar imagen o GIF" onChange={event => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { setError('Elige una imagen JPG, PNG, WebP o GIF.'); return; }
      if (file.size > 8 * 1024 * 1024) { setError('El archivo debe pesar menos de 8 MB.'); return; }
      setError(''); setAttachment({ file, preview: URL.createObjectURL(file) }); textarea.current?.focus();
    }} />
    <div className="messages-composer-row">
      <div className="messages-composer-tools">
        <button type="button" disabled={sending} onClick={() => chooseFile()} aria-label="Añadir imagen de la galería" title="Galería"><CommunityIcon name="image" size={20} /></button>
        <button type="button" disabled={sending} onClick={() => chooseFile(true)} aria-label="Añadir GIF" title="GIF"><CommunityIcon name="gif" size={20} /></button>
        <div ref={emojiRoot} className="relative flex" onKeyDown={event => { if (event.key === 'Escape') { setEmojiOpen(false); textarea.current?.focus(); } }}>
          <button type="button" disabled={sending} onClick={() => setEmojiOpen(value => !value)} aria-label="Añadir emoji" title="Emojis" aria-expanded={emojiOpen}><CommunityIcon name="emoji" size={20} /></button>
          {emojiOpen && <div className="messages-emoji-picker" role="group" aria-label="Elegir emoji">{emojis.map(emoji => <button type="button" key={emoji} aria-label={`Insertar ${emoji}`} onClick={() => {
            const start = textarea.current?.selectionStart ?? content.length;
            const end = textarea.current?.selectionEnd ?? start;
            setContent(`${content.slice(0, start)}${emoji}${content.slice(end)}`.slice(0, 2000));
            setEmojiOpen(false); textarea.current?.focus();
          }}>{emoji}</button>)}</div>}
        </div>
      </div>
      <div className="messages-composer-input">
        <textarea ref={textarea} aria-label="Mensaje" value={content} disabled={sending} maxLength={2000} rows={1} placeholder="Escribe un mensaje" onChange={event => setContent(event.target.value)} onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
        }} />
        {(content.trim() || attachment) && <button type="submit" disabled={sending} aria-label="Enviar mensaje" className="messages-send">{sending ? <MukaiLoaderWheel size={20} isLight={false} /> : <ArrowUp size={21} strokeWidth={2.6} />}</button>}
      </div>
    </div>
  </form>;
}
