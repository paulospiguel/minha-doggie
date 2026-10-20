import {describe, expect, it} from 'vitest';
import {buildSegmentQueries, isResolvedNamespace, namespaceFromFilterQueryName} from '../src/segments';

describe('segmentos', () => {
  it('gera consultas com o namespace resolvido da app', () => {
    const queries = buildSegmentQueries('app--123456');
    expect(queries.map((q) => [q.id, q.query])).toEqual([
      ['com_companheiros', 'metafields.app--123456.pet_count >= 1'],
      ['cao', "metafields.app--123456.pet_species CONTAINS 'cao' AND metafields.app--123456.pet_count >= 1"],
      ['gato', "metafields.app--123456.pet_species CONTAINS 'gato' AND metafields.app--123456.pet_count >= 1"],
      [
        'cao_e_gato',
        "metafields.app--123456.pet_species CONTAINS 'cao' AND metafields.app--123456.pet_species CONTAINS 'gato' AND metafields.app--123456.pet_count >= 1",
      ],
    ]);
    for (const q of queries) expect(q.query.split(/\s(?:AND|OR)\s/).length).toBeLessThanOrEqual(10);
  });
  it('recusa o alias $app (não é aceite no editor de segmentos) e valores estranhos', () => {
    expect(isResolvedNamespace('$app')).toBe(false);
    expect(isResolvedNamespace("x' OR 1=1")).toBe(false);
    expect(() => buildSegmentQueries('$app')).toThrow();
  });
  it('extrai o namespace de um queryName sugerido', () => {
    expect(namespaceFromFilterQueryName('metafields.app--42.pet_species', 'pet_species')).toBe('app--42');
    expect(namespaceFromFilterQueryName('metafields.app--42.pet_count', 'pet_species')).toBeNull();
    expect(namespaceFromFilterQueryName('customer_tags', 'pet_species')).toBeNull();
  });
});
