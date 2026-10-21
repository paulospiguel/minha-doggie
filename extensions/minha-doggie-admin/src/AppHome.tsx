/**
 * Minha DOGGIE — página principal da app no Admin (target admin.app.home.render):
 * substitui o ecrã genérico «Find this app in the pages where you work» ao clicar
 * em Aplicações › Minha DOGGIE, apresentando as configurações da app, estado das
 * extensões, segmentos por espécie, exportação CSV e reindexação (backfill).
 */
import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {BannerPanel} from './components/BannerPanel';
import {ConfigPanel} from './components/ConfigPanel';
import {ExportPanel} from './components/ExportPanel';
import {ReindexPanel} from './components/ReindexPanel';
import {SegmentsPanel} from './components/SegmentsPanel';
import {ADMIN_COPY} from './copy';

function AppHome() {
  return (
    <s-page heading={ADMIN_COPY.home.heading} inlineSize="base">
      <s-button slot="primary-action" variant="primary" href="shopify:admin/settings/checkout">
        {ADMIN_COPY.home.customizeCheckout}
      </s-button>
      <s-button slot="secondary-actions" href="shopify:admin/customers">
        {ADMIN_COPY.home.openCustomers}
      </s-button>
      <s-button slot="secondary-actions" href="shopify:admin/customers/segments">
        {ADMIN_COPY.home.openSegments}
      </s-button>
      <s-button slot="secondary-actions" href="shopify:admin/content/files">
        {ADMIN_COPY.home.openFiles}
      </s-button>
      <s-stack direction="block" gap="base">
        <BannerPanel />
        <ConfigPanel />
        <SegmentsPanel />
        <ExportPanel />
        <ReindexPanel />
      </s-stack>
    </s-page>
  );
}

export default async () => {
  render(<AppHome />, document.body);
};
