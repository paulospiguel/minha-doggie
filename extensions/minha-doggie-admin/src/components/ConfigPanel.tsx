import {useEffect, useState} from 'preact/hooks';
import {ADMIN_COPY} from '../copy';

type ExtensionStatus = 'active' | 'available' | 'unavailable';

interface ExtensionSummary {
  handle?: string | null;
  status?: ExtensionStatus;
}

const copy = ADMIN_COPY.config;

function readAppExtensions(): Promise<ExtensionSummary[]> | null {
  const g = globalThis as unknown as {
    shopify?: {app?: {extensions?: () => Promise<ExtensionSummary[]>}};
  };
  const fn = g.shopify?.app?.extensions;
  return typeof fn === 'function' ? fn() : null;
}

function statusBadge(status: ExtensionStatus | undefined) {
  if (status === 'active') {
    return <s-badge tone="success">{copy.statusActive}</s-badge>;
  }
  if (status === 'available') {
    return <s-badge tone="info">{copy.statusAvailable}</s-badge>;
  }
  if (status === 'unavailable') {
    return <s-badge tone="warning">{copy.statusUnavailable}</s-badge>;
  }
  return null;
}

/** Painel de configurações da página Minha DOGGIE e estado das extensões da app. */
export function ConfigPanel() {
  const [statuses, setStatuses] = useState<Record<string, ExtensionStatus | undefined>>({});

  useEffect(() => {
    let active = true;
    const req = readAppExtensions();
    if (req) {
      req
        .then((list) => {
          if (!active || !Array.isArray(list)) return;
          const map: Record<string, ExtensionStatus | undefined> = {};
          for (const item of list) {
            if (item?.handle) map[item.handle] = item.status;
          }
          setStatuses(map);
        })
        .catch(() => {
          // Ignorar silenciosamente se o host não suportar shopify.app.extensions().
        });
    }
    return () => {
      active = false;
    };
  }, []);

  return (
    <s-stack direction="block" gap="base">
      <s-section heading={copy.heading}>
        <s-stack direction="block" gap="base">
          <s-paragraph>{copy.intro}</s-paragraph>
          {copy.settingsList.map((item) => (
            <s-stack key={item.key} direction="block" gap="small">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-text type="strong">{item.label}</s-text>
                <s-badge tone="neutral">{item.key}</s-badge>
              </s-stack>
              <s-text-field
                label={item.label}
                labelAccessibilityVisibility="exclusive"
                value={item.placeholder}
                details={item.detail}
                readOnly
              />
            </s-stack>
          ))}
          <s-box background="subdued" border="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="small">
              <s-text type="strong">{copy.brandingHeading}</s-text>
              <s-stack direction="inline" gap="small">
                {copy.brandingSwatches.map((swatch) => (
                  <s-badge key={swatch} tone="neutral">
                    {swatch}
                  </s-badge>
                ))}
              </s-stack>
            </s-stack>
          </s-box>
          <s-stack direction="inline" gap="small">
            <s-button variant="primary" href="shopify:admin/settings/checkout">
              {copy.openCheckoutEditor}
            </s-button>
            <s-button variant="secondary" href="shopify:admin/content/files">
              {copy.openFilesManager}
            </s-button>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section heading={copy.adminLocationsHeading}>
        <s-stack direction="block" gap="base">
          <s-paragraph>{copy.adminLocationsIntro}</s-paragraph>
          {copy.locations.map((loc, index) => (
            <s-grid
              key={loc.handle}
              gridTemplateColumns={index === 0 ? '1fr auto' : '1fr'}
              gap="base"
              alignItems="center"
            >
              <s-stack direction="block" gap="small">
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-text type="strong">{loc.title}</s-text>
                  <s-badge tone="neutral">{loc.target}</s-badge>
                  {statusBadge(statuses[loc.handle])}
                </s-stack>
                <s-paragraph color="subdued">{loc.detail}</s-paragraph>
              </s-stack>
              {index === 0 ? (
                <s-stack direction="inline" gap="small">
                  <s-button variant="secondary" href="shopify:admin/customers">
                    {copy.openCustomersList}
                  </s-button>
                  <s-button variant="secondary" href="shopify:admin/customers/segments">
                    {copy.openSegmentsList}
                  </s-button>
                </s-stack>
              ) : null}
            </s-grid>
          ))}
        </s-stack>
      </s-section>
    </s-stack>
  );
}
