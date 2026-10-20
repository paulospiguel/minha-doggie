import {describe, expect, it} from 'vitest';
import {CUSTOMER_ACCOUNT_API_URL} from '../src/constants';
import {fetchCustomer, fetchRecentOrders, PetsConflictError, PetsSaveError, savePets} from '../src/graphql/api';
import {CustomerAccountApiError, customerAccountRequest} from '../src/graphql/client';
import type {Pet} from '../src/types';
import {createApiMock, CUSTOMER_GID} from './helpers';

const pet: Pet = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  name: 'Bolinhas',
  species: 'dog',
  breed: '',
  age: null,
  createdAt: '2026-10-20T11:00:00.000Z',
  updatedAt: '2026-10-20T11:00:00.000Z',
};

describe('customerAccountRequest', () => {
  it('usa o endpoint oficial shopify://customer-account/api/2026-10/graphql.json', async () => {
    const {fetchMock, calls} = createApiMock({firstName: 'Ana', petsValue: null, digest: null, orders: []});
    await fetchCustomer(fetchMock);
    expect(CUSTOMER_ACCOUNT_API_URL).toBe('shopify://customer-account/api/2026-10/graphql.json');
    expect(calls[0].url).toBe(CUSTOMER_ACCOUNT_API_URL);
  });

  it('normaliza erros de rede, HTTP, GraphQL e resposta vazia', async () => {
    await expect(customerAccountRequest('q', {}, async () => Promise.reject(new Error('offline')))).rejects.toMatchObject({kind: 'network'});
    await expect(customerAccountRequest('q', {}, async () => new Response('x', {status: 401}))).rejects.toMatchObject({kind: 'http', status: 401});
    await expect(customerAccountRequest('q', {}, async () => new Response(JSON.stringify({errors: [{message: 'bad'}]})))).rejects.toMatchObject({kind: 'graphql'});
    await expect(customerAccountRequest('q', {}, async () => new Response(JSON.stringify({data: null})))).rejects.toBeInstanceOf(CustomerAccountApiError);
    await expect(customerAccountRequest('q', {}, async () => new Response('not json'))).rejects.toMatchObject({kind: 'empty'});
  });
});

describe('fetchCustomer', () => {
  it('devolve perfil, companheiros e compareDigest', async () => {
    const value = JSON.stringify({version: 1, pets: [pet]});
    const {fetchMock} = createApiMock({firstName: 'Ana', petsValue: value, digest: 'd1', orders: []});
    const data = await fetchCustomer(fetchMock);
    expect(data.profile).toEqual({id: CUSTOMER_GID, firstName: 'Ana'});
    expect(data.pets).toEqual({pets: [pet], discarded: 0, compareDigest: 'd1'});
  });

  it('bloqueia escrita (pets null) se o JSON guardado estiver corrompido', async () => {
    const {fetchMock} = createApiMock({firstName: 'Ana', petsValue: '{oops', digest: 'd1', orders: []});
    expect((await fetchCustomer(fetchMock)).pets).toBeNull();
  });
});

describe('fetchRecentOrders', () => {
  it('pede 3 encomendas ordenadas por PROCESSED_AT desc', async () => {
    const {fetchMock, calls} = createApiMock({firstName: null, petsValue: null, digest: null, orders: []});
    await fetchRecentOrders(fetchMock);
    expect(calls[0].variables).toEqual({first: 3});
    expect(calls[0].query).toContain('sortKey: PROCESSED_AT, reverse: true');
  });
});

describe('savePets', () => {
  it('envia metafieldsSet para o cliente autenticado, namespace $app, tipo json', async () => {
    const {fetchMock, calls} = createApiMock({firstName: 'Ana', petsValue: null, digest: null, orders: []});
    const digest = await savePets(CUSTOMER_GID, [pet], null, fetchMock);
    const input = (calls[0].variables.metafields as Array<Record<string, string>>)[0];
    expect(calls[0].variables.metafields).toHaveLength(3);
    expect(input).toEqual({
      ownerId: CUSTOMER_GID,
      namespace: '$app',
      key: 'pets',
      type: 'json',
      value: JSON.stringify({version: 1, pets: [pet]}),
    });
    expect(input).not.toHaveProperty('compareDigest');
    expect(digest).toMatch(/^digest-/);
  });

  it('envia compareDigest quando o metafield já existe', async () => {
    const {fetchMock, calls} = createApiMock({firstName: 'Ana', petsValue: '[]', digest: 'd1', orders: []});
    await savePets(CUSTOMER_GID, [pet], 'd1', fetchMock);
    expect((calls[0].variables.metafields as Array<Record<string, string>>)[0].compareDigest).toBe('d1');
  });

  it('converte INVALID_COMPARE_DIGEST/STALE_OBJECT em conflito', async () => {
    for (const code of ['INVALID_COMPARE_DIGEST', 'STALE_OBJECT']) {
      const {fetchMock} = createApiMock({firstName: 'Ana', petsValue: '[]', digest: 'd1', orders: [], userErrors: [{field: ['metafields', '0'], message: 'stale', code}]});
      await expect(savePets(CUSTOMER_GID, [pet], 'd1', fetchMock)).rejects.toBeInstanceOf(PetsConflictError);
    }
  });

  it('grava pet_count e pet_species na MESMA chamada metafieldsSet (atómica)', async () => {
    const cat: Pet = {...pet, id: 'bbbbbbbb-0000-4000-8000-000000000002', name: 'Mia', species: 'cat'};
    const state = {firstName: 'Ana', petsValue: null, digest: null, orders: []} as Parameters<typeof createApiMock>[0];
    const {fetchMock, calls} = createApiMock(state);
    await savePets(CUSTOMER_GID, [pet, cat], null, fetchMock);
    expect(calls).toHaveLength(1);
    const inputs = calls[0].variables.metafields as Array<Record<string, string>>;
    expect(inputs.map((input) => input.key)).toEqual(['pets', 'pet_count', 'pet_species']);
    expect(inputs.every((input) => input.ownerId === CUSTOMER_GID && input.namespace === '$app')).toBe(true);
    expect(inputs[1]).toMatchObject({type: 'number_integer', value: '2'});
    expect(inputs[2]).toMatchObject({type: 'list.single_line_text_field', value: '["cao","gato"]'});
    expect(state.index).toEqual({pet_count: '2', pet_species: '["cao","gato"]'});
  });

  it('sem companheiros: grava pet_count=0 e remove pet_species depois do set', async () => {
    const state = {firstName: 'Ana', petsValue: '[]', digest: 'd1', orders: []} as Parameters<typeof createApiMock>[0];
    const {fetchMock, calls} = createApiMock(state);
    await savePets(CUSTOMER_GID, [], 'd1', fetchMock);
    expect(calls).toHaveLength(2);
    const inputs = calls[0].variables.metafields as Array<Record<string, string>>;
    expect(inputs.map((input) => input.key)).toEqual(['pets', 'pet_count']);
    expect(inputs[1].value).toBe('0');
    expect(calls[1].query).toContain('metafieldsDelete');
    expect(calls[1].variables.metafields).toEqual([{ownerId: CUSTOMER_GID, namespace: '$app', key: 'pet_species'}]);
  });

  it('conflito de compareDigest: não tenta remover índices', async () => {
    const {fetchMock, calls} = createApiMock({firstName: 'Ana', petsValue: '[]', digest: 'd1', orders: [], userErrors: [{field: ['metafields', '0'], message: 'stale', code: 'INVALID_COMPARE_DIGEST'}]});
    await expect(savePets(CUSTOMER_GID, [], 'd1', fetchMock)).rejects.toBeInstanceOf(PetsConflictError);
    expect(calls).toHaveLength(1);
  });

  it('propaga outros userErrors (ex.: APP_NOT_AUTHORIZED)', async () => {
    const {fetchMock} = createApiMock({firstName: 'Ana', petsValue: null, digest: null, orders: [], userErrors: [{field: ['metafields'], message: 'Access denied', code: 'APP_NOT_AUTHORIZED'}]});
    await expect(savePets(CUSTOMER_GID, [pet], null, fetchMock)).rejects.toBeInstanceOf(PetsSaveError);
  });
});
