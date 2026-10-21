import {PET_LIMITS as LIMITS, PETS_SCHEMA_VERSION} from './constants';
import {PET_COPY} from './copy';
import type {
  AgeUnit,
  ParsedPets,
  Pet,
  PetAge,
  PetDraft,
  PetErrors,
  PetValidationResult,
  PetsDocument,
  Species,
  ValidPetInput,
} from './types';
import {sanitizeText, textLength, truncate} from './text';

/** Ordem de apresentação nos formulários (cão e gato primeiro). */
export const SPECIES_LIST: readonly Species[] = ['dog', 'cat', 'rabbit', 'ferret', 'bird', 'fish', 'reptil'];
const SPECIES = SPECIES_LIST;
const AGE_UNITS: readonly AgeUnit[] = ['years', 'months'];
const NAME_PATTERN = /^[\p{L}\p{M}\p{N} '’.-]+$/u;
const BREED_PATTERN = /^[\p{L}\p{M}\p{N} '’.,/()-]+$/u;
const ID_PATTERN = /^[a-z0-9-]{8,64}$/;

export class PetsDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PetsDataError';
  }
}

export function isSpecies(value: unknown): value is Species {
  return typeof value === 'string' && (SPECIES as readonly string[]).includes(value);
}

export function isAgeUnit(value: unknown): value is AgeUnit {
  return typeof value === 'string' && (AGE_UNITS as readonly string[]).includes(value);
}

function maxAgeFor(unit: AgeUnit): number {
  return unit === 'months' ? LIMITS.maxAgeMonths : LIMITS.maxAgeYears;
}

function normalizeAge(raw: unknown): PetAge | null {
  if (!raw || typeof raw !== 'object') return null;
  const {value, unit} = raw as {value?: unknown; unit?: unknown};
  if (!isAgeUnit(unit)) return null;
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < 0 || value > maxAgeFor(unit)) return null;
  return {value, unit};
}

function normalizeIsoDate(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
}

/** Converte um registo desconhecido num Pet válido ou devolve null. */
export function normalizeStoredPet(raw: unknown): Pet | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim().toLowerCase() : '';
  if (!ID_PATTERN.test(id)) return null;
  const name = truncate(sanitizeText(record.name), LIMITS.nameMaxLength);
  if (!name) return null;
  if (!isSpecies(record.species)) return null;
  const breed = truncate(sanitizeText(record.breed), LIMITS.breedMaxLength);
  // Compatibilidade com o starter v2, que guardava `ageYears` (inteiro).
  let age = normalizeAge(record.age);
  if (!age && typeof record.ageYears === 'number') {
    age = normalizeAge({value: record.ageYears, unit: 'years'});
  }
  const epoch = new Date(0).toISOString();
  const createdAt = normalizeIsoDate(record.createdAt, epoch);
  const updatedAt = normalizeIsoDate(record.updatedAt, createdAt);
  return {id, name, species: record.species, breed, age, createdAt, updatedAt};
}

/**
 * Lê o valor bruto do metafield. Aceita o formato v1 ({version, pets}) e o
 * array simples do starter. Registos inválidos são descartados (contados);
 * JSON ilegível lança PetsDataError para nunca sobrescrever dados por engano.
 */
export function parsePetsMetafield(raw: string | null | undefined): ParsedPets {
  if (raw == null || raw.trim() === '') return {pets: [], discarded: 0};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new PetsDataError('O valor do metafield não é JSON válido.');
  }
  let list: unknown;
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as PetsDocument).pets)) {
    const version = (parsed as PetsDocument).version;
    if (typeof version === 'number' && version > PETS_SCHEMA_VERSION) {
      throw new PetsDataError(`Versão de dados não suportada: ${version}.`);
    }
    list = (parsed as PetsDocument).pets;
  } else {
    throw new PetsDataError('Formato de dados de companheiros desconhecido.');
  }
  const pets: Pet[] = [];
  const seen = new Set<string>();
  let discarded = 0;
  for (const item of list as unknown[]) {
    const pet = normalizeStoredPet(item);
    if (!pet || seen.has(pet.id) || pets.length >= LIMITS.maxPets) {
      discarded += 1;
      continue;
    }
    seen.add(pet.id);
    pets.push(pet);
  }
  return {pets, discarded};
}

/** Serializa para o formato v1 guardado no metafield. */
export function serializePets(pets: readonly Pet[]): string {
  if (pets.length > LIMITS.maxPets) {
    throw new PetsDataError(`Máximo de ${LIMITS.maxPets} companheiros.`);
  }
  const document: PetsDocument = {
    version: PETS_SCHEMA_VERSION,
    pets: pets.map((pet) => ({
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      age: pet.age ? {value: pet.age.value, unit: pet.age.unit} : null,
      createdAt: pet.createdAt,
      updatedAt: pet.updatedAt,
    })),
  };
  return JSON.stringify(document);
}

export function emptyPetDraft(): PetDraft {
  return {name: '', species: 'dog', breed: '', ageValue: '', ageUnit: 'years'};
}

export function petToDraft(pet: Pet): PetDraft {
  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    ageValue: pet.age ? String(pet.age.value) : '',
    ageUnit: pet.age ? pet.age.unit : 'years',
  };
}

/** Valida e normaliza o formulário. Nunca lança; devolve erros por campo. */
export interface PetValidationMessages {
  nameRequired: string;
  nameTooLong: (max: number) => string;
  nameInvalid: string;
  speciesInvalid: string;
  breedTooLong: (max: number) => string;
  breedInvalid: string;
  ageInvalid: string;
  ageRange: (max: number, unit: string) => string;
  ageUnitInvalid: string;
}

export function validatePetDraft(
  draft: PetDraft,
  messages: PetValidationMessages = PET_COPY.validation,
): PetValidationResult {
  const errors: PetErrors = {};
  const name = sanitizeText(draft.name);
  const breed = sanitizeText(draft.breed);

  if (!name) errors.name = messages.nameRequired;
  else if (textLength(name) > LIMITS.nameMaxLength) errors.name = messages.nameTooLong(LIMITS.nameMaxLength);
  else if (!NAME_PATTERN.test(name)) errors.name = messages.nameInvalid;

  if (!isSpecies(draft.species)) errors.species = messages.speciesInvalid;

  if (breed) {
    if (textLength(breed) > LIMITS.breedMaxLength) errors.breed = messages.breedTooLong(LIMITS.breedMaxLength);
    else if (!BREED_PATTERN.test(breed)) errors.breed = messages.breedInvalid;
  }

  let age: PetAge | null = null;
  const ageText = sanitizeText(draft.ageValue).replace(',', '.');
  if (ageText) {
    if (!isAgeUnit(draft.ageUnit)) {
      errors.ageUnit = messages.ageUnitInvalid;
    } else if (!/^\d{1,3}$/.test(ageText)) {
      errors.ageValue = messages.ageInvalid;
    } else {
      const value = Number(ageText);
      const max = maxAgeFor(draft.ageUnit);
      if (value > max) {
        errors.ageValue = messages.ageRange(max, PET_COPY.ageUnit[draft.ageUnit]);
      } else {
        age = {value, unit: draft.ageUnit};
      }
    }
  }

  if (Object.keys(errors).length > 0) return {ok: false, errors};
  return {ok: true, value: {name, species: draft.species as Species, breed, age}};
}

/** Gera um id aleatório não sequencial (não contém dados pessoais). */
export function createPetId(random: () => number = Math.random, now: () => number = Date.now): string {
  const cryptoApi = (globalThis as {crypto?: Crypto}).crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID().toLowerCase();
  }
  const rand = Array.from({length: 12}, () => Math.floor(random() * 36).toString(36)).join('');
  return `${now().toString(36)}-${rand}`;
}

/** Adiciona (id ausente) ou atualiza (id existente) um companheiro. Imutável. */
export function upsertPet(
  pets: readonly Pet[],
  input: ValidPetInput,
  options: {id?: string | null; nowIso?: string; newId?: () => string} = {},
): Pet[] {
  const nowIso = options.nowIso ?? new Date().toISOString();
  if (options.id) {
    const index = pets.findIndex((pet) => pet.id === options.id);
    if (index === -1) throw new PetsDataError(PET_COPY.notFound);
    const current = pets[index];
    const updated: Pet = {...current, ...input, updatedAt: nowIso};
    return pets.map((pet, i) => (i === index ? updated : pet));
  }
  if (pets.length >= LIMITS.maxPets) {
    throw new PetsDataError(PET_COPY.limitReached(LIMITS.maxPets));
  }
  const id = (options.newId ?? createPetId)();
  return [...pets, {id, ...input, createdAt: nowIso, updatedAt: nowIso}];
}

export function removePet(pets: readonly Pet[], id: string): Pet[] {
  if (!pets.some((pet) => pet.id === id)) throw new PetsDataError(PET_COPY.notFound);
  return pets.filter((pet) => pet.id !== id);
}

/** Linha de detalhe: "Cão · Labrador · 3 anos". */
export function describePet(pet: Pet): string {
  const parts: string[] = [PET_COPY.species[pet.species]];
  if (pet.breed) parts.push(pet.breed);
  if (pet.age) parts.push(PET_COPY.age(pet.age.value, pet.age.unit));
  return parts.join(' · ');
}

export function petInitials(name: string): string {
  const words = sanitizeText(name).split(' ').filter(Boolean);
  const letters = words.slice(0, 2).map((word) => Array.from(word)[0] ?? '');
  return letters.join('').toLocaleUpperCase('pt-PT') || '?';
}
