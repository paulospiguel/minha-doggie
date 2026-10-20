import {CUSTOMER_ACCOUNT_API_URL} from '../constants';

export type GraphQLErrorKind = 'network' | 'http' | 'graphql' | 'empty';

export class CustomerAccountApiError extends Error {
  readonly kind: GraphQLErrorKind;
  readonly status?: number;

  constructor(kind: GraphQLErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'CustomerAccountApiError';
    this.kind = kind;
    this.status = status;
  }
}

interface GraphQLResponse<T> {
  data?: T | null;
  errors?: Array<{message?: string}>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * POST à Customer Account API. A autenticação é tratada pela Shopify
 * (sem tokens no código). Erros são normalizados em CustomerAccountApiError.
 */
export async function customerAccountRequest<TData, TVariables extends object = Record<string, never>>(
  query: string,
  variables?: TVariables,
  fetchImpl: FetchLike = (input, init) => fetch(input, init),
): Promise<TData> {
  let response: Response;
  try {
    response = await fetchImpl(CUSTOMER_ACCOUNT_API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query, variables: variables ?? {}}),
    });
  } catch (error) {
    throw new CustomerAccountApiError('network', error instanceof Error ? error.message : 'Network error');
  }

  if (!response.ok) {
    throw new CustomerAccountApiError('http', `HTTP ${response.status}`, response.status);
  }

  let payload: GraphQLResponse<TData>;
  try {
    payload = (await response.json()) as GraphQLResponse<TData>;
  } catch {
    throw new CustomerAccountApiError('empty', 'Invalid JSON response');
  }

  if (payload.errors && payload.errors.length > 0) {
    const message = payload.errors.map((error) => error.message ?? 'GraphQL error').join(' | ');
    throw new CustomerAccountApiError('graphql', message);
  }
  if (!payload.data) {
    throw new CustomerAccountApiError('empty', 'Empty GraphQL response');
  }
  return payload.data;
}
