import {PET_LIMITS} from '@minha-doggie/core';

/**
 * Configuração central da Minha DOGGIE.
 * Tudo o que depende da versão da API, de limites de validação ou de rotas
 * Shopify está aqui para evitar valores "mágicos" espalhados pelo código.
 */

/** Tem de coincidir com `api_version` em shopify.extension.toml. */
export const CUSTOMER_ACCOUNT_API_VERSION = '2026-10';

/** Endpoint oficial da Customer Account API dentro de uma UI extension (autenticação automática). */
export const CUSTOMER_ACCOUNT_API_URL = `shopify://customer-account/api/${CUSTOMER_ACCOUNT_API_VERSION}/graphql.json`;

/** Metafields app-owned partilhados (ver packages/core/src/constants.ts e shopify.app.toml). */
export {PET_COUNT_METAFIELD, PET_SPECIES_METAFIELD, PETS_METAFIELD, PETS_SCHEMA_VERSION} from '@minha-doggie/core';

/** Rotas nativas das contas de cliente (protocolo personalizado Shopify). */
export const ROUTES = {
  orders: 'shopify:customer-account/orders',
  profile: 'shopify:customer-account/profile',
} as const;

export const DEFAULT_STORE_URL = 'https://store.doggie.pt';

export const LIMITS = {
  ...PET_LIMITS,
  recentOrders: 3,
  settingUrlMaxLength: 500,
  imageAltMaxLength: 120,
} as const;

/** Identidade DOGGIE (referência; as UI extensions não aceitam cores arbitrárias). */
export const BRAND = {
  name: 'DOGGIE',
  slogan: 'Much more than a pet!',
  palette: {
    darkPurple: '#4B0C62',
    purple: '#92278F',
    pink: '#DA1C5C',
    vibrantPink: '#EE2A7B',
    orange: '#F15A29',
  },
} as const;

/** IDs dos overlays (s-modal) usados com command/commandFor. */
export const MODAL_IDS = {
  petForm: 'minha-doggie-pet-form',
} as const;
