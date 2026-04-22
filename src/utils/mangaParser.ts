// src/utils/mangaParser.ts

export const limpiarHTMLManga = (htmlContent: string): string[] => {
  if (!htmlContent) return [];

  // 1. Buscamos todas las etiquetas <img ... src="...">
  const regex = /src="(https?:\/\/[^"]+\.(?:webp|jpg|jpeg|png))"/gi;
  const urls: string[] = [];
  let match;

  while ((match = regex.exec(htmlContent)) !== null) {
    // match[1] es la URL limpia
    urls.push(match[1]);
  }

  // 2. Eliminamos duplicados y devolvemos la lista
  return [...new Set(urls)];
};