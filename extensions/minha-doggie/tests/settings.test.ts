import {describe, expect, it} from 'vitest';
import {displayFirstName, readSettings, safeHttpsUrl} from '../src/lib/settings';

describe('safeHttpsUrl', () => {
  it('aceita apenas HTTPS absoluto', () => {
    expect(safeHttpsUrl('https://cdn.shopify.com/s/files/hero.png')).toBe('https://cdn.shopify.com/s/files/hero.png');
    expect(safeHttpsUrl('  https://store.doggie.pt  ')).toBe('https://store.doggie.pt/');
    expect(safeHttpsUrl('http://store.doggie.pt')).toBeNull();
    expect(safeHttpsUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpsUrl('/relative')).toBeNull();
    expect(safeHttpsUrl('https://user:pass@evil.example')).toBeNull();
    expect(safeHttpsUrl(42)).toBeNull();
    expect(safeHttpsUrl(`https://a.pt/${'x'.repeat(600)}`)).toBeNull();
  });
});

describe('readSettings', () => {
  it('usa valores por omissão quando nada está configurado', () => {
    expect(readSettings(undefined)).toEqual({
      heroImageUrl: null,
      heroImageAlt: 'Um cão e um gato DOGGIE',
      subscriptionsUrl: null,
      storeUrl: 'https://store.doggie.pt',
    });
  });
  it('lê definições válidas e ignora inválidas', () => {
    expect(
      readSettings({
        hero_image_url: 'https://cdn.shopify.com/hero.png',
        hero_image_alt: '  Cão e gato  ',
        subscriptions_url: 'http://insecure.example',
        store_url: 'https://store.doggie.pt/collections/all',
      }),
    ).toEqual({
      heroImageUrl: 'https://cdn.shopify.com/hero.png',
      heroImageAlt: 'Cão e gato',
      subscriptionsUrl: null,
      storeUrl: 'https://store.doggie.pt/collections/all',
    });
  });
});

describe('displayFirstName', () => {
  it('nunca inventa nomes', () => {
    expect(displayFirstName(null)).toBeNull();
    expect(displayFirstName('   ')).toBeNull();
    expect(displayFirstName(' Ana ')).toBe('Ana');
  });
});
