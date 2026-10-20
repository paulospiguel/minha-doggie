/** Remove caracteres de controlo e normaliza espaços (input do cliente). */
export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Número de "caracteres" visíveis (pontos de código), não unidades UTF-16. */
export function textLength(input: string): number {
  return Array.from(input).length;
}

export function truncate(input: string, max: number): string {
  const chars = Array.from(input);
  return chars.length <= max ? input : chars.slice(0, max).join('');
}
