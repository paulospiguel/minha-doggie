import {describe, expect, it} from 'vitest';
import {
  formatMoney,
  formatOrderDate,
  legacyIdFromGid,
  orderDetailHref,
  orderStatus,
  orderThumbnail,
  safeThumbnailUrl,
  toRecentOrderSummaries,
} from '../src/lib/orders';
import type {OrderNode} from '../src/types';

const nbsp = /\u00A0|\u202F/g;

function order(overrides: Partial<OrderNode> = {}): OrderNode {
  return {
    id: 'gid://shopify/Order/5551234567',
    name: '#1042',
    processedAt: '2026-10-12T09:30:00Z',
    cancelledAt: null,
    fulfillmentStatus: 'FULFILLED',
    totalPrice: {amount: '24.9', currencyCode: 'EUR'},
    ...overrides,
  };
}

describe('formatMoney', () => {
  it('formata EUR em pt-PT', () => {
    expect(formatMoney({amount: '24.9', currencyCode: 'EUR'}).replace(nbsp, ' ')).toBe('24,90 €');
    expect(formatMoney({amount: '1234.5', currencyCode: 'EUR'}).replace(nbsp, ' ')).toMatch(/^1\s?234,50 €$/);
  });
  it('lida com valores inválidos', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney({amount: 'abc', currencyCode: 'EUR'})).toBe('—');
    expect(formatMoney({amount: '10', currencyCode: 'xx'}).replace(nbsp, ' ')).toBe('10,00 €');
  });
});

describe('formatOrderDate', () => {
  it('formata a data em pt-PT (fuso de Lisboa)', () => {
    expect(formatOrderDate('2026-10-12T09:30:00Z')).toBe('12 de outubro de 2026');
    expect(formatOrderDate('2026-12-31T23:30:00Z')).toBe('31 de dezembro de 2026');
  });
  it('devolve vazio para datas inválidas', () => {
    expect(formatOrderDate('')).toBe('');
    expect(formatOrderDate('not-a-date')).toBe('');
    expect(formatOrderDate(null)).toBe('');
  });
});

describe('links de encomenda', () => {
  it('extrai o id numérico do GID', () => {
    expect(legacyIdFromGid('gid://shopify/Order/5551234567')).toBe('5551234567');
    expect(legacyIdFromGid('gid://shopify/Order/12?key=abc')).toBe('12');
    expect(legacyIdFromGid('5551234567')).toBeNull();
    expect(legacyIdFromGid(null)).toBeNull();
  });
  it('aponta para a página nativa de detalhe ou para a lista', () => {
    expect(orderDetailHref('gid://shopify/Order/5551234567')).toBe('shopify:customer-account/orders/5551234567');
    expect(orderDetailHref('weird')).toBe('shopify:customer-account/orders');
  });
});

describe('orderStatus', () => {
  it('traduz todos os estados da API 2026-10', () => {
    const statuses = ['FULFILLED', 'IN_PROGRESS', 'ON_HOLD', 'OPEN', 'PARTIALLY_FULFILLED', 'PENDING_FULFILLMENT', 'RESTOCKED', 'SCHEDULED', 'UNFULFILLED'];
    for (const status of statuses) {
      expect(orderStatus({fulfillmentStatus: status, cancelledAt: null}).label).not.toBe('Ver estado');
    }
    expect(orderStatus({fulfillmentStatus: 'FULFILLED', cancelledAt: null})).toEqual({label: 'Enviada', tone: 'neutral', icon: 'check-circle'});
    expect(orderStatus({fulfillmentStatus: 'IN_PROGRESS', cancelledAt: null})).toEqual({label: 'Em preparação', tone: 'neutral', icon: 'clock'});
    expect(orderStatus({fulfillmentStatus: 'ON_HOLD', cancelledAt: null})).toMatchObject({tone: 'critical', icon: 'alert-circle'});
  });
  it('dá prioridade a cancelada e trata estados desconhecidos', () => {
    expect(orderStatus({fulfillmentStatus: 'FULFILLED', cancelledAt: '2026-10-13T00:00:00Z'})).toEqual({label: 'Cancelada', tone: 'critical', icon: 'x-circle'});
    expect(orderStatus({fulfillmentStatus: 'SOMETHING_NEW', cancelledAt: null})).toMatchObject({label: 'Ver estado', icon: 'info'});
    expect(orderStatus({fulfillmentStatus: 'CANCELLED', cancelledAt: null}).label).toBe('Ver estado');
  });
});

describe('miniaturas', () => {
  it('aceita só HTTPS da CDN Shopify', () => {
    expect(safeThumbnailUrl('https://cdn.shopify.com/s/files/1/a.png?width=160')).toBe('https://cdn.shopify.com/s/files/1/a.png?width=160');
    expect(safeThumbnailUrl('http://cdn.shopify.com/a.png')).toBeNull();
    expect(safeThumbnailUrl('https://cdn.shopify.com.evil.com/a.png')).toBeNull();
    expect(safeThumbnailUrl('https://evil.example.com/a.png')).toBeNull();
    expect(safeThumbnailUrl('javascript:alert(1)')).toBeNull();
    expect(safeThumbnailUrl(null)).toBeNull();
  });
  it('usa o primeiro artigo e um alt seguro', () => {
    expect(orderThumbnail({lineItems: {nodes: [{title: 'Ração', image: {url: 'https://cdn.shopify.com/a.png', altText: ''}}]}})).toEqual({
      url: 'https://cdn.shopify.com/a.png',
      alt: 'Ração',
    });
    expect(orderThumbnail({lineItems: {nodes: [{title: 'Sem imagem', image: null}]}})).toEqual({url: null, alt: 'Sem imagem'});
    expect(orderThumbnail({lineItems: null})).toEqual({url: null, alt: ''});
    expect(orderThumbnail({})).toEqual({url: null, alt: ''});
  });
});

describe('toRecentOrderSummaries', () => {
  it('ordena pela mais recente e limita a 3', () => {
    const nodes = [
      order({id: 'gid://shopify/Order/1', name: '#1', processedAt: '2026-01-01T00:00:00Z'}),
      order({id: 'gid://shopify/Order/4', name: '#4', processedAt: '2026-04-01T00:00:00Z'}),
      order({id: 'gid://shopify/Order/2', name: '#2', processedAt: '2026-02-01T00:00:00Z'}),
      order({id: 'gid://shopify/Order/3', name: '#3', processedAt: '2026-03-01T00:00:00Z'}),
    ];
    expect(toRecentOrderSummaries(nodes, 3).map((o) => o.name)).toEqual(['#4', '#3', '#2']);
  });
  it('produz um resumo apresentável', () => {
    const [summary] = toRecentOrderSummaries([order()], 3);
    expect(summary).toMatchObject({name: '#1042', statusLabel: 'Enviada', href: 'shopify:customer-account/orders/5551234567'});
    expect(summary.totalLabel.replace(nbsp, ' ')).toBe('24,90 €');
  });
  it('tolera respostas vazias', () => {
    expect(toRecentOrderSummaries(null, 3)).toEqual([]);
    expect(toRecentOrderSummaries([], 3)).toEqual([]);
  });
});
