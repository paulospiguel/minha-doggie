/// <reference types="@shopify/ui-extensions/admin.customer-details.block.render" />
/**
 * Renderização do bloco com @shopify/ui-extensions-tester (mock oficial do global
 * `shopify`) + jsdom. Não substitui o teste numa loja de desenvolvimento.
 */
import {fireEvent, waitFor} from '@testing-library/preact';
import {render} from 'preact';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {getExtension} from '@shopify/ui-extensions-tester';
import {CAT, CUSTOMER, createAdminMock, deleteOk, DOG, petsDoc, setOk} from './helpers';

const extension = getExtension('admin.customer-details.block.render');

interface Store {
  pets: string | null;
  digest: string | null;
  species: string | null;
  count: string | null;
}

function setup(store: Store, overrides: Record<string, (v: Record<string, unknown>) => unknown> = {}) {
  const mock = createAdminMock({
    MinhaDoggieAdminCustomerPets: () => ({
      data: {
        customer: {
          id: CUSTOMER,
          pets: store.pets == null ? null : {value: store.pets, compareDigest: store.digest},
          petSpecies: store.species == null ? null : {value: store.species},
          petCount: store.count == null ? null : {value: store.count},
        },
      },
    }),
    MinhaDoggieAdminSetPets: (v) => {
      for (const input of v.metafields as Array<{key: string; value: string}>) {
        if (input.key === 'pets') store.pets = input.value;
        if (input.key === 'pet_species') store.species = input.value;
        if (input.key === 'pet_count') store.count = input.value;
      }
      store.digest = 'new';
      return setOk(v);
    },
    MinhaDoggieAdminDeletePetIndex: (v) => {
      store.species = null;
      return deleteOk(v);
    },
    ...overrides,
  });
  extension.fetch = mock.fetchMock as unknown as typeof fetch;
  (extension.shopify as unknown as {data: unknown}).data = {selected: [{id: CUSTOMER}]};
  return mock;
}

const text = () => document.body.textContent ?? '';

function prop(node: unknown, name: string): unknown {
  const el = node as Element;
  return el.getAttribute(name) ?? (node as Record<string, unknown>)[name];
}

function buttonByLabel(label: string): HTMLElement {
  const match = Array.from(document.body.querySelectorAll('s-button')).find(
    (el) => el.textContent?.trim() === label || prop(el, 'accessibilityLabel') === label,
  );
  if (!match) throw new Error(`botão ${label} não encontrado`);
  return match as HTMLElement;
}

function setField(selector: string, label: string, value: string, event: 'input' | 'change' = 'input') {
  const field = document.body.querySelector(`${selector}[label="${label}"]`) as (HTMLElement & {value?: string}) | null;
  if (!field) throw new Error(`campo ${label} não encontrado`);
  field.value = value;
  if (event === 'input') fireEvent.input(field);
  else fireEvent.change(field);
}

beforeEach(() => extension.setUp());
afterEach(() => {
  render(null, document.body);
  extension.tearDown();
});

describe('bloco Companheiros (admin)', () => {
  it('estado de carregamento e depois lista com descrição partilhada', async () => {
    setup({pets: petsDoc(DOG, CAT), digest: 'd1', species: '["cao","gato"]', count: '2'});
    await extension.render();
    expect(document.body.querySelector('s-spinner')).not.toBeNull();
    await waitFor(() => expect(text()).toContain('Bolinhas'));
    expect(text()).toContain('Cão · Labrador · 3 anos');
    expect(text()).toContain('Mia');
    expect(prop(document.body.querySelector('s-admin-block')!, 'collapsedSummary')).toBe('2 companheiros');
    expect(text()).not.toContain('desatualizados');
  });

  it('estado vazio', async () => {
    setup({pets: null, digest: null, species: null, count: null});
    await extension.render();
    await waitFor(() => expect(text()).toContain('Este cliente ainda não registou companheiros.'));
  });

  it('estado de erro com nova tentativa', async () => {
    let fail = true;
    setup({pets: null, digest: null, species: null, count: null}, {
      MinhaDoggieAdminCustomerPets: () => (fail ? {errors: [{message: 'boom'}]} : {data: {customer: {id: CUSTOMER, pets: null, petSpecies: null, petCount: null}}}),
    });
    await extension.render();
    await waitFor(() => expect(text()).toContain('Não foi possível carregar'));
    fail = false;
    fireEvent.click(buttonByLabel('Tentar novamente'));
    await waitFor(() => expect(text()).toContain('ainda não registou'));
  });

  it('adicionar: valida com a lib partilhada e grava pets + índices numa chamada', async () => {
    const store: Store = {pets: petsDoc(DOG), digest: 'd1', species: '["cao"]', count: '1'};
    const mock = setup(store);
    await extension.render();
    await waitFor(() => expect(text()).toContain('Bolinhas'));
    fireEvent.click(buttonByLabel('Adicionar companheiro'));
    await waitFor(() => expect(text()).toContain('Novo companheiro'));
    fireEvent.click(buttonByLabel('Guardar'));
    await waitFor(() => expect(prop(document.body.querySelector('s-text-field[label="Nome"]')!, 'error')).toBe('Indica o nome do companheiro.'));
    setField('s-text-field', 'Nome', 'Tareco');
    setField('s-select', 'Espécie', 'cat', 'change');
    fireEvent.click(buttonByLabel('Guardar'));
    await waitFor(() => expect(text()).toContain('Companheiro guardado.'));
    const write = mock.calls.find((c) => c.query.includes('MinhaDoggieAdminSetPets'))!;
    expect((write.variables.metafields as Array<{key: string}>).map((m) => m.key)).toEqual(['pets', 'pet_count', 'pet_species']);
    expect(store.species).toBe('["cao","gato"]');
    expect(store.count).toBe('2');
    expect(JSON.parse(store.pets!).pets.map((p: {name: string}) => p.name)).toEqual(['Bolinhas', 'Tareco']);
  });

  it('remover pede confirmação; o último remove pet_species', async () => {
    const store: Store = {pets: petsDoc(DOG), digest: 'd1', species: '["cao"]', count: '1'};
    const mock = setup(store);
    await extension.render();
    await waitFor(() => expect(text()).toContain('Bolinhas'));
    fireEvent.click(buttonByLabel('Remover Bolinhas'));
    await waitFor(() => expect(text()).toContain('Remover Bolinhas da conta deste cliente?'));
    expect(mock.calls.some((c) => c.query.includes('MinhaDoggieAdminSetPets'))).toBe(false);
    fireEvent.click(buttonByLabel('Manter'));
    await waitFor(() => expect(text()).not.toContain('da conta deste cliente?'));
    fireEvent.click(buttonByLabel('Remover Bolinhas'));
    await waitFor(() => expect(text()).toContain('da conta deste cliente?'));
    fireEvent.click(buttonByLabel('Remover'));
    await waitFor(() => expect(text()).toContain('Companheiro removido.'));
    expect(store.count).toBe('0');
    expect(store.species).toBeNull();
  });

  it('conflito de concorrência: avisa e recarrega a lista', async () => {
    const store: Store = {pets: petsDoc(DOG), digest: 'd1', species: '["cao"]', count: '1'};
    setup(store, {
      MinhaDoggieAdminSetPets: () => {
        store.pets = petsDoc(DOG, CAT);
        return {data: {metafieldsSet: {metafields: [], userErrors: [{field: null, message: 'stale', code: 'INVALID_COMPARE_DIGEST'}]}}};
      },
    });
    await extension.render();
    await waitFor(() => expect(text()).toContain('Bolinhas'));
    fireEvent.click(buttonByLabel('Editar Bolinhas'));
    await waitFor(() => expect(text()).toContain('Editar companheiro'));
    setField('s-text-field', 'Nome', 'Bolinhas II');
    fireEvent.click(buttonByLabel('Guardar'));
    await waitFor(() => expect(text()).toContain('O cliente alterou os companheiros entretanto.'));
    await waitFor(() => expect(text()).toContain('Mia'));
  });

  it('índices desatualizados: mostra aviso e sincroniza', async () => {
    const store: Store = {pets: petsDoc(DOG, CAT), digest: 'd1', species: null, count: null};
    setup(store);
    await extension.render();
    await waitFor(() => expect(text()).toContain('desatualizados'));
    fireEvent.click(buttonByLabel('Sincronizar índices'));
    await waitFor(() => expect(text()).toContain('Índices sincronizados.'));
    expect(store.species).toBe('["cao","gato"]');
    expect(store.count).toBe('2');
  });

  it('JSON ilegível: edição bloqueada, sem botões de escrita', async () => {
    setup({pets: '{oops', digest: 'd', species: null, count: null});
    await extension.render();
    await waitFor(() => expect(text()).toContain('a edição está bloqueada'));
    expect(document.body.querySelectorAll('s-button')).toHaveLength(0);
  });
});
