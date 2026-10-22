import {DEFAULT_STORE_URL, DEFAULT_SUBSCRIPTIONS_URL, LIMITS} from '../constants';
import {COPY} from '../copy';
import type {ExtensionSettingsInput, MinhaDoggieSettings} from '../types';
import {sanitizeText, truncate} from '@minha-doggie/core';

/** Aceita apenas URLs absolutos HTTPS (sem credenciais embutidas). */
export function safeHttpsUrl(raw: unknown, maxLength: number = LIMITS.settingUrlMaxLength): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.length > maxLength) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null;
  return url.toString();
}

export function readSettings(raw: ExtensionSettingsInput | null | undefined): MinhaDoggieSettings {
  const settings = raw ?? {};
  const alt = truncate(sanitizeText(settings.hero_image_alt), LIMITS.imageAltMaxLength);
  return {
    heroImageUrl: safeHttpsUrl(settings.hero_image_url),
    heroImageAlt: alt || COPY.welcome.defaultImageAlt,
    subscriptionsUrl: safeHttpsUrl(settings.subscriptions_url) ?? DEFAULT_SUBSCRIPTIONS_URL,
    storeUrl: safeHttpsUrl(settings.store_url) ?? DEFAULT_STORE_URL,
  };
}

/** Primeiro nome seguro para a saudação (nunca inventado). */
export function displayFirstName(firstName: string | null | undefined): string | null {
  const name = truncate(sanitizeText(firstName), 40);
  return name || null;
}
