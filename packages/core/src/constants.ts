/**
 * Constantes partilhadas entre a extensão de conta de cliente e a extensão de admin.
 * Os metafields são app-owned (namespace reservado `$app`) e estão declarados em
 * shopify.app.toml como [customer.metafields.app.<key>].
 */

/** Lista completa de companheiros (fonte de verdade). */
export const PETS_METAFIELD = {namespace: '$app', key: 'pets', type: 'json'} as const;

/** Índice derivado para segmentos: espécies presentes ('cao', 'gato'). */
export const PET_SPECIES_METAFIELD = {
  namespace: '$app',
  key: 'pet_species',
  type: 'list.single_line_text_field',
} as const;

/** Índice derivado para segmentos: número de companheiros. */
export const PET_COUNT_METAFIELD = {namespace: '$app', key: 'pet_count', type: 'number_integer'} as const;

/** Versão do formato JSON guardado em `$app.pets` (permite migrações futuras). */
export const PETS_SCHEMA_VERSION = 1;

/** Limites de validação dos companheiros (iguais no cliente e no admin). */
export const PET_LIMITS = {
  maxPets: 12,
  nameMaxLength: 40,
  breedMaxLength: 60,
  maxAgeYears: 30,
  maxAgeMonths: 23,
} as const;

/** Máximo de metafields por chamada `metafieldsSet` (limite Shopify). */
export const METAFIELDS_SET_MAX = 25;
