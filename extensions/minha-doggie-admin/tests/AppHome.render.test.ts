/// <reference types="@shopify/ui-extensions/admin.app.home.render" />
/**
 * Renderização da página principal da app no Admin (admin.app.home.render)
 * com @shopify/ui-extensions-tester + jsdom.
 */
import {fireEvent, waitFor} from '@testing-library/preact';
import {render} from 'preact';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getExtension} from '@shopify/ui-extensions-tester';
import {createAdminMock, DOG, petsDoc} from './helpers';

const extension = getExtension('admin.app.home.render');

beforeEach(() => extension.setUp());
afterEach(() => {
  render(null, document.body);
  extension.tearDown();
});

const text = () => document.body.textContent ?? '';

function prop(node: unknown, name: string): unknown {
  const el = node as Element;
  return el.getAttribute(name) ?? (node as Record<string, unknown>)[name];
}

describe('AppHome (admin.app.home.render)', () => {
  it('renderiza o painel do banner, configurações da conta de cliente, estado das extensões e ferramentas de admin', async () => {
    const mock = createAdminMock({
      MinhaDoggieAdminBanner: () => ({
        data: {
          shop: {
            id: 'gid://shopify/Shop/1',
            banner: {
              value: JSON.stringify({
                version: 1,
                enabled: true,
                imageUrl: 'https://cdn.shopify.com/s/files/1/banner.jpg',
                alt: 'Banner DOGGIE',
              }),
            },
          },
        },
      }),
      MinhaDoggieAdminSetBanner: () => ({
        data: {
          metafieldsSet: {
            metafields: [{key: 'banner'}],
            userErrors: [],
          },
        },
      }),
      MinhaDoggieAdminLibraryFiles: () => ({
        data: {
          files: {
            nodes: [
              {
                id: 'gid://shopify/MediaImage/101',
                alt: 'Banner da Biblioteca',
                createdAt: '2026-10-20T10:00:00Z',
                image: {
                  url: 'https://cdn.shopify.com/s/files/1/library-banner.jpg',
                },
              },
            ],
          },
        },
      }),
      MinhaDoggieAdminPetDefinitions: () => ({
        data: {
          metafieldDefinitions: {
            nodes: [
              {namespace: 'app--123456', key: 'pet_species', name: 'Espécies dos companheiros (Minha DOGGIE)'},
              {namespace: 'app--123456', key: 'pet_count', name: 'Número de companheiros (Minha DOGGIE)'},
            ],
          },
          segmentFilterSuggestions: {
            nodes: [{queryName: 'metafields.app--123456.pet_species', localizedName: 'Espécies dos companheiros'}],
          },
        },
      }),
      MinhaDoggieAdminExportScan: () => ({
        data: {
          customers: {
            pageInfo: {hasNextPage: false, endCursor: null},
            nodes: [
              {
                id: 'gid://shopify/Customer/9',
                firstName: 'Paulo',
                lastName: 'Spiguel',
                defaultEmailAddress: {emailAddress: 'paulo@example.com'},
                pets: {value: petsDoc(DOG)},
              },
            ],
          },
        },
      }),
    });
    extension.fetch = mock.fetchMock as unknown as typeof fetch;
    (extension.shopify as unknown as {app: {extensions: () => Promise<unknown[]>}}).app = {
      extensions: vi.fn(async () => [
        {handle: 'minha-doggie', status: 'active', activations: []},
        {handle: 'minha-doggie-admin', status: 'available', activations: []},
      ]),
    };

    await extension.render();

    const page = document.body.querySelector('s-page');
    expect(page).not.toBeNull();
    expect(prop(page, 'heading')).toBe('DOGGIE • Conta de Cliente & Gestão');

    // Secções documentadas, incluindo o banner
    const sections = Array.from(document.body.querySelectorAll('s-section')).map((s) => prop(s, 'heading'));
    expect(sections).toContain('Banner de destaque na conta de cliente');
    expect(sections).toContain('Configurações da página «Minha DOGGIE» (Conta de cliente)');
    expect(sections).toContain('Extensões e locais no Admin');
    expect(text()).toContain('hero_image_url');
    expect(text()).toContain('hero_image_alt');
    expect(text()).toContain('subscriptions_url');
    expect(text()).toContain('store_url');
    expect(text()).toContain('#92278F');
    expect(text()).toContain('#DA1C5C');

    // Banner carregado, seleção de imagem da biblioteca e possibilidade de guardar
    await waitFor(() => expect(text()).toContain('Guardar banner'));
    const chooseFromLibBtn = Array.from(document.body.querySelectorAll('s-button')).find(
      (b) => b.textContent?.trim() === 'Escolher imagem da biblioteca',
    )!;
    fireEvent.click(chooseFromLibBtn);
    await waitFor(() => expect(text()).toContain('library-banner.jpg'));
    const selectImgBtn = Array.from(document.body.querySelectorAll('s-button')).find(
      (b) => b.textContent?.trim() === 'Selecionar',
    )!;
    fireEvent.click(selectImgBtn);

    const saveBannerBtn = Array.from(document.body.querySelectorAll('s-button')).find(
      (b) => b.textContent?.trim() === 'Guardar banner',
    )!;
    fireEvent.click(saveBannerBtn);
    await waitFor(() => expect(text()).toContain('Banner guardado e publicado na conta de cliente.'));

    // Estado das extensões carregado de shopify.app.extensions()
    await waitFor(() => expect(text()).toContain('Ativa'));
    expect(text()).toContain('Disponível');

    // Segmentos por espécie carregados com o namespace real
    await waitFor(() => expect(text()).toContain('metafields.app--123456.pet_species'));

    // Exportar CSV a partir da página principal
    const generate = Array.from(document.body.querySelectorAll('s-button')).find((b) => b.textContent?.trim() === 'Gerar CSV')!;
    fireEvent.click(generate);
    await waitFor(() => expect(text()).toContain('1 companheiro(s) de 1 cliente(s)'));
  });
});
