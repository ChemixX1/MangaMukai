import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PurchasedIcon } from './designIcons';
import navbarCoins from '../../assets/recharge/icon-2-small.webp';

export interface ReaderChapterOption { id: string; number: number; isPaid?: boolean; isPurchased?: boolean; price?: number; }

export function ReaderChapterSelect({ value, number, options, isLight, onChange }: {
  value?: string; number?: number; options: ReaderChapterOption[]; isLight: boolean; onChange: (id: string) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const selectedNumber = options.find(chapter => chapter.id === value)?.number ?? number;
  const items: ReaderChapterOption[] = options.length ? options : value && selectedNumber !== undefined ? [{ id: value, number: selectedNumber }] : [];
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    const selected = root.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]') || root.current?.querySelector<HTMLButtonElement>('[role="option"]');
    selected?.focus({ preventScroll: true });
    const list = selected?.parentElement;
    if (selected && list) list.scrollTop = selected.offsetTop - (list.clientHeight - selected.offsetHeight) / 2;
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  useEffect(() => setOpen(false), [value]);
  return <div ref={root} className="reader-chapter-select relative" onKeyDown={event => {
    if (event.key === 'Escape') { setOpen(false); button.current?.focus({ preventScroll: true }); }
    if (!open && event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); return; }
    if (!open || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nodes = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') || [])];
    const current = nodes.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? nodes.length - 1 : Math.max(0, Math.min(nodes.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
    const selected = nodes[next];
    selected?.focus({ preventScroll: true });
    const list = selected?.parentElement;
    if (selected && list) list.scrollTop = selected.offsetTop - (list.clientHeight - selected.offsetHeight) / 2;
  }}>
    <button ref={button} type="button" aria-label="Seleccionar capítulo" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(current => !current)} className={`flex h-16 w-full items-center justify-between rounded-3xl border px-6 shadow-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60 ${isLight ? 'border-black/10 bg-white' : 'border-white/15 bg-zinc-900'}`}><span>Capítulo <strong className="ml-2">{selectedNumber ?? '…'}</strong></span><ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} /></button>
    {open && <div id={listId} role="listbox" aria-label="Capítulos" className={`absolute inset-x-0 top-full z-[80] mt-2 max-h-52 overflow-y-auto overscroll-contain rounded-2xl border p-1.5 shadow-xl ${isLight ? 'border-black/10 bg-white' : 'border-white/15 bg-zinc-900'}`} style={{ WebkitOverflowScrolling: 'touch' }}>
      {items.map(chapter => <button key={chapter.id} type="button" role="option" aria-selected={chapter.id === value} onClick={() => { setOpen(false); onChange(chapter.id); button.current?.focus({ preventScroll: true }); }} className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400/60 ${chapter.id === value ? (isLight ? 'bg-zinc-100 font-semibold text-zinc-950' : 'bg-zinc-800 font-semibold text-white') : isLight ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}><span>Capítulo {chapter.number}</span><span className="ml-2 inline-flex shrink-0 items-center gap-2">{chapter.isPurchased ? <span className="inline-flex items-center gap-1 text-xs font-semibold"><PurchasedIcon size={18} /><span>Comprado</span></span> : chapter.isPaid && <span className="inline-flex items-center gap-1 text-xs font-semibold" aria-label={`${chapter.price ?? 0} monedas`}><img src={navbarCoins} alt="" aria-hidden="true" className="h-5 w-6 object-contain" />{chapter.price ?? 0}</span>}</span></button>)}
    </div>}
  </div>;
}
