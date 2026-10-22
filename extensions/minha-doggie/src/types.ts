// Tipos de companheiros partilhados com a extensão de admin.
export type {
  AgeUnit,
  ParsedPets,
  Pet,
  PetAge,
  PetDraft,
  PetErrors,
  PetField,
  PetValidationResult,
  PetsDocument,
  Species,
  ValidPetInput,
} from '@minha-doggie/core';
import type {Pet} from '@minha-doggie/core';

export interface Money {
  amount: string;
  currencyCode: string;
}

export type OrderFulfillmentStatus =
  | 'FULFILLED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'OPEN'
  | 'PARTIALLY_FULFILLED'
  | 'PENDING_FULFILLMENT'
  | 'RESTOCKED'
  | 'SCHEDULED'
  | 'UNFULFILLED';

/** Encomenda tal como é devolvida pela query RecentOrders. */
export interface OrderNode {
  id: string;
  name: string;
  processedAt: string;
  cancelledAt: string | null;
  fulfillmentStatus: OrderFulfillmentStatus | string;
  totalPrice: Money;
  /** Primeira linha da encomenda (só para a miniatura). Opcional: pode faltar. */
  lineItems?: {
    nodes?: Array<{
      title?: string | null;
      image?: {url?: string | null; altText?: string | null} | null;
    } | null> | null;
  } | null;
}

/** Nomes de ícone válidos em contas de cliente (tipos oficiais de s-icon). */
export type IconName = Exclude<NonNullable<HTMLElementTagNameMap['s-icon']['type']>, ''>;

export type StatusTone = 'neutral' | 'critical' | 'auto';

/** Encomenda pronta a apresentar. */
export interface OrderSummary {
  productTitle?: string;
  id: string;
  name: string;
  dateLabel: string;
  dateTime: string;
  totalLabel: string;
  statusLabel: string;
  statusTone: StatusTone;
  statusIcon: IconName;
  href: string;
  /** URL HTTPS validado da imagem do 1.º artigo (CDN Shopify) ou null. */
  thumbnailUrl: string | null;
  thumbnailAlt: string;
}

/** Definições configuradas pelo lojista no editor de contas. */
export interface ExtensionSettingsInput {
  hero_image_url?: unknown;
  hero_image_alt?: unknown;
  subscriptions_url?: unknown;
  store_url?: unknown;
  [key: string]: unknown;
}

export interface MinhaDoggieSettings {
  heroImageUrl: string | null;
  heroImageAlt: string;
  subscriptionsUrl: string | null;
  storeUrl: string;
}

export interface CustomerProfile {
  id: string;
  firstName: string | null;
}

export interface PetsState {
  pets: Pet[];
  /** compareDigest do metafield (controlo de concorrência otimista). */
  compareDigest: string | null;
  discarded: number;
}

export type LoadState<T> =
  | {status: 'loading'}
  | {status: 'error'; message: string}
  | {status: 'ready'; data: T};
