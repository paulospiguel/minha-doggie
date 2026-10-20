/**
 * Minha DOGGIE — exportar CSV dos clientes selecionados
 * (target admin.customer-index.selection-action.render).
 */
import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {ExportPanel} from './components/ExportPanel';
import {ADMIN_COPY} from './copy';

function SelectionExport({ids}: {ids: string[]}) {
  return (
    <s-admin-action heading={ADMIN_COPY.tools.heading}>
      <ExportPanel selectedIds={ids} />
      <s-button slot="secondary-actions" onClick={() => shopify.close()}>
        {ADMIN_COPY.tools.close}
      </s-button>
    </s-admin-action>
  );
}

export default async () => {
  const ids = shopify.data.selected.map((item) => item.id).filter((id) => id.startsWith('gid://shopify/Customer/'));
  render(<SelectionExport ids={ids} />, document.body);
};
