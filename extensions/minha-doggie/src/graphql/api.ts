import {
  buildPetsWrite,
  parseBanner,
  parsePetsMetafield,
  type BannerConfig,
  type MetafieldIdentifierInput,
  type MetafieldsSetInput,
} from '@minha-doggie/core';
import {LIMITS, PETS_METAFIELD} from '../constants';
import type {CustomerProfile, OrderNode, Pet, PetsState} from '../types';
import {CustomerAccountApiError, customerAccountRequest, type FetchLike} from './client';
import {
  CUSTOMER_QUERY,
  DELETE_PET_INDEX_MUTATION,
  RECENT_ORDERS_QUERY,
  SET_PETS_MUTATION,
  SUBSCRIPTIONS_QUERY,
} from './operations';

export interface SubscriptionNode {
  id: string;
  status: string | null;
  nextBillingDate: string | null;
  lines?: {
    nodes?: Array<{
      title: string | null;
      quantity: number | null;
      image?: {url: string | null; altText: string | null} | null;
    }>;
  } | null;
}

interface SubscriptionsData {
  customer: {subscriptionContracts: {nodes: SubscriptionNode[]} | null} | null;
}

interface CustomerQueryData {
  customer: {
    id: string;
    firstName: string | null;
    pets: {value: string; compareDigest: string} | null;
  } | null;
  shop?: {
    banner?: {value: string} | null;
  } | null;
}

interface RecentOrdersData {
  customer: {orders: {nodes: OrderNode[]}} | null;
}

interface DeletePetIndexData {
  metafieldsDelete: {
    userErrors: Array<{field: string[] | null; message: string}>;
  } | null;
}

interface SetPetsData {
  metafieldsSet: {
    metafields: Array<{key: string; value: string; compareDigest: string}> | null;
    userErrors: Array<{field: string[] | null; message: string; code: string | null}>;
  } | null;
}

/** O metafield foi alterado entretanto (outra janela/dispositivo). */
export class PetsConflictError extends Error {
  constructor() {
    super('Pets metafield changed since it was read');
    this.name = 'PetsConflictError';
  }
}

export class PetsSaveError extends Error {
  readonly codes: string[];
  constructor(message: string, codes: string[] = []) {
    super(message);
    this.name = 'PetsSaveError';
    this.codes = codes;
  }
}

export interface CustomerData {
  profile: CustomerProfile;
  /** null se o JSON guardado estiver ilegível (escritas bloqueadas). */
  pets: PetsState | null;
  banner: BannerConfig;
}

export async function fetchCustomer(fetchImpl?: FetchLike): Promise<CustomerData> {
  const data = await customerAccountRequest<CustomerQueryData>(CUSTOMER_QUERY, undefined, fetchImpl);
  const customer = data.customer;
  if (!customer || typeof customer.id !== 'string') {
    throw new CustomerAccountApiError('empty', 'No authenticated customer');
  }
  const profile: CustomerProfile = {id: customer.id, firstName: customer.firstName ?? null};
  const banner = parseBanner(data.shop?.banner?.value);
  try {
    const parsed = parsePetsMetafield(customer.pets?.value);
    return {
      profile,
      pets: {pets: parsed.pets, discarded: parsed.discarded, compareDigest: customer.pets?.compareDigest ?? null},
      banner,
    };
  } catch {
    return {profile, pets: null, banner};
  }
}

export async function fetchRecentOrders(fetchImpl?: FetchLike): Promise<OrderNode[]> {
  const data = await customerAccountRequest<RecentOrdersData, {first: number}>(
    RECENT_ORDERS_QUERY,
    {first: LIMITS.recentOrders},
    fetchImpl,
  );
  return data.customer?.orders?.nodes ?? [];
}

export async function fetchSubscriptions(first = 3, fetchImpl?: FetchLike): Promise<SubscriptionNode[]> {
  const data = await customerAccountRequest<SubscriptionsData, {first: number}>(
    SUBSCRIPTIONS_QUERY,
    {first},
    fetchImpl,
  );
  return data.customer?.subscriptionContracts?.nodes ?? [];
}

/**
 * Grava a lista completa no metafield do cliente autenticado e, na MESMA
 * chamada `metafieldsSet` (atómica), os índices de segmentação
 * `$app.pet_count` e `$app.pet_species`.
 * Usa compareDigest (concorrência otimista) no metafield `pets` quando já existe.
 * Se o cliente ficar sem companheiros, `pet_species` é removido a seguir
 * (melhor esforço: os segmentos exigem também `pet_count >= 1`).
 * Devolve o novo compareDigest de `pets`.
 */
export async function savePets(
  customerId: string,
  pets: readonly Pet[],
  compareDigest: string | null,
  fetchImpl?: FetchLike,
): Promise<string | null> {
  const plan = buildPetsWrite(customerId, pets, compareDigest);

  const data = await customerAccountRequest<SetPetsData, {metafields: MetafieldsSetInput[]}>(
    SET_PETS_MUTATION,
    {metafields: plan.set},
    fetchImpl,
  );
  const result = data.metafieldsSet;
  if (!result) throw new PetsSaveError('metafieldsSet returned null');
  if (result.userErrors.length > 0) {
    const codes = result.userErrors.map((error) => error.code ?? '').filter(Boolean);
    if (codes.some((code) => code === 'INVALID_COMPARE_DIGEST' || code === 'STALE_OBJECT')) {
      throw new PetsConflictError();
    }
    throw new PetsSaveError(result.userErrors.map((error) => error.message).join(' | '), codes);
  }
  const saved = result.metafields?.find((metafield) => metafield.key === PETS_METAFIELD.key);
  if (!saved) throw new PetsSaveError('Shopify did not confirm the write');

  if (plan.remove.length > 0) await removePetIndex(plan.remove, fetchImpl);
  return saved.compareDigest ?? null;
}

/** Remove índices obsoletos. Nunca lança: os dados principais já foram gravados. */
async function removePetIndex(metafields: MetafieldIdentifierInput[], fetchImpl?: FetchLike): Promise<void> {
  try {
    await customerAccountRequest<DeletePetIndexData, {metafields: MetafieldIdentifierInput[]}>(
      DELETE_PET_INDEX_MUTATION,
      {metafields},
      fetchImpl,
    );
  } catch {
    // Melhor esforço; a reindexação no admin corrige qualquer resto.
  }
}
