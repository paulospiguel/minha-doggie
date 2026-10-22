import {COPY} from '../copy';
import type {SubscriptionNode} from '../graphql/api';
import {formatOrderDate, safeThumbnailUrl} from '../lib/orders';
import type {LoadState} from '../types';
import {SectionHeader} from './SectionHeader';

interface SubscriptionsSectionProps {
  state: LoadState<SubscriptionNode[]>;
  /** URL HTTPS validado da app de subscrições, ou null se não configurado. */
  manageUrl: string | null;
}

/**
 * Lista as subscrições reais do cliente (Customer Account API). Se a leitura
 * falhar ou não houver contratos, mantém o comportamento anterior: ligação à
 * gestão oficial quando configurada, ou estado vazio.
 */
export function SubscriptionsSection({state, manageUrl}: SubscriptionsSectionProps) {
  const items = state.status === 'ready' ? state.data : [];
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

        {state.status === 'loading' ? <s-skeleton-paragraph content={COPY.subscriptions.loading} /> : null}

        {items.length > 0 ? (
          <s-stack direction="block" gap="none">
            {items.map((item, index) => (
              <s-stack key={item.id} direction="block" gap="none">
                {index > 0 ? <s-divider /> : null}
                <SubscriptionRow item={item} />
              </s-stack>
            ))}
          </s-stack>
        ) : null}

        {state.status !== 'loading' && items.length === 0 ? (
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
        ) : null}
      </s-stack>
    </s-section>
  );
}

function SubscriptionRow({item}: {item: SubscriptionNode}) {
  const line = item.lines?.nodes?.[0];
  const title = line?.title || COPY.subscriptions.heading;
  const statusKey = typeof item.status === 'string' ? item.status : '';
  const statusLabel = COPY.subscriptions.status[statusKey] ?? COPY.subscriptions.status.UNKNOWN;
  const next = formatOrderDate(item.nextBillingDate);
  return (
    <s-box paddingBlock="small" paddingInline="small-100">
      <s-grid gridTemplateColumns="auto minmax(0, 1fr) auto" gap="base" alignItems="center">
        <s-product-thumbnail
          src={safeThumbnailUrl(line?.image?.url) ?? undefined}
          alt={line?.image?.altText || title}
          size="small"
        />
        <s-stack direction="block" gap="none">
          <s-text type="strong">{title}</s-text>
          {next && statusKey === 'ACTIVE' ? (
            <s-text color="subdued">{COPY.subscriptions.nextBilling(next)}</s-text>
          ) : null}
        </s-stack>
        <s-badge color="subdued">{statusLabel}</s-badge>
      </s-grid>
    </s-box>
  );
}
