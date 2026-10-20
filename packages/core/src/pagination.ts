/** Paginação por cursor (GraphQL Relay) com proteção contra ciclos e limite de páginas. */

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface Page<T> {
  nodes: T[];
  pageInfo: PageInfo;
}

export interface CollectOptions {
  /** Máximo de páginas (proteção). Por omissão: 1000. */
  maxPages?: number;
  onPage?: (progress: {page: number; total: number}) => void;
  /** Cancelamento cooperativo (verificado entre páginas). */
  isCancelled?: () => boolean;
}

export interface CollectResult<T> {
  items: T[];
  pages: number;
  /** true se parou por limite de páginas ou cancelamento (resultado incompleto). */
  truncated: boolean;
}

export class PaginationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaginationError';
  }
}

export async function collectPages<T>(
  fetchPage: (after: string | null) => Promise<Page<T>>,
  options: CollectOptions = {},
): Promise<CollectResult<T>> {
  const maxPages = options.maxPages ?? 1000;
  const items: T[] = [];
  const seen = new Set<string>();
  let after: string | null = null;
  let pages = 0;
  for (;;) {
    if (options.isCancelled?.()) return {items, pages, truncated: true};
    if (pages >= maxPages) return {items, pages, truncated: true};
    const page = await fetchPage(after);
    pages += 1;
    items.push(...page.nodes);
    options.onPage?.({page: pages, total: items.length});
    if (!page.pageInfo.hasNextPage) return {items, pages, truncated: false};
    const cursor = page.pageInfo.endCursor;
    if (!cursor) throw new PaginationError('hasNextPage sem endCursor.');
    if (seen.has(cursor)) throw new PaginationError('Cursor repetido: paginação em ciclo.');
    seen.add(cursor);
    after = cursor;
  }
}

/** Divide uma lista em blocos de tamanho fixo. */
export function chunk<T>(list: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new RangeError('size tem de ser ≥ 1');
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export interface RetryOptions {
  retries?: number;
  /** Espera em ms antes da tentativa `attempt` (1-based). */
  delayMs?: (attempt: number) => number;
  sleep?: (ms: number) => Promise<void>;
}

/** Repete `fn` enquanto `isRetryable(error)` (ex.: THROTTLED da Admin API). */
export async function withRetry<T>(
  fn: () => Promise<T>,
  isRetryable: (error: unknown) => boolean,
  options: RetryOptions = {},
): Promise<T> {
  const retries = options.retries ?? 5;
  const delayMs = options.delayMs ?? ((attempt: number) => Math.min(1000 * 2 ** (attempt - 1), 10000));
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt > retries || !isRetryable(error)) throw error;
      await sleep(delayMs(attempt));
    }
  }
}
