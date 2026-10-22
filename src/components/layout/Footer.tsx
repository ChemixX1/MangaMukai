import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { scheduleBackgroundTask } from '../../utils/backgroundTasks';

type FooterComponent = typeof import('./FooterContent').Footer;
let cachedFooter: FooterComponent | undefined;
let pending: Promise<FooterComponent> | undefined;
const listeners = new Set<(component: FooterComponent) => void>();
const loadFooter = () => pending ??= import('./FooterContent').then(module => {
  cachedFooter = module.Footer;
  listeners.forEach(listener => listener(module.Footer));
  return module.Footer;
}).catch(error => { pending = undefined; throw error; });

/** One shared module across routes, requested after page data or on scroll intent. */
export function Footer({ ready = true, className = '', homeDesign = false }: {
  ready?: boolean; className?: string; homeDesign?: boolean;
}) {
  const [Content, setContent] = useState(() => cachedFooter);
  const placeholder = useRef<HTMLElement>(null);
  useEffect(() => {
    if (Content) return;
    let active = true;
    const loaded = (component: FooterComponent) => { if (active) setContent(() => component); };
    listeners.add(loaded);
    if (cachedFooter) loaded(cachedFooter);
    const show = async () => {
      try {
        const component = await loadFooter();
        if (active) setContent(() => component);
      } catch { /* Keep the basic footer links available if the chunk cannot load. */ }
    };
    const cancel = ready ? scheduleBackgroundTask('layout:footer', show) : () => {};
    const observer = typeof IntersectionObserver === 'undefined' ? undefined : new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer?.disconnect(); void show(); }
    }, { rootMargin: '250px' });
    if (placeholder.current) observer?.observe(placeholder.current);
    if (ready && !observer) void show();
    return () => { active = false; listeners.delete(loaded); cancel(); observer?.disconnect(); };
  }, [Content, ready]);
  if (Content) return <Content className={className} homeDesign={homeDesign} />;
  return <footer ref={placeholder} className={`${homeDesign ? 'home-design-footer' : 'min-h-[475px]'} ${className}`}>
    <nav aria-label="Información de MangaMukai" className="flex justify-center gap-6 py-8 text-sm text-ink/70">
      <Link to="/nosotros">Sobre nosotros</Link><Link to="/contacto">Contacto</Link><Link to="/privacidad">Privacidad</Link>
    </nav>
  </footer>;
}
