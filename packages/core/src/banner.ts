/**
 * Banner da página Minha DOGGIE: configurado no Admin (painel da app) e guardado
 * num metafield `$app.banner` da loja; a conta de cliente lê-o e mostra-o no hero.
 */
import {sanitizeText, truncate} from './text';

/** Metafield da loja (JSON) com a configuração do banner. */
export const BANNER_METAFIELD = {namespace: '$app', key: 'banner', type: 'json'} as const;

export const BANNER_LIMITS = {
  altMaxLength: 120,
  urlMaxLength: 500,
  /** Tamanho máximo do ficheiro carregado (bytes). */
  fileMaxBytes: 5 * 1024 * 1024,
} as const;

export interface BannerConfig {
  enabled: boolean;
  imageUrl: string | null;
  alt: string;
}

export const EMPTY_BANNER: BannerConfig = {enabled: false, imageUrl: null, alt: ''};

const IMAGE_HOSTS = ['cdn.shopify.com'];

/** Só aceita imagens HTTPS servidas pela CDN de ficheiros da Shopify. */
export function safeBannerImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.length > BANNER_LIMITS.urlMaxLength) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const host = url.hostname;
  return IMAGE_HOSTS.includes(host) || host.endsWith('.shopifycdn.com') ? url.toString() : null;
}

/** Lê o valor do metafield. Qualquer valor ausente/ilegível devolve o banner desligado. */
export function parseBanner(raw: unknown): BannerConfig {
  if (typeof raw !== 'string' || raw === '') return {...EMPTY_BANNER};
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {...EMPTY_BANNER};
  }
  if (!value || typeof value !== 'object') return {...EMPTY_BANNER};
  const record = value as Record<string, unknown>;
  const imageUrl = safeBannerImageUrl(record.imageUrl);
  return {
    enabled: record.enabled === true && imageUrl !== null,
    imageUrl,
    alt: truncate(sanitizeText(record.alt), BANNER_LIMITS.altMaxLength),
  };
}

export function serializeBanner(config: BannerConfig): string {
  const imageUrl = safeBannerImageUrl(config.imageUrl);
  return JSON.stringify({
    version: 1,
    enabled: config.enabled && imageUrl !== null,
    imageUrl,
    alt: truncate(sanitizeText(config.alt), BANNER_LIMITS.altMaxLength),
  });
}
