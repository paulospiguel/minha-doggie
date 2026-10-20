/**
 * Minha DOGGIE — bloco no detalhe do cliente (target admin.customer-details.block.render).
 * Mostra e edita `$app.pets` do cliente aberto; cada gravação atualiza também
 * `$app.pet_species` e `$app.pet_count` na mesma chamada metafieldsSet.
 */
import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {PetsBlock} from './components/PetsBlock';

export default async () => {
  const customerId = shopify.data.selected[0]?.id ?? null;
  render(<PetsBlock customerId={customerId} />, document.body);
};
