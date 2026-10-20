/// <reference types="@shopify/ui-extensions/admin.customer-index.selection-action.render" />
import {fireEvent, waitFor} from '@testing-library/preact';
import {render} from 'preact';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {getExtension} from '@shopify/ui-extensions-tester';
import {createAdminMock, DOG, petsDoc} from './helpers';

const extension = getExtension('admin.customer-index.selection-action.render');

beforeEach(() => extension.setUp());
afterEach(() => {
  render(null, document.body);
  extension.tearDown();
});

function prop(node: unknown, name: string): unknown {
  const el = node as Element;
  return el.getAttribute(name) ?? (node as Record<string, unknown>)[name];
}

describe('exportar selecionados', () => {
  it('gera o CSV no navegador e oferece download via data URL', async () => {
    const mock = createAdminMock({
      MinhaDoggieAdminExportNodes: (v) => ({
        data: {
          nodes: (v.ids as string[]).map((id) => ({
            id,
            firstName: 'Ana',
            lastName: '=Silva',
            defaultEmailAddress: {emailAddress: 'ana@example.com'},
            pets: {value: petsDoc(DOG)},
          })),
        },
      }),
    });
    extension.fetch = mock.fetchMock as unknown as typeof fetch;
    (extension.shopify as unknown as {data: unknown}).data = {selected: [{id: 'gid://shopify/Customer/5'}]};
    await extension.render();
    expect(document.body.textContent).toContain('1 cliente selecionado.');
    const generate = Array.from(document.body.querySelectorAll('s-button')).find((b) => b.textContent?.trim() === 'Gerar CSV')!;
    fireEvent.click(generate);
    await waitFor(() => expect(document.body.textContent).toContain('1 companheiro(s) de 1 cliente(s)'));
    const download = Array.from(document.body.querySelectorAll('s-button')).find((b) => b.textContent?.trim() === 'Descarregar CSV')!;
    expect(prop(download, 'download')).toMatch(/^minha-doggie-companheiros-\d{4}-\d{2}-\d{2}\.csv$/);
    const href = String(prop(download, 'href'));
    expect(href.startsWith('data:text/csv;charset=utf-8,')).toBe(true);
    const csv = decodeURIComponent(href.slice('data:text/csv;charset=utf-8,'.length));
    expect(csv).toBe("\uFEFFcustomer id;name;email;nome;espécie;raça;idade\r\n5;Ana =Silva;ana@example.com;Bolinhas;Cão;Labrador;3 anos\r\n");
    expect(mock.calls[0].variables).toEqual({ids: ['gid://shopify/Customer/5']});
  });
});
