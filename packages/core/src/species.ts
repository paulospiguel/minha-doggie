/**
 * Índices derivados de `$app.pets` para segmentação nativa de clientes:
 *   - `$app.pet_species` (list.single_line_text_field: 'cao' | 'gato')
 *   - `$app.pet_count`   (number_integer)
 * São SEMPRE escritos na mesma chamada `metafieldsSet` que `$app.pets`
 * (a mutation é atómica), tanto pela conta de cliente como pelo admin.
 */
import {PET_COUNT_METAFIELD, PET_SPECIES_METAFIELD, PETS_METAFIELD} from './constants';
import {serializePets} from './pets';
import type {MetafieldIdentifierInput, MetafieldsSetInput, Pet, Species, SpeciesCode} from './types';

export const SPECIES_CODE: Readonly<Record<Species, SpeciesCode>> = {
  dog: 'cao',
  cat: 'gato',
  rabbit: 'coelho',
  ferret: 'furao',
  reptil: 'reptil',
  fish: 'peixe',
  bird: 'ave',
};

/** Ordem canónica (igual às escolhas da definição em shopify.app.toml). */
export const SPECIES_CODES: readonly SpeciesCode[] = ['cao', 'gato', 'coelho', 'furao', 'ave', 'peixe', 'reptil'];

export interface PetIndex {
  species: SpeciesCode[];
  count: number;
}

export function derivePetIndex(pets: readonly Pet[]): PetIndex {
  const present = new Set(pets.map((pet) => SPECIES_CODE[pet.species]));
  return {species: SPECIES_CODES.filter((code) => present.has(code)), count: pets.length};
}

/** Lê o valor de `pet_species` (JSON array). null = ausente/ilegível. */
export function parseSpeciesList(raw: string | null | undefined): SpeciesCode[] | null {
  if (raw == null || raw === '') return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return null;
    const codes = value.filter((item): item is SpeciesCode => (SPECIES_CODES as readonly unknown[]).includes(item));
    if (codes.length !== value.length) return null;
    return SPECIES_CODES.filter((code) => codes.includes(code));
  } catch {
    return null;
  }
}

/** Lê o valor de `pet_count`. null = ausente/ilegível. */
export function parsePetCount(raw: string | null | undefined): number | null {
  if (raw == null || !/^\d{1,4}$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

/**
 * Os índices guardados correspondem à lista? Sem companheiros, o esperado é
 * `pet_count = 0` e `pet_species` ausente (listas vazias não são gravadas).
 */
export function isIndexInSync(
  pets: readonly Pet[],
  rawSpecies: string | null | undefined,
  rawCount: string | null | undefined,
): boolean {
  const expected = derivePetIndex(pets);
  if (parsePetCount(rawCount) !== expected.count) return false;
  const stored = parseSpeciesList(rawSpecies);
  if (expected.species.length === 0) return stored === null || stored.length === 0;
  return stored !== null && stored.join(',') === expected.species.join(',');
}

export interface PetsWritePlan {
  /** Um único `metafieldsSet` (atómico): pets (se incluído) + pet_count (+ pet_species). */
  set: MetafieldsSetInput[];
  /** `pet_species` a remover (só quando não há espécies; listas vazias não são gravadas). */
  remove: MetafieldIdentifierInput[];
}

function indexInputs(ownerId: string, index: PetIndex): PetsWritePlan {
  const set: MetafieldsSetInput[] = [
    {ownerId, ...PET_COUNT_METAFIELD, value: String(index.count)},
  ];
  const remove: MetafieldIdentifierInput[] = [];
  if (index.species.length > 0) {
    set.push({ownerId, ...PET_SPECIES_METAFIELD, value: JSON.stringify(index.species)});
  } else {
    remove.push({ownerId, namespace: PET_SPECIES_METAFIELD.namespace, key: PET_SPECIES_METAFIELD.key});
  }
  return {set, remove};
}

/**
 * Plano de escrita de uma lista completa de companheiros + índices.
 * `compareDigest` (concorrência otimista) aplica-se ao metafield `pets`;
 * como `metafieldsSet` é atómico, um conflito impede também a escrita dos índices.
 */
export function buildPetsWrite(ownerId: string, pets: readonly Pet[], compareDigest: string | null): PetsWritePlan {
  const petsInput: MetafieldsSetInput = {ownerId, ...PETS_METAFIELD, value: serializePets(pets)};
  if (compareDigest) petsInput.compareDigest = compareDigest;
  const index = indexInputs(ownerId, derivePetIndex(pets));
  return {set: [petsInput, ...index.set], remove: index.remove};
}

/**
 * Plano de reindexação (backfill): reescreve `pets` com o valor BRUTO lido
 * (nenhum dado muda) e o `compareDigest` lido, para que uma edição concorrente
 * do cliente faça falhar a chamada inteira em vez de gerar índices errados.
 */
export function buildIndexRepair(
  ownerId: string,
  pets: readonly Pet[],
  rawPetsValue: string,
  compareDigest: string | null,
): PetsWritePlan {
  const petsInput: MetafieldsSetInput = {ownerId, ...PETS_METAFIELD, value: rawPetsValue};
  if (compareDigest) petsInput.compareDigest = compareDigest;
  const index = indexInputs(ownerId, derivePetIndex(pets));
  return {set: [petsInput, ...index.set], remove: index.remove};
}
