const dateFormatter = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long' });
const timeFormatter = new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true });

export function formatChatDate(value: string) {
  const date = new Date(value.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T'));
  if (Number.isNaN(date.getTime())) return '';
  const parts = timeFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value || '';
  const period = date.getHours() < 12 ? 'a. m.' : 'p. m.';
  return `${dateFormatter.format(date)} ${part('hour')}:${part('minute')} ${period}`;
}

// Keep attachments compatible with the existing text-message API.
export function parseChatMessage(body: string) {
  const match = /(?:^|\n)\[(Imagen|GIF)\]\((https?:\/\/[^\s)]+)\)$/.exec(body);
  return match ? { text: body.slice(0, match.index).trimEnd(), media: { url: match[2], label: match[1] } } : { text: body, media: null };
}

export function chatMessagePreview(body: string) {
  const parsed = parseChatMessage(body);
  return parsed.text || parsed.media?.label || '';
}
