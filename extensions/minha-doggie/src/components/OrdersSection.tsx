import {ROUTES} from '../constants';
import {COPY} from '../copy';
import type {LoadState, OrderSummary} from '../types';
import {SectionHeader} from './SectionHeader';

interface OrdersSectionProps {
  state: LoadState<OrderSummary[]>;
  storeUrl: string;
}

export function OrdersSection({state, storeUrl}: OrdersSectionProps) {
  return (
    <s-section accessibilityLabel={COPY.orders.heading}>
      <s-stack direction="block" gap="base">
        <SectionHeader
          icon="order"
          title={COPY.orders.heading}
          action={{label: COPY.orders.viewAll, accessibilityLabel: COPY.orders.viewAllAccessibility, href: ROUTES.orders}}
        />

        {state.status === 'loading' ? <s-skeleton-paragraph content={COPY.orders.loading} /> : null}

        {state.status === 'error' ? (
          <s-stack direction="block" gap="small">
            <s-paragraph color="subdued">{COPY.orders.error}</s-paragraph>
            <s-link href={ROUTES.orders}>{COPY.orders.errorAction}</s-link>
          </s-stack>
        ) : null}

        {state.status === 'ready' && state.data.length === 0 ? (
          <s-box background="subdued" borderRadius="large" padding="base">
            <s-stack direction="block" gap="small">
              <s-text type="strong">{COPY.orders.emptyTitle}</s-text>
              <s-paragraph color="subdued">{COPY.orders.emptyBody}</s-paragraph>
              <s-link href={storeUrl}>{COPY.orders.startShopping}</s-link>
            </s-stack>
          </s-box>
        ) : null}

        {state.status === 'ready' && state.data.length > 0 ? (
          <s-stack direction="block" gap="none">
            {state.data.map((order, index) => (
              <s-stack key={order.id} direction="block" gap="none">
                {index > 0 ? <s-divider /> : null}
                <OrderRow order={order} />
              </s-stack>
            ))}
          </s-stack>
        ) : null}
      </s-stack>
    </s-section>
  );
}

function OrderRow({order}: {order: OrderSummary}) {
  return (
    <s-clickable
      href={order.href}
      accessibilityLabel={COPY.orders.detailAccessibility(order.name)}
      borderRadius="base"
      paddingBlock="small"
      paddingInline="small-100"
    >
      <s-grid gridTemplateColumns="auto minmax(0, 1fr) auto" gap="base" alignItems="center">
        <s-product-thumbnail
          src={order.thumbnailUrl ?? undefined}
          alt={order.thumbnailAlt || order.name}
          size="small"
        />
        <s-query-container>
          <s-grid
            gridTemplateColumns="@container (inline-size > 420px) minmax(0, 1fr) minmax(0, 1.4fr) auto auto, minmax(0, 1fr) auto"
            gap="small base"
            alignItems="center"
          >
            <s-stack direction="block" gap="small-300">
              <s-text type="strong">{order.name}</s-text>
              {order.productTitle ? <s-text>{order.productTitle}</s-text> : null}
            </s-stack>
            <s-text color="subdued">
              <s-time dateTime={order.dateTime}>{order.dateLabel}</s-time>
            </s-text>
            <s-text type="strong">{order.totalLabel}</s-text>
            <s-badge tone={order.statusTone} icon={order.statusIcon} color="subdued">
              {order.statusLabel}
            </s-badge>
          </s-grid>
        </s-query-container>
        <s-icon type="chevron-right" />
      </s-grid>
    </s-clickable>
  );
}
