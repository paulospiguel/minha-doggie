import {vi} from 'vitest';

export const CUSTOMER_GID = 'gid://shopify/Customer/7001';

export interface MockState {
  firstName: string | null;
  petsValue: string | null;
  digest: string | null;
  orders: unknown[];
  bannerValue?: string | null;
  ordersError?: boolean;
  customerError?: boolean;
  userErrors?: Array<{field: string[]; message: string; code: string}>;
  /** Índices gravados no último metafieldsSet (pet_count / pet_species). */
  index?: Record<string, string>;
  deletedIndex?: string[];
}

export interface GraphQLCall {
  url: string;
  query: string;
  variables: Record<string, unknown>;
}

/** Simula a Customer Account API: responde por nome de operação. */
export function createApiMock(state: MockState) {
  const calls: GraphQLCall[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as {query: string; variables: Record<string, unknown>};
    calls.push({url, query: body.query, variables: body.variables});
    const json = (data: unknown) => new Response(JSON.stringify(data), {status: 200, headers: {'Content-Type': 'application/json'}});

    if (body.query.includes('query MinhaDoggieCustomer')) {
      if (state.customerError) return new Response('boom', {status: 500});
      return json({
        data: {
          customer: {
            id: CUSTOMER_GID,
            firstName: state.firstName,
            pets: state.petsValue == null ? null : {value: state.petsValue, compareDigest: state.digest},
          },
          shop: {
            banner: state.bannerValue == null ? null : {value: state.bannerValue},
          },
        },
      });
    }
    if (body.query.includes('query MinhaDoggieRecentOrders')) {
      if (state.ordersError) return json({errors: [{message: 'Access denied for orders field.'}]});
      return json({data: {customer: {orders: {nodes: state.orders}}}});
    }
    if (body.query.includes('mutation MinhaDoggieSetPets')) {
      if (state.userErrors?.length) {
        return json({data: {metafieldsSet: {metafields: [], userErrors: state.userErrors}}});
      }
      const inputs = body.variables.metafields as Array<{key: string; value: string}>;
      const petsInput = inputs.find((input) => input.key === 'pets');
      if (!petsInput) return json({data: {metafieldsSet: {metafields: [], userErrors: [{field: null, message: 'pets missing', code: 'INVALID'}]}}});
      state.petsValue = petsInput.value;
      state.digest = `digest-${calls.length}`;
      state.index = Object.fromEntries(inputs.filter((input) => input.key !== 'pets').map((input) => [input.key, input.value]));
      return json({
        data: {
          metafieldsSet: {
            metafields: inputs.map((input) => ({key: input.key, value: input.value, compareDigest: input.key === 'pets' ? state.digest : `d-${input.key}`})),
            userErrors: [],
          },
        },
      });
    }
    if (body.query.includes('mutation MinhaDoggieDeletePetIndex')) {
      state.deletedIndex = (body.variables.metafields as Array<{key: string}>).map((m) => m.key);
      return json({data: {metafieldsDelete: {deletedMetafields: state.deletedIndex.map((key) => ({key})), userErrors: []}}});
    }
    return json({errors: [{message: 'Unknown operation'}]});
  });
  return {fetchMock, calls};
}
