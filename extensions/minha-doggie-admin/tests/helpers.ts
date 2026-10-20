import {vi} from 'vitest';

export interface AdminCall {
  url: string;
  query: string;
  variables: Record<string, unknown>;
}

export type Handler = (variables: Record<string, unknown>, call: AdminCall) => unknown;

/** Simula o Direct API Access (shopify:admin/api/graphql.json): responde por nome de operação. */
export function createAdminMock(handlers: Record<string, Handler>) {
  const calls: AdminCall[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as {query: string; variables: Record<string, unknown>};
    const call = {url, query: body.query, variables: body.variables};
    calls.push(call);
    const name = /(?:query|mutation)\s+(\w+)/.exec(body.query)?.[1] ?? '';
    const handler = handlers[name];
    const payload = handler ? handler(body.variables, call) : {errors: [{message: `Unknown operation ${name}`}]};
    if (payload instanceof Response) return payload;
    return new Response(JSON.stringify(payload), {status: 200, headers: {'Content-Type': 'application/json'}});
  });
  return {fetchMock, calls, opNames: () => calls.map((c) => /(?:query|mutation)\s+(\w+)/.exec(c.query)?.[1])};
}

export const CUSTOMER = 'gid://shopify/Customer/7001';

export const DOG = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  name: 'Bolinhas',
  species: 'dog',
  breed: 'Labrador',
  age: {value: 3, unit: 'years'},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const CAT = {...DOG, id: 'bbbbbbbb-0000-4000-8000-000000000002', name: 'Mia', species: 'cat', breed: '', age: null};

export function petsDoc(...pets: unknown[]): string {
  return JSON.stringify({version: 1, pets});
}

export function setOk(variables: Record<string, unknown>) {
  const inputs = variables.metafields as Array<{key: string; value: string}>;
  return {
    data: {
      metafieldsSet: {
        metafields: inputs.map((input) => ({key: input.key, value: input.value, compareDigest: `new-${input.key}`})),
        userErrors: [],
      },
    },
  };
}

export const deleteOk = (variables: Record<string, unknown>) => ({
  data: {
    metafieldsDelete: {
      deletedMetafields: (variables.metafields as Array<{key: string}>).map((m) => ({key: m.key})),
      userErrors: [],
    },
  },
});

export const noSleep = async () => undefined;
