import {ROUTES} from '../constants';
import {COPY} from '../copy';
import type {IconName, Money, OrderNode, OrderSummary, StatusTone} from '../types';
import {safeHttpsUrl} from './settings';
import {sanitizeText, truncate} from '@minha-doggie/core';

const LOCALE = 'pt-PT';

/** "24,90 €" — formatação pt-PT; devolve '—' se o valor for inválido. */
export function formatMoney(money: Money | null | undefined, locale = LOCALE): string {
  if (!money || money.amount == null) return '—';
  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) return '—';
  const currency = /^[A-Z]{3}$/.test(money.currencyCode ?? '') ? money.currencyCode : 'EUR';
  try {
    return new Intl.NumberFormat(locale, {style: 'currency', currency}).format(amount);
  } catch {
    return `${amount.toFixed(2).replace('.', ',')} ${currency}`;
  }
}

/** "12 de outubro de 2026" — devolve '' se a data for inválida. */
export function formatOrderDate(iso: string | null | undefined, locale = LOCALE, timeZone = 'Europe/Lisbon'): string {
  if (!iso) return '';
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return '';
  try {
    return new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'long', year: 'numeric', timeZone}).format(time);
  } catch {
    return new Date(time).toISOString().slice(0, 10);
  }
}

/** Extrai o id numérico de um GID ("gid://shopify/Order/123" → "123"). */
export function legacyIdFromGid(gid: string | null | undefined): string | null {
  if (!gid) return null;
  const match = /^gid:\/\/shopify\/[A-Za-z]+\/(\d+)(?:\?.*)?$/.exec(gid);
  return match ? match[1] : null;
}

/** Página nativa de detalhe da encomenda; se o id for inesperado, vai para a lista. */
export function orderDetailHref(gid: string | null | undefined): string {
  const id = legacyIdFromGid(gid);
  return id ? `${ROUTES.orders}/${id}` : ROUTES.orders;
}

const STATUS_ICONS: Record<string, IconName> = {
  FULFILLED: 'check-circle',
  PARTIALLY_FULFILLED: 'truck',
  IN_PROGRESS: 'clock',
  OPEN: 'clock',
  UNFULFILLED: 'clock',
  PENDING_FULFILLMENT: 'clock',
  SCHEDULED: 'calendar',
  ON_HOLD: 'alert-circle',
  RESTOCKED: 'return',
};

/**
 * Estado apresentado no badge. Em contas de cliente o s-badge só aceita os
 * tons auto/neutral/critical (sem verde/azul): o significado é reforçado com
 * um ícone oficial (check-circle, clock, …).
 */
export function orderStatus(order: Pick<OrderNode, 'fulfillmentStatus' | 'cancelledAt'>): {
  label: string;
  tone: StatusTone;
  icon: IconName;
} {
  if (order.cancelledAt) return {label: COPY.orders.status.CANCELLED, tone: 'critical', icon: 'x-circle'};
  const labels = COPY.orders.status as Record<string, string>;
  const key = typeof order.fulfillmentStatus === 'string' ? order.fulfillmentStatus : '';
  const known = key in labels && key !== 'CANCELLED' && key !== 'UNKNOWN';
  const label = known ? labels[key] : COPY.orders.status.UNKNOWN;
  const tone: StatusTone = key === 'ON_HOLD' ? 'critical' : 'neutral';
  const icon: IconName = known ? (STATUS_ICONS[key] ?? 'info') : 'info';
  return {label, tone, icon};
}

const THUMBNAIL_HOSTS = ['cdn.shopify.com'];

/** Só aceita imagens HTTPS servidas pela CDN da Shopify (a origem que a API devolve). */
export function safeThumbnailUrl(raw: unknown): string | null {
  const url = safeHttpsUrl(raw, 2048);
  if (!url) return null;
  const host = new URL(url).hostname;
  return THUMBNAIL_HOSTS.includes(host) || host.endsWith('.shopifycdn.com') ? url : null;
}

/** Miniatura do primeiro artigo da encomenda (ou null → placeholder nativo). */
export function orderThumbnail(order: Pick<OrderNode, 'lineItems'>): {url: string | null; alt: string} {
  const first = Array.isArray(order.lineItems?.nodes) ? order.lineItems?.nodes?.[0] : null;
  const url = safeThumbnailUrl(first?.image?.url);
  const alt = truncate(sanitizeText(first?.image?.altText || first?.title || ''), 120);
  return {url, alt};
}

export function toOrderSummary(order: OrderNode): OrderSummary {
  const status = orderStatus(order);
  const thumbnail = orderThumbnail(order);
  return {
    id: order.id,
    name: order.name,
    dateLabel: formatOrderDate(order.processedAt),
    dateTime: order.processedAt,
    totalLabel: formatMoney(order.totalPrice),
    statusLabel: status.label,
    statusTone: status.tone,
    statusIcon: status.icon,
    href: orderDetailHref(order.id),
    thumbnailUrl: thumbnail.url,
    thumbnailAlt: thumbnail.alt,
  };
}

/** Ordena por data (mais recente primeiro) e limita — defensivo, a query já ordena. */
export function toRecentOrderSummaries(nodes: readonly OrderNode[] | null | undefined, limit: number): OrderSummary[] {
  if (!Array.isArray(nodes)) return [];
  return [...nodes]
    .filter((node) => node && typeof node.id === 'string')
    .sort((a, b) => (Date.parse(b.processedAt) || 0) - (Date.parse(a.processedAt) || 0))
    .slice(0, limit)
    .map(toOrderSummary);
}
