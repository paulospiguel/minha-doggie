/// <reference types="@shopify/ui-extensions/customer-account.page.render" />
/**
 * Testes de renderização com @shopify/ui-extensions-tester (mock oficial do
 * global `shopify` + jsdom). Não substituem o teste numa loja de
 * desenvolvimento: os web components não são "pintados" pelo host real.
 */
import {fireEvent, waitFor} from '@testing-library/preact';
import {render} from 'preact';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {getExtension} from '@shopify/ui-extensions-tester';
import {createApiMock, CUSTOMER_GID, type MockState} from './helpers';

const extension = getExtension('customer-account.page.render');

const STORED_PET = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  name: 'Bolinhas',
  species: 'dog',
  breed: 'Labrador',
  age: {value: 3, unit: 'years'},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const ORDERS = [
  {id: 'gid://shopify/Order/1003', name: '#1003', processedAt: '2026-10-12T09:30:00Z', cancelledAt: null, fulfillmentStatus: 'FULFILLED', totalPrice: {amount: '24.9', currencyCode: 'EUR'},
    lineItems: {nodes: [{title: 'Ração Golden', image: {url: 'https://cdn.shopify.com/s/files/1/racao.png?width=160', altText: 'Saco de ração'}}]}},
  {id: 'gid://shopify/Order/1002', name: '#1002', processedAt: '2026-09-02T09:30:00Z', cancelledAt: null, fulfillmentStatus: 'UNFULFILLED', totalPrice: {amount: '12', currencyCode: 'EUR'},
    lineItems: {nodes: [{title: 'Brinquedo', image: {url: 'https://evil.example.com/x.png', altText: null}}]}},
];

function baseState(overrides: Partial<MockState> = {}): MockState {
  return {firstName: 'Ana', petsValue: null, digest: null, orders: [], ...overrides};
}

function setup(state: MockState, settings: Record<string, string> = {}) {
  const api = createApiMock(state);
  extension.fetch = api.fetchMock as unknown as typeof fetch;
  (extension.shopify.settings as {value: unknown}).value = settings;
  return api;
}

function text(): string {
  return document.body.textContent ?? '';
}

function byText<T extends Element = HTMLElement>(selector: string, label: string): T {
  const match = Array.from(document.body.querySelectorAll(selector)).find((el) => el.textContent?.trim() === label);
  if (!match) throw new Error(`${selector} "${label}" não encontrado`);
  return match as T;
}

/** Lê um atributo/propriedade de um web component (aceita os tipos Polaris, que não estendem Element). */
function prop(node: unknown, name: string): unknown {
  const el = node as Element;
  return el.getAttribute(name) ?? (node as Record<string, unknown>)[name];
}

function pageHeading(): unknown {
  return prop(document.body.querySelector('s-page')!, 'heading');
}

function petCard(name: string): HTMLElement {
  const card = Array.from(document.body.querySelectorAll('s-clickable')).find(
    (el) => prop(el, 'accessibilityLabel') === `Ver e editar ${name}`,
  );
  if (!card) throw new Error(`cartão ${name} não encontrado`);
  return card as HTMLElement;
}

function setField(selector: string, label: string, value: string, event: 'input' | 'change' = 'input') {
  const field = document.body.querySelector(`${selector}[label="${label}"]`) as (HTMLElement & {value?: string}) | null;
  if (!field) throw new Error(`campo ${label} não encontrado`);
  field.value = value;
  if (event === 'input') fireEvent.input(field);
  else fireEvent.change(field);
}

beforeEach(() => {
  extension.setUp();
});

afterEach(() => {
  // Desmonta a árvore Preact (em produção o host destrói o worker).
  render(null, document.body);
  extension.tearDown();
});

describe('boas-vindas', () => {
  it('saúda o cliente autenticado pelo primeiro nome real', async () => {
    setup(baseState());
    await extension.render();
    await waitFor(() => expect(pageHeading()).toBe('Olá, Ana!'));
    expect(prop(document.body.querySelector('s-page')!, 'subheading')).toBe('Esta é a tua área DOGGIE.');
    expect(text()).toContain('Tudo o que precisas para cuidar de quem te faz mais feliz.');
    expect(byText('s-button', 'Gerir perfil').getAttribute('href') ?? (byText('s-button', 'Gerir perfil') as unknown as {href: string}).href).toBe(
      'shopify:customer-account/profile',
    );
  });

  it('não inventa nome quando o cliente não tem primeiro nome', async () => {
    setup(baseState({firstName: null}));
    await extension.render();
    await waitFor(() => expect(text()).toContain('Ainda não tens companheiros registados'));
    expect(pageHeading()).toBe('Olá!');
  });

  it('não mostra imagem sem URL configurado e mostra-a com HTTPS', async () => {
    setup(baseState());
    await extension.render();
    expect(document.body.querySelector('s-image')).toBeNull();
    render(null, document.body);
    extension.tearDown();
    extension.setUp();
    setup(baseState(), {hero_image_url: 'https://cdn.shopify.com/s/files/hero.png'});
    await extension.render();
    const image = document.body.querySelector('s-image')!;
    expect(image).not.toBeNull();
    expect(prop(image, 'src')).toBe('https://cdn.shopify.com/s/files/hero.png');
    expect(prop(image, 'objectFit')).toBe('cover');
    expect(prop(document.body.querySelector('s-section s-grid')!, 'background')).toBeUndefined();
  });

  it('mostra o banner configurado no Admin ($app.banner) quando ativo', async () => {
    setup(
      baseState({
        bannerValue: JSON.stringify({
          version: 1,
          enabled: true,
          imageUrl: 'https://cdn.shopify.com/s/files/1/banner-admin.jpg',
          alt: 'Banner configurado no painel',
        }),
      }),
    );
    await extension.render();
    await waitFor(() => expect(document.body.querySelector('s-image')).not.toBeNull());
    const image = document.body.querySelector('s-image')!;
    expect(prop(image, 'src')).toBe('https://cdn.shopify.com/s/files/1/banner-admin.jpg');
    expect(prop(image, 'alt')).toBe('Banner configurado no painel');
  });
});

describe('companheiros', () => {
  it('mostra estado vazio elegante', async () => {
    setup(baseState());
    await extension.render();
    await waitFor(() => expect(text()).toContain('Ainda não tens companheiros registados'));
  });

  it('lista companheiros guardados', async () => {
    setup(baseState({petsValue: JSON.stringify({version: 1, pets: [STORED_PET]}), digest: 'd1'}));
    await extension.render();
    await waitFor(() => expect(text()).toContain('Bolinhas'));
    expect(text()).toContain('Cão • Labrador • 3 anos');
    expect(text()).toContain('3 anos');
    const card = petCard('Bolinhas');
    expect(prop(card, 'commandFor')).toBe('minha-doggie-pet-form');
    expect(card.querySelector('s-avatar')).not.toBeNull();
    expect(Array.from(card.querySelectorAll('s-icon')).map((i) => prop(i, 'type'))).toContain('chevron-right');
  });

  it('adiciona um companheiro via metafieldsSet', async () => {
    const api = setup(baseState());
    await extension.render();
    await waitFor(() => expect(text()).toContain('Ainda não tens companheiros registados'));

    fireEvent.click(byText('s-button', 'Adicionar companheiro'));
    setField('s-text-field', 'Nome', 'Mia');
    const species = document.body.querySelector('s-choice-list') as HTMLElement & {values?: string[]};
    species.values = ['cat'];
    fireEvent.change(species);
    setField('s-number-field', 'Idade aproximada (opcional)', '6');
    setField('s-select', 'Unidade', 'months', 'change');
    fireEvent.click(byText('s-button', 'Guardar'));

    await waitFor(() => expect(api.calls.some((c) => c.query.includes('metafieldsSet'))).toBe(true));
    const mutation = api.calls.find((c) => c.query.includes('metafieldsSet'))!;
    const input = (mutation.variables.metafields as Array<Record<string, string>>)[0];
    expect(input.ownerId).toBe(CUSTOMER_GID);
    expect(input.namespace).toBe('$app');
    const saved = JSON.parse(input.value);
    expect(saved.pets).toHaveLength(1);
    expect(saved.pets[0]).toMatchObject({name: 'Mia', species: 'cat', breed: '', age: {value: 6, unit: 'months'}});
    await waitFor(() => expect(text()).toContain('6 meses'));
    expect(text()).toContain('Mia');
  });

  it('mostra erro de validação e não grava', async () => {
    const api = setup(baseState());
    await extension.render();
    await waitFor(() => expect(text()).toContain('Ainda não tens companheiros registados'));
    fireEvent.click(byText('s-button', 'Adicionar companheiro'));
    fireEvent.click(byText('s-button', 'Guardar'));
    await waitFor(() => {
      const name = document.body.querySelector('s-text-field[label="Nome"]') as HTMLElement & {error?: string};
      expect(name.error ?? name.getAttribute('error')).toBe('Indica o nome do teu companheiro.');
    });
    expect(api.calls.some((c) => c.query.includes('metafieldsSet'))).toBe(false);
  });

  it('edita um companheiro existente com compareDigest', async () => {
    const api = setup(baseState({petsValue: JSON.stringify({version: 1, pets: [STORED_PET]}), digest: 'd1'}));
    await extension.render();
    await waitFor(() => expect(text()).toContain('Bolinhas'));
    fireEvent.click(petCard('Bolinhas'));
    await waitFor(() => {
      const name = document.body.querySelector('s-text-field[label="Nome"]') as HTMLElement & {value?: string};
      expect(name.value ?? name.getAttribute('value')).toBe('Bolinhas');
    });
    setField('s-text-field', 'Nome', 'Bolinhas Jr');
    fireEvent.click(byText('s-button', 'Guardar'));
    await waitFor(() => expect(api.calls.some((c) => c.query.includes('metafieldsSet'))).toBe(true));
    const input = (api.calls.find((c) => c.query.includes('metafieldsSet'))!.variables.metafields as Array<Record<string, string>>)[0];
    expect(input.compareDigest).toBe('d1');
    const saved = JSON.parse(input.value);
    expect(saved.pets[0]).toMatchObject({id: STORED_PET.id, name: 'Bolinhas Jr', createdAt: STORED_PET.createdAt});
  });

  it('remove apenas após confirmação (no mesmo modal)', async () => {
    const api = setup(baseState({petsValue: JSON.stringify({version: 1, pets: [STORED_PET]}), digest: 'd1'}));
    await extension.render();
    await waitFor(() => expect(text()).toContain('Bolinhas'));
    fireEvent.click(petCard('Bolinhas'));
    await waitFor(() => expect(byText('s-modal s-button', 'Remover companheiro')).toBeTruthy());
    fireEvent.click(byText('s-modal s-button', 'Remover companheiro'));
    expect(api.calls.some((c) => c.query.includes('metafieldsSet'))).toBe(false);
    await waitFor(() => expect(text()).toContain('Vais remover Bolinhas da tua conta.'));
    // "Manter" volta ao formulário sem gravar.
    fireEvent.click(byText('s-modal s-button', 'Manter'));
    await waitFor(() => expect(document.body.querySelector('s-text-field[label="Nome"]')).not.toBeNull());
    expect(api.calls.some((c) => c.query.includes('metafieldsSet'))).toBe(false);
    fireEvent.click(byText('s-modal s-button', 'Remover companheiro'));
    await waitFor(() => expect(text()).toContain('Vais remover Bolinhas da tua conta.'));
    fireEvent.click(byText('s-modal s-button', 'Remover'));
    await waitFor(() => expect(api.calls.some((c) => c.query.includes('metafieldsSet'))).toBe(true));
    const input = (api.calls.find((c) => c.query.includes('metafieldsSet'))!.variables.metafields as Array<Record<string, string>>)[0];
    expect(JSON.parse(input.value).pets).toEqual([]);
    await waitFor(() => expect(text()).toContain('Ainda não tens companheiros registados'));
  });

  it('não mostra "Remover companheiro" ao adicionar', async () => {
    setup(baseState());
    await extension.render();
    await waitFor(() => expect(text()).toContain('Ainda não tens companheiros registados'));
    fireEvent.click(byText('s-button', 'Adicionar companheiro'));
    expect(() => byText('s-modal s-button', 'Remover companheiro')).toThrow();
  });

  it('em conflito (compareDigest desatualizado) mostra aviso e recarrega', async () => {
    const api = setup(
      baseState({
        petsValue: JSON.stringify({version: 1, pets: [STORED_PET]}),
        digest: 'old',
        userErrors: [{field: ['metafields', '0', 'compareDigest'], message: 'stale', code: 'INVALID_COMPARE_DIGEST'}],
      }),
    );
    await extension.render();
    await waitFor(() => expect(text()).toContain('Bolinhas'));
    fireEvent.click(petCard('Bolinhas'));
    setField('s-text-field', 'Nome', 'Outro');
    fireEvent.click(byText('s-button', 'Guardar'));
    await waitFor(() => expect(text()).toContain('foram alterados noutra janela'));
    expect(api.calls.filter((c) => c.query.includes('query MinhaDoggieCustomer')).length).toBe(2);
  });

  it('bloqueia alterações se os dados guardados estiverem corrompidos', async () => {
    setup(baseState({petsValue: '{corrompido', digest: 'd1'}));
    await extension.render();
    await waitFor(() => expect(text()).toContain('as alterações estão temporariamente bloqueadas'));
    const tile = Array.from(document.body.querySelectorAll('s-clickable')).find((c) =>
      String(prop(c, 'accessibilityLabel') ?? '').startsWith('Adicionar companheiro.'),
    ) as (HTMLElement & {disabled?: boolean}) | undefined;
    expect(tile).toBeTruthy();
    expect(tile!.disabled ?? tile!.hasAttribute('disabled')).toBe(true);
    // Sem companheiros legíveis não há ligação "Adicionar +" no cabeçalho.
    expect(() => byText('s-link', 'Adicionar +')).toThrow();
  });
});

describe('encomendas', () => {
  it('mostra até 3 encomendas reais com link para o detalhe nativo', async () => {
    setup(baseState({orders: ORDERS}));
    await extension.render();
    await waitFor(() => expect(text()).toContain('#1003'));
    expect(text()).toContain('Enviada');
    expect(text()).toContain('Por enviar');
    expect(text()).toContain('12 de outubro de 2026');
    const links = Array.from(document.body.querySelectorAll('s-clickable'))
      .map((el) => prop(el, 'href'))
      .filter((href) => typeof href === 'string' && href.startsWith('shopify:customer-account/orders/'));
    expect(links).toEqual(['shopify:customer-account/orders/1003', 'shopify:customer-account/orders/1002']);
    const badges = Array.from(document.body.querySelectorAll('s-badge'));
    expect(badges.map((b) => prop(b, 'icon'))).toEqual(['check-circle', 'clock']);
    const thumbs = Array.from(document.body.querySelectorAll('s-product-thumbnail'));
    expect(thumbs).toHaveLength(2);
    expect(prop(thumbs[0], 'src')).toBe('https://cdn.shopify.com/s/files/1/racao.png?width=160');
    expect(prop(thumbs[1], 'src') ?? null).toBeNull();
    expect(prop(byText('s-link', 'Ver todas ›'), 'href')).toBe('shopify:customer-account/orders');
  });

  it('mostra estado vazio sem encomendas', async () => {
    setup(baseState());
    await extension.render();
    await waitFor(() => expect(text()).toContain('Ainda não tens encomendas'));
  });

  it('isola o erro das encomendas (o resto da página continua)', async () => {
    setup(baseState({ordersError: true}));
    await extension.render();
    await waitFor(() => expect(text()).toContain('Não foi possível carregar as encomendas recentes.'));
    await waitFor(() => expect(pageHeading()).toBe('Olá, Ana!'));
  });
});

describe('subscrições e ações rápidas', () => {
  it('estado vazio sem URL configurado (nada inventado)', async () => {
    setup(baseState());
    await extension.render();
    expect(text()).toContain('Sem subscrições para mostrar');
    expect(() => byText('s-link', 'Gerir subscrição ›')).toThrow();
  });

  it('botão de gestão quando o URL HTTPS está configurado', async () => {
    setup(baseState(), {subscriptions_url: 'https://subscricoes.example.com/portal'});
    await extension.render();
    expect(prop(byText('s-link', 'Gerir subscrição ›'), 'href')).toBe('https://subscricoes.example.com/portal');
    expect(text()).toContain('Entregas recorrentes');
  });

  it('ignora URL de subscrições não-HTTPS', async () => {
    setup(baseState(), {subscriptions_url: 'http://inseguro.example.com'});
    await extension.render();
    expect(text()).toContain('Sem subscrições para mostrar');
  });

  it('ações rápidas: três mosaicos com ícone, título, descrição e destino real', async () => {
    setup(baseState());
    await extension.render();
    await waitFor(() => expect(text()).toContain('Ainda não tens companheiros registados'));
    const tile = (title: string) => {
      const el = Array.from(document.body.querySelectorAll('s-clickable')).find((c) =>
        String(prop(c, 'accessibilityLabel') ?? '').startsWith(`${title}.`),
      );
      if (!el) throw new Error(`mosaico ${title} não encontrado`);
      return el;
    };
    expect(prop(tile('Ver encomendas'), 'href')).toBe('shopify:customer-account/orders');
    expect(prop(tile('Atualizar morada'), 'href')).toBe('shopify:customer-account/profile');
    expect(prop(tile('Adicionar companheiro'), 'commandFor')).toBe('minha-doggie-pet-form');
    expect(text()).toContain('Mantém os teus dados atualizados.');
    expect(text()).toContain('Regista um novo membro da família.');
    expect(Array.from(tile('Atualizar morada').querySelectorAll('s-icon')).map((i) => prop(i, 'type'))).toEqual([
      'location',
      'chevron-right',
    ]);
    expect(prop(byText('s-button', 'Voltar a comprar'), 'href')).toBe('https://store.doggie.pt');
  });

  it('cabeçalhos de secção com ícones oficiais', async () => {
    setup(baseState());
    await extension.render();
    const headerIcons = Array.from(document.body.querySelectorAll('s-section s-grid > s-stack > s-icon')).map((i) =>
      prop(i, 'type'),
    );
    expect(headerIcons).toEqual(expect.arrayContaining(['star', 'order', 'calendar', 'grid']));
  });

  it('mostra o slogan da marca', async () => {
    setup(baseState());
    await extension.render();
    expect(text()).toContain('Much more than a pet!');
  });
});
