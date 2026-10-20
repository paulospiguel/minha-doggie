/**
 * Minha DOGGIE — entrada da extensão (target customer-account.page.render).
 * Preact + Polaris web components; sem CSS/HTML arbitrário.
 */
import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {App} from './App';

export default async () => {
  render(<App />, document.body);
};
