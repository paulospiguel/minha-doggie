export type Species = 'dog' | 'cat';
export type AgeUnit = 'years' | 'months';

/** Código guardado em `$app.pet_species` (escolhas da definição: 'cao', 'gato'). */
export type SpeciesCode = 'cao' | 'gato';

export interface PetAge {
  value: number;
  unit: AgeUnit;
}

/** Registo de um animal tal como é guardado no metafield `$app.pets`. */
export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  age: PetAge | null;
  createdAt: string;
  updatedAt: string;
}

/** Documento JSON guardado no metafield (versão 1). */
export interface PetsDocument {
  version: number;
  pets: Pet[];
}

/** Valores do formulário (strings, tal como chegam dos campos Polaris). */
export interface PetDraft {
  name: string;
  species: string;
  breed: string;
  ageValue: string;
  ageUnit: string;
}

export type PetField = 'name' | 'species' | 'breed' | 'ageValue' | 'ageUnit' | 'form';
export type PetErrors = Partial<Record<PetField, string>>;

export interface ValidPetInput {
  name: string;
  species: Species;
  breed: string;
  age: PetAge | null;
}

export type PetValidationResult =
  | {ok: true; value: ValidPetInput}
  | {ok: false; errors: PetErrors};

export interface ParsedPets {
  pets: Pet[];
  /** Número de registos inválidos ignorados durante a leitura. */
  discarded: number;
}

/** Input de `metafieldsSet` (igual na Customer Account API e na Admin API). */
export interface MetafieldsSetInput {
  ownerId: string;
  namespace: string;
  key: string;
  type: string;
  value: string;
  compareDigest?: string;
}

/** Input de `metafieldsDelete` (igual nas duas APIs). */
export interface MetafieldIdentifierInput {
  ownerId: string;
  namespace: string;
  key: string;
}
