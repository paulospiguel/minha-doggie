/**
 * Cliente mínimo da GraphQL Admin API via Direct API Access das Admin UI extensions.
 * `shopify:admin/api/graphql.json` é autenticado pela Shopify (sessão do membro
 * da equipa); nenhum token é guardado ou enviado pelo nosso código.
 */
import {withRetry} from '@minha-doggie/core';

export const ADMIN_GRAPHQL_URL = 'shopify:admin/api/graphql.json';

export type AdminErrorKind = 'network' | 'http' | 'graphql' | 'throttled' | 'empty' | 'access';

export class AdminApiError extends Error {
  readonly kind: AdminErrorKind;
  readonly status?: number;
  constructor(kind: AdminErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'AdminApiError';
    this.kind = kind;
    this.status = status;
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface GraphQLErrorShape {
  message?: string;
  extensions?: {code?: string};
}

const defaultFetch: FetchLike = (input, init) => fetch(input, init);

async function requestOnce<TData>(query: string, variables: object, fetchImpl: FetchLike): Promise<TData> {
  let response: Response;
  try {
    response = await fetchImpl(ADMIN_GRAPHQL_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query, variables}),
    });
  } catch (error) {
    throw new AdminApiError('network', error instanceof Error ? error.message : 'Network error');
  }
  if (response.status === 429) throw new AdminApiError('throttled', 'HTTP 429', 429);
  if (response.status === 401 || response.status === 403) {
    throw new AdminApiError('access', `HTTP ${response.status}`, response.status);
  }
  if (!response.ok) throw new AdminApiError('http', `HTTP ${response.status}`, response.status);

  let payload: {data?: TData | null; errors?: GraphQLErrorShape[]};
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    throw new AdminApiError('empty', 'Invalid JSON response');
  }
  const errors = payload.errors ?? [];
  if (errors.length > 0) {
    const message = errors.map((error) => error.message ?? 'GraphQL error').join(' | ');
    const codes = errors.map((error) => error.extensions?.code ?? '');
    if (codes.includes('THROTTLED')) throw new AdminApiError('throttled', message);
    if (codes.includes('ACCESS_DENIED')) throw new AdminApiError('access', message);
    throw new AdminApiError('graphql', message);
  }
  if (!payload.data) throw new AdminApiError('empty', 'Empty GraphQL response');
  return payload.data;
}

export interface AdminRequestOptions {
  fetchImpl?: FetchLike;
  /** Espera entre tentativas (testes injetam uma função imediata). */
  sleep?: (ms: number) => Promise<void>;
}

/** POST à Admin API com nova tentativa automática quando a Shopify limita o ritmo (THROTTLED/429). */
export function adminRequest<TData>(query: string, variables: object = {}, options: AdminRequestOptions = {}): Promise<TData> {
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  return withRetry(
    () => requestOnce<TData>(query, variables, fetchImpl),
    (error) => error instanceof AdminApiError && error.kind === 'throttled',
    {retries: 6, sleep: options.sleep},
  );
}

/** Erro de permissões (staff sem acesso a Clientes, ou dados protegidos não aprovados). */
export function isAccessError(error: unknown): boolean {
  return error instanceof AdminApiError && error.kind === 'access';
}
