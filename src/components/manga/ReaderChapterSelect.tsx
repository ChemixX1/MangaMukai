import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export function ReaderChapterSelect({ value, number, options, isLight, onChange }: {
  value?: string; number?: number; options: Array<{ id: string; number: number }>; isLight: boolean; onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = options.length ? options : [{ id: value || '', number: number || 0 }];
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    const selected = root.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]') || root.current?.querySelector<HTMLButtonElement>('[role="option"]');
    selected?.focus({ preventScroll: true });
    selected?.scrollIntoView({ block: 'nearest' });
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  useEffect(() => setOpen(false), [value]);
  return <div ref={root} className="relative" onKeyDown={event => {
    if (event.key === 'Escape') { setOpen(false); button.current?.focus(); }
    if (!open && event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); return; }
    if (!open || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nodes = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') || [])];
    const current = nodes.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? nodes.length - 1 : Math.max(0, Math.min(nodes.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
    nodes[next]?.focus();
  }}>
    <button ref={button} type="button" aria-label="Seleccionar capítulo" aria-haspopup="listbox" aria-expanded={open} aria-controls="reader-chapter-options" onClick={() => setOpen(current => !current)} className={`flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D88]/50 ${isLight ? 'border-black/10 bg-[#f4f4f5]' : 'border-white/15 bg-zinc-900'}`}><span>Capítulo <strong className="ml-2">{number}</strong></span><ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} /></button>
    {open && <div id="reader-chapter-options" role="listbox" aria-label="Capítulos" className={`absolute inset-x-0 top-full z-[80] mt-2 max-h-52 overflow-y-auto overscroll-contain rounded-2xl border p-1.5 shadow-xl ${isLight ? 'border-black/10 bg-white' : 'border-white/15 bg-zinc-900'}`} style={{ WebkitOverflowScrolling: 'touch' }}>
      {items.map(chapter => <button key={chapter.id} type="button" role="option" aria-selected={chapter.id === value} onClick={() => { setOpen(false); onChange(chapter.id); button.current?.focus(); }} className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-[#FF4D88]/50 ${chapter.id === value ? 'bg-[#FF4D88]/10 font-bold text-[#FF4D88]' : isLight ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}>Capítulo {chapter.number}{chapter.id === value && <Check size={16} />}</button>)}
    </div>}
  </div>;
}
