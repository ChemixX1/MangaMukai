import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { LEGAL_DOCUMENTS, findLegalDocument } from '../data/legalDocuments';

/** "Cómo gestionarlas" -> "como-gestionarlas", para enlazar apartados con #. */
const sectionId = (heading: string) =>
  heading
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

interface LegalDocumentPageProps {
  slug: string;
}

/**
 * Página de un documento legal: fondo blanco y una hoja tipo documento
 * mecanografiado, en Montserrat negro y párrafos ordenados. Sin adornos.
 */
export const LegalDocumentPage = ({ slug }: LegalDocumentPageProps) => {
  const document = findLegalDocument(slug);
  const { hash } = useLocation();

  // El enrutador vuelve arriba en cada ruta; con #apartado se baja hasta él.
  useEffect(() => {
    if (!hash) return;
    const frame = window.requestAnimationFrame(() => {
      window.document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hash, slug]);

  if (!document) return null;

  return (
    <main className="legal-document min-h-screen bg-white px-4 pb-16 pt-6 text-black lg:px-8 lg:pb-24 lg:pt-28">
      <article className="legal-sheet mx-auto w-full max-w-[760px] border border-zinc-300 bg-[#fdfcf9] px-6 py-10 sm:px-10 sm:py-14 md:px-14 md:py-16">
        {/* Cabecera del documento */}
        <header className="border-b border-zinc-800 pb-6">
          <p className="font-[Montserrat] text-[12px] font-semibold text-zinc-500">MangaMukai</p>
          <h1 className="mt-3 font-[Montserrat] text-[26px] font-bold uppercase leading-tight sm:text-[30px]">{document.title}</h1>
          <p className="mt-3 font-[Montserrat] text-[12px] font-medium text-zinc-600">Última revisión: {document.updatedAt}</p>
        </header>

        <p className="mt-8 font-[Montserrat] text-[14px] leading-7 text-justify">{document.intro}</p>

        {document.sections.map((section, index) => (
          <section key={section.heading} id={sectionId(section.heading)} className="mt-9 scroll-mt-20 lg:scroll-mt-28">
            <h2 className="font-[Montserrat] text-[13px] font-bold uppercase">
              <span className="mr-3 tabular-nums">{String(index + 1).padStart(2, '0')}.</span>
              {section.heading}
            </h2>
            <div className="mt-3 space-y-4">
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex} className="font-[Montserrat] text-[14px] leading-7 text-justify">{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        {/* Documentos relacionados */}
        <footer className="mt-12 border-t border-zinc-800 pt-6">
          <p className="font-[Montserrat] text-[12px] font-semibold text-zinc-500">Otros documentos</p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_DOCUMENTS.filter((item) => item.slug !== document.slug).map((item) => (
              <li key={item.slug}>
                <Link to={item.path} className="font-[Montserrat] text-[12px] font-semibold uppercase text-black underline decoration-zinc-400 underline-offset-4 hover:decoration-black">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </footer>
      </article>
    </main>
  );
};
