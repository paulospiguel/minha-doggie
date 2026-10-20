/**
 * Consultas de segmentos de clientes (linguagem de consultas de segmentos da Shopify).
 * Nos metafields app-owned, `$app` é resolvido pela Shopify para `app--<id da app>`;
 * o namespace real é lido em runtime (metafieldDefinitions) e nunca inventado.
 */

export interface SegmentDefinition {
  id: 'com_companheiros' | 'cao' | 'gato' | 'cao_e_gato';
  name: string;
  query: string;
}

const NAMESPACE_PATTERN = /^[A-Za-z0-9_-]{2,255}$/;

export function isResolvedNamespace(namespace: string): boolean {
  return NAMESPACE_PATTERN.test(namespace) && !namespace.startsWith('$');
}

export function buildSegmentQueries(namespace: string): SegmentDefinition[] {
  if (!isResolvedNamespace(namespace)) throw new Error(`Namespace inválido: ${namespace}`);
  const species = `metafields.${namespace}.pet_species`;
  const count = `metafields.${namespace}.pet_count`;
  // `pet_count >= 1` protege contra um `pet_species` antigo que não tenha sido removido.
  return [
    {id: 'com_companheiros', name: 'Minha DOGGIE · Com companheiros', query: `${count} >= 1`},
    {id: 'cao', name: 'Minha DOGGIE · Tem cão', query: `${species} CONTAINS 'cao' AND ${count} >= 1`},
    {id: 'gato', name: 'Minha DOGGIE · Tem gato', query: `${species} CONTAINS 'gato' AND ${count} >= 1`},
    {
      id: 'cao_e_gato',
      name: 'Minha DOGGIE · Tem cão e gato',
      query: `${species} CONTAINS 'cao' AND ${species} CONTAINS 'gato' AND ${count} >= 1`,
    },
  ];
}

/** Extrai o prefixo `metafields.<ns>` de um queryName sugerido pelo editor de segmentos. */
export function namespaceFromFilterQueryName(queryName: string, key: string): string | null {
  const match = /^metafields\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(queryName.trim());
  if (!match || match[2] !== key) return null;
  return match[1];
}
