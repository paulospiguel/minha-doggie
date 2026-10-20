/**
 * Minha DOGGIE — ferramentas na lista de clientes (target admin.customer-index.action.render):
 * exportação CSV, segmentos por espécie e reindexação (backfill) dos índices.
 */
import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {ExportPanel} from './components/ExportPanel';
import {ReindexPanel} from './components/ReindexPanel';
import {SegmentsPanel} from './components/SegmentsPanel';
import {ADMIN_COPY} from './copy';

function Tools() {
  return (
    <s-admin-action heading={ADMIN_COPY.tools.heading}>
      <s-stack direction="block" gap="base">
        <ExportPanel />
        <SegmentsPanel />
        <ReindexPanel />
      </s-stack>
      <s-button slot="secondary-actions" onClick={() => shopify.close()}>
        {ADMIN_COPY.tools.close}
      </s-button>
    </s-admin-action>
  );
}

export default async () => {
  render(<Tools />, document.body);
};
