import {describe, expect, it} from 'vitest';
import {ADMIN_GRAPHQL_URL, AdminApiError, adminRequest} from '../src/graphql/client';
import {
  countSegment,
  createSegment,
  exportFromAllCustomers,
  exportFromIds,
  exportFromSegment,
  fetchCustomerPets,
  PetsConflictError,
  reindexAllCustomers,
  resolvePetNamespace,
  saveCustomerPets,
  toExportRecords,
} from '../src/graphql/api';
import {CAT, CUSTOMER, createAdminMock, deleteOk, DOG, noSleep, petsDoc, setOk} from './helpers';
import type {Pet} from '@minha-doggie/core';

describe('cliente Admin API', () => {
  it('usa o endpoint Direct API (sem token) e repete em THROTTLED', async () => {
    let n = 0;
    const {fetchMock, calls} = createAdminMock({
      Q: () => (++n < 3 ? {errors: [{message: 'Throttled', extensions: {code: 'THROTTLED'}}]} : {data: {ok: true}}),
    });
    const data = await adminRequest<{ok: boolean}>('query Q { shop { id } }', {}, {fetchImpl: fetchMock, sleep: noSleep});
    expect(data.ok).toBe(true);
    expect(calls).toHaveLength(3);
    expect(calls[0].url).toBe(ADMIN_GRAPHQL_URL);
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain('x-shopify-access-token');
  });
  it('classifica ACCESS_DENIED e HTTP 403 como erro de acesso', async () => {
    const denied = createAdminMock({Q: () => ({errors: [{message: 'Access denied', extensions: {code: 'ACCESS_DENIED'}}]})});
    await expect(adminRequest('query Q { a }', {}, {fetchImpl: denied.fetchMock})).rejects.toMatchObject({kind: 'access'});
    const forbidden = createAdminMock({Q: () => new Response('no', {status: 403})});
    await expect(adminRequest('query Q { a }', {}, {fetchImpl: forbidden.fetchMock})).rejects.toBeInstanceOf(AdminApiError);
  });
});

describe('bloco do cliente', () => {
  it('lê pets e deteta índices desatualizados', async () => {
    const {fetchMock} = createAdminMock({
      MinhaDoggieAdminCustomerPets: () => ({
        data: {customer: {id: CUSTOMER, pets: {value: petsDoc(DOG, CAT), compareDigest: 'd1'}, petSpecies: {value: '["cao"]'}, petCount: {value: '2'}}},
      }),
    });
    const state = await fetchCustomerPets(CUSTOMER, {fetchImpl: fetchMock});
    expect(state.pets?.map((p) => p.name)).toEqual(['Bolinhas', 'Mia']);
    expect(state.compareDigest).toBe('d1');
    expect(state.indexInSync).toBe(false);
  });
  it('JSON ilegível → pets null (edição bloqueada)', async () => {
    const {fetchMock} = createAdminMock({
      MinhaDoggieAdminCustomerPets: () => ({data: {customer: {id: CUSTOMER, pets: {value: '{oops', compareDigest: 'd'}, petSpecies: null, petCount: null}}}),
    });
    expect((await fetchCustomerPets(CUSTOMER, {fetchImpl: fetchMock})).pets).toBeNull();
  });
  it('grava pets + pet_count + pet_species numa só chamada metafieldsSet', async () => {
    const {fetchMock, calls} = createAdminMock({MinhaDoggieAdminSetPets: setOk});
    const digest = await saveCustomerPets(CUSTOMER, [DOG, CAT] as Pet[], 'd1', {fetchImpl: fetchMock});
    expect(digest).toBe('new-pets');
    expect(calls).toHaveLength(1);
    const inputs = calls[0].variables.metafields as Array<Record<string, string>>;
    expect(inputs.map((i) => [i.key, i.type, i.value === undefined])).toEqual([
      ['pets', 'json', false],
      ['pet_count', 'number_integer', false],
      ['pet_species', 'list.single_line_text_field', false],
    ]);
    expect(inputs[0].compareDigest).toBe('d1');
    expect(inputs.every((i) => i.namespace === '$app' && i.ownerId === CUSTOMER)).toBe(true);
  });
  it('remover o último companheiro: pet_count=0 e metafieldsDelete de pet_species', async () => {
    const {fetchMock, opNames, calls} = createAdminMock({MinhaDoggieAdminSetPets: setOk, MinhaDoggieAdminDeletePetIndex: deleteOk});
    await saveCustomerPets(CUSTOMER, [], 'd1', {fetchImpl: fetchMock});
    expect(opNames()).toEqual(['MinhaDoggieAdminSetPets', 'MinhaDoggieAdminDeletePetIndex']);
    expect(calls[1].variables.metafields).toEqual([{ownerId: CUSTOMER, namespace: '$app', key: 'pet_species'}]);
  });
  it('compareDigest desatualizado → PetsConflictError (nada é gravado)', async () => {
    const {fetchMock} = createAdminMock({
      MinhaDoggieAdminSetPets: () => ({data: {metafieldsSet: {metafields: [], userErrors: [{field: ['metafields', '0'], message: 'stale', code: 'INVALID_COMPARE_DIGEST'}]}}}),
    });
    await expect(saveCustomerPets(CUSTOMER, [DOG] as Pet[], 'old', {fetchImpl: fetchMock})).rejects.toBeInstanceOf(PetsConflictError);
  });
});

describe('reindexação (backfill)', () => {
  const page1 = [
    {id: 'gid://shopify/Customer/1', pets: null, petSpecies: null, petCount: null},
    {id: 'gid://shopify/Customer/2', pets: {value: petsDoc(DOG), compareDigest: 'a'}, petSpecies: {value: '["cao"]'}, petCount: {value: '1'}},
    {id: 'gid://shopify/Customer/3', pets: {value: petsDoc(DOG, CAT), compareDigest: 'b'}, petSpecies: null, petCount: null},
  ];
  const page2 = [
    {id: 'gid://shopify/Customer/4', pets: {value: '[]', compareDigest: 'c'}, petSpecies: {value: '["gato"]'}, petCount: {value: '1'}},
    {id: 'gid://shopify/Customer/5', pets: {value: 'not json', compareDigest: 'e'}, petSpecies: null, petCount: null},
  ];

  it('pagina todos os clientes e só escreve onde há diferenças, sem alterar pets', async () => {
    const writes: Array<Array<Record<string, string>>> = [];
    const {fetchMock, calls} = createAdminMock({
      MinhaDoggieAdminIndexScan: (v) =>
        v.after == null
          ? {data: {customers: {nodes: page1, pageInfo: {hasNextPage: true, endCursor: 'p2'}}}}
          : {data: {customers: {nodes: page2, pageInfo: {hasNextPage: false, endCursor: null}}}},
      MinhaDoggieAdminSetPets: (v) => {
        writes.push(v.metafields as Array<Record<string, string>>);
        return setOk(v);
      },
      MinhaDoggieAdminDeletePetIndex: deleteOk,
    });
    const progress: string[] = [];
    const summary = await reindexAllCustomers({fetchImpl: fetchMock, onProgress: (p) => progress.push(`${p.phase}:${p.done}`)});
    expect(summary).toEqual({scanned: 5, withPets: 2, alreadyInSync: 1, repaired: 2, conflicts: 0, unreadable: 1, failed: 0, truncated: false});
    expect(calls.filter((c) => c.query.includes('MinhaDoggieAdminIndexScan')).map((c) => c.variables.after)).toEqual([null, 'p2']);
    // Cliente 3: pets reescrito com o valor BRUTO + compareDigest; índices calculados.
    expect(writes[0]).toEqual([
      {ownerId: 'gid://shopify/Customer/3', namespace: '$app', key: 'pets', type: 'json', value: petsDoc(DOG, CAT), compareDigest: 'b'},
      {ownerId: 'gid://shopify/Customer/3', namespace: '$app', key: 'pet_count', type: 'number_integer', value: '2'},
      {ownerId: 'gid://shopify/Customer/3', namespace: '$app', key: 'pet_species', type: 'list.single_line_text_field', value: '["cao","gato"]'},
    ]);
    // Cliente 4: sem companheiros → contagem 0 + remoção de pet_species.
    expect(writes[1].map((w) => [w.key, w.value])).toEqual([
      ['pets', '[]'],
      ['pet_count', '0'],
    ]);
    expect(progress).toEqual(['scan:3', 'scan:5', 'write:1', 'write:2']);
  });

  it('conta conflitos (cliente editou durante o backfill) sem abortar', async () => {
    const {fetchMock} = createAdminMock({
      MinhaDoggieAdminIndexScan: () => ({data: {customers: {nodes: [page1[2]], pageInfo: {hasNextPage: false, endCursor: null}}}}),
      MinhaDoggieAdminSetPets: () => ({data: {metafieldsSet: {metafields: [], userErrors: [{field: null, message: 'stale', code: 'STALE_OBJECT'}]}}}),
    });
    const summary = await reindexAllCustomers({fetchImpl: fetchMock});
    expect(summary.conflicts).toBe(1);
    expect(summary.repaired).toBe(0);
  });
});

describe('exportação', () => {
  const node = (id: number, pets: string | null, extra: Record<string, unknown> = {}) => ({
    id: `gid://shopify/Customer/${id}`,
    firstName: 'Ana',
    lastName: 'Silva',
    defaultEmailAddress: {emailAddress: `ana${id}@example.com`},
    pets: pets == null ? null : {value: pets},
    ...extra,
  });

  it('toExportRecords ignora clientes sem companheiros e conta JSON ilegível', () => {
    const {records, unreadable} = toExportRecords([
      node(1, petsDoc(DOG)),
      node(2, null),
      node(3, petsDoc()),
      node(4, '{bad'),
      null,
      node(5, petsDoc(CAT), {firstName: null, lastName: ' ', defaultEmailAddress: null}),
    ]);
    expect(records.map((r) => [r.customerId, r.name, r.email, r.pets.length])).toEqual([
      ['gid://shopify/Customer/1', 'Ana Silva', 'ana1@example.com', 1],
      ['gid://shopify/Customer/5', '', '', 1],
    ]);
    expect(unreadable).toBe(1);
  });

  it('varrimento completo pagina customers', async () => {
    const {fetchMock, calls} = createAdminMock({
      MinhaDoggieAdminExportScan: (v) =>
        v.after == null
          ? {data: {customers: {nodes: [node(1, petsDoc(DOG))], pageInfo: {hasNextPage: true, endCursor: 'x'}}}}
          : {data: {customers: {nodes: [node(2, petsDoc(CAT, {...DOG, id: 'cccccccc-0000-4000-8000-000000000003'}))], pageInfo: {hasNextPage: false, endCursor: null}}}},
    });
    const result = await exportFromAllCustomers({fetchImpl: fetchMock});
    expect(result.scanned).toBe(2);
    expect(result.records.flatMap((r) => r.pets.map((p) => p.name))).toEqual(['Bolinhas', 'Mia', 'Bolinhas']);
    expect(calls.map((c) => c.variables.first)).toEqual([100, 100]);
  });

  it('via segmento usa customerSegmentMembers com a consulta pet_count >= 1', async () => {
    const {fetchMock, calls} = createAdminMock({
      MinhaDoggieAdminExportSegment: () => ({
        data: {customerSegmentMembers: {edges: [{node: node(9, petsDoc(DOG), {id: 'gid://shopify/CustomerSegmentMember/9'})}], pageInfo: {hasNextPage: false, endCursor: null}}},
      }),
    });
    const result = await exportFromSegment('metafields.app--1.pet_count >= 1', {fetchImpl: fetchMock});
    expect(calls[0].variables).toEqual({query: 'metafields.app--1.pet_count >= 1', first: 250, after: null});
    expect(result.records).toHaveLength(1);
  });

  it('seleção: pede os ids em blocos de 100', async () => {
    const ids = Array.from({length: 230}, (_, i) => `gid://shopify/Customer/${i + 1}`);
    const {fetchMock, calls} = createAdminMock({
      MinhaDoggieAdminExportNodes: (v) => ({data: {nodes: (v.ids as string[]).map((id, i) => (i === 0 ? {...node(1, petsDoc(DOG)), id} : null))}}),
    });
    const result = await exportFromIds(ids, {fetchImpl: fetchMock});
    expect(calls.map((c) => (c.variables.ids as string[]).length)).toEqual([100, 100, 30]);
    expect(result.records).toHaveLength(3);
  });
});

describe('segmentos', () => {
  it('lê o namespace resolvido e confirma com as sugestões do editor', async () => {
    const {fetchMock} = createAdminMock({
      MinhaDoggieAdminPetDefinitions: () => ({
        data: {
          metafieldDefinitions: {nodes: [{namespace: 'app--42', key: 'pets', name: 'x'}, {namespace: 'app--42', key: 'pet_species', name: 'y'}]},
          segmentFilterSuggestions: {nodes: [{queryName: 'metafields.other--1.pet_species', localizedName: 'a'}, {queryName: 'metafields.app--42.pet_species', localizedName: 'b'}]},
        },
      }),
    });
    expect(await resolvePetNamespace({fetchImpl: fetchMock})).toEqual({
      namespace: 'app--42',
      keys: ['pets', 'pet_species'],
      suggestedQueryName: 'metafields.app--42.pet_species',
    });
  });
  it('sem definições → namespace null', async () => {
    const {fetchMock} = createAdminMock({
      MinhaDoggieAdminPetDefinitions: () => ({data: {metafieldDefinitions: {nodes: []}, segmentFilterSuggestions: {nodes: []}}}),
    });
    expect((await resolvePetNamespace({fetchImpl: fetchMock})).namespace).toBeNull();
  });
  it('countSegment e createSegment', async () => {
    const {fetchMock} = createAdminMock({
      MinhaDoggieAdminSegmentCount: () => ({data: {customerSegmentMembers: {totalCount: 7}}}),
      MinhaDoggieAdminSegmentCreate: (v) =>
        v.name === 'dup'
          ? {data: {segmentCreate: {segment: null, userErrors: [{field: ['name'], message: 'Name has already been taken'}]}}}
          : {data: {segmentCreate: {segment: {id: 'gid://shopify/Segment/1', name: v.name}, userErrors: []}}},
    });
    expect(await countSegment('q', {fetchImpl: fetchMock})).toBe(7);
    expect(await createSegment('ok', 'q', {fetchImpl: fetchMock})).toBe('gid://shopify/Segment/1');
    await expect(createSegment('dup', 'q', {fetchImpl: fetchMock})).rejects.toThrow('Name has already been taken');
  });
});
