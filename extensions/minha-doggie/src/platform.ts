/**
 * Único ponto de contacto com o global `shopify` (target customer-account.page.render).
 * Mantém os componentes testáveis e isola a dependência da plataforma.
 */
import type {ExtensionSettingsInput} from './types';

/** Lê as definições do editor (signal: a leitura em render subscreve alterações). */
export function readRawSettings(): ExtensionSettingsInput {
  const value = shopify.settings?.value as ExtensionSettingsInput | undefined;
  // Cópia simples: definições não preenchidas simplesmente não existem.
  return value && typeof value === 'object' ? {...value} : {};
}

/** Notificação breve e não bloqueante. Falhas do toast nunca quebram o fluxo. */
export function showToast(message: string): void {
  try {
    void shopify.toast?.show(message)?.catch(() => undefined);
  } catch {
    // Toast é cosmético; ignorar.
  }
}
