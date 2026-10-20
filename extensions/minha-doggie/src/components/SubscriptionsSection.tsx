import {COPY} from '../copy';
import {SectionHeader} from './SectionHeader';

interface SubscriptionsSectionProps {
  /** URL HTTPS validado da app de subscrições, ou null se não configurado. */
  manageUrl: string | null;
}

/**
 * Secção discreta. Não lê nem inventa subscrições (nada de "próxima
 * encomenda" fictícia): encaminha para a gestão oficial quando o lojista
 * configura o URL no editor de contas; caso contrário mostra estado vazio.
 */
export function SubscriptionsSection({manageUrl}: SubscriptionsSectionProps) {
  return (
    <s-section accessibilityLabel={COPY.subscriptions.heading}>
      <s-stack direction="block" gap="base">
        <SectionHeader
          icon="calendar"
          title={COPY.subscriptions.heading}
          action={
            manageUrl
              ? {label: COPY.subscriptions.manage, accessibilityLabel: COPY.subscriptions.manageAccessibility, href: manageUrl}
              : null
          }
        />
        <s-box background="subdued" borderRadius="large" padding="base">
          {manageUrl ? (
            <s-stack direction="block" gap="small-200">
              <s-text type="strong">{COPY.subscriptions.configuredTitle}</s-text>
              <s-paragraph color="subdued">{COPY.subscriptions.configuredBody}</s-paragraph>
            </s-stack>
          ) : (
            <s-stack direction="block" gap="small-200">
              <s-text type="strong">{COPY.subscriptions.emptyTitle}</s-text>
              <s-paragraph color="subdued">{COPY.subscriptions.emptyBody}</s-paragraph>
            </s-stack>
          )}
        </s-box>
      </s-stack>
    </s-section>
  );
}
