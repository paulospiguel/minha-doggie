import {describe, expect, it} from 'vitest';
import {
  buildIndexRepair,
  buildPetsWrite,
  derivePetIndex,
  isIndexInSync,
  parsePetCount,
  parseSpeciesList,
} from '../src/species';
import {serializePets} from '../src/pets';
import {OWNER, pet} from './fixtures';

const dog = pet();
const cat = pet({id: 'bbbbbbbb-0000-4000-8000-000000000002', name: 'Mia', species: 'cat'});
const dog2 = pet({id: 'cccccccc-0000-4000-8000-000000000003', name: 'Rex'});

describe('derivePetIndex', () => {
  it('lista vazia → sem espécies, contagem 0', () => {
    expect(derivePetIndex([])).toEqual({species: [], count: 0});
  });
  it('espécies únicas, em ordem canónica (cao, gato), independentemente da ordem dos animais', () => {
    expect(derivePetIndex([cat, dog, dog2])).toEqual({species: ['cao', 'gato'], count: 3});
    expect(derivePetIndex([cat])).toEqual({species: ['gato'], count: 1});
  });
});

describe('parseSpeciesList / parsePetCount', () => {
  it('aceita listas válidas e normaliza a ordem', () => {
    expect(parseSpeciesList('["gato","cao"]')).toEqual(['cao', 'gato']);
    expect(parseSpeciesList('[]')).toEqual([]);
  });
  it('rejeita valores ausentes, inválidos ou com códigos desconhecidos', () => {
    expect(parseSpeciesList(null)).toBeNull();
    expect(parseSpeciesList('')).toBeNull();
    expect(parseSpeciesList('{oops')).toBeNull();
    expect(parseSpeciesList('"cao"')).toBeNull();
    expect(parseSpeciesList('["cao","peixe"]')).toBeNull();
  });
  it('lê contagens inteiras não negativas', () => {
    expect(parsePetCount('0')).toBe(0);
    expect(parsePetCount(' 12 ')).toBe(12);
    expect(parsePetCount('-1')).toBeNull();
    expect(parsePetCount('1.5')).toBeNull();
    expect(parsePetCount(undefined)).toBeNull();
  });
});

describe('isIndexInSync', () => {
  it('true quando contagem e espécies correspondem', () => {
    expect(isIndexInSync([dog, cat], '["cao","gato"]', '2')).toBe(true);
    expect(isIndexInSync([cat, dog], '["gato","cao"]', '2')).toBe(true);
  });
  it('sem companheiros: exige pet_count=0 e pet_species ausente ou vazio', () => {
    expect(isIndexInSync([], null, '0')).toBe(true);
    expect(isIndexInSync([], '[]', '0')).toBe(true);
    expect(isIndexInSync([], '["cao"]', '0')).toBe(false);
    expect(isIndexInSync([], null, null)).toBe(false);
  });
  it('false quando falta índice ou está desatualizado', () => {
    expect(isIndexInSync([dog], null, null)).toBe(false);
    expect(isIndexInSync([dog], '["cao"]', '2')).toBe(false);
    expect(isIndexInSync([dog, cat], '["cao"]', '2')).toBe(false);
    expect(isIndexInSync([dog], 'lixo', '1')).toBe(false);
  });
});

describe('buildPetsWrite', () => {
  it('um único metafieldsSet com pets (+compareDigest), pet_count e pet_species', () => {
    const plan = buildPetsWrite(OWNER, [dog, cat], 'digest-1');
    expect(plan.remove).toEqual([]);
    expect(plan.set).toEqual([
      {ownerId: OWNER, namespace: '$app', key: 'pets', type: 'json', value: serializePets([dog, cat]), compareDigest: 'digest-1'},
      {ownerId: OWNER, namespace: '$app', key: 'pet_count', type: 'number_integer', value: '2'},
      {ownerId: OWNER, namespace: '$app', key: 'pet_species', type: 'list.single_line_text_field', value: '["cao","gato"]'},
    ]);
    expect(plan.set.length).toBeLessThanOrEqual(25);
  });
  it('sem compareDigest quando o metafield ainda não existe', () => {
    expect(buildPetsWrite(OWNER, [dog], null).set[0]).not.toHaveProperty('compareDigest');
  });
  it('lista vazia: pet_count=0 e remoção de pet_species (listas vazias não são gravadas)', () => {
    const plan = buildPetsWrite(OWNER, [], 'd');
    expect(plan.set.map((input) => [input.key, input.value])).toEqual([
      ['pets', serializePets([])],
      ['pet_count', '0'],
    ]);
    expect(plan.remove).toEqual([{ownerId: OWNER, namespace: '$app', key: 'pet_species'}]);
  });
});

describe('buildIndexRepair (backfill)', () => {
  it('reescreve pets com o valor BRUTO original e o compareDigest lido', () => {
    const legacy = JSON.stringify([{id: 'aaaaaaaa-0000-4000-8000-000000000001', name: 'Bolinhas', species: 'dog', ageYears: 3}, {nonsense: true}]);
    const plan = buildIndexRepair(OWNER, [dog], legacy, 'dg');
    expect(plan.set[0]).toEqual({ownerId: OWNER, namespace: '$app', key: 'pets', type: 'json', value: legacy, compareDigest: 'dg'});
    expect(plan.set.slice(1).map((input) => [input.key, input.value])).toEqual([
      ['pet_count', '1'],
      ['pet_species', '["cao"]'],
    ]);
  });
});
