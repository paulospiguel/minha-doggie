import {describe, expect, it} from 'vitest';
import {PET_LIMITS as LIMITS} from '../src/constants';
import {
  describePet,
  emptyPetDraft,
  parsePetsMetafield,
  PetsDataError,
  petInitials,
  petToDraft,
  removePet,
  serializePets,
  upsertPet,
  validatePetDraft,
} from '../src/pets';
import type {Pet} from '../src/types';

const NOW = '2026-10-20T11:00:00.000Z';

function pet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    name: 'Bolinhas',
    species: 'dog',
    breed: 'Labrador',
    age: {value: 3, unit: 'years'},
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('validatePetDraft', () => {
  it('aceita um cão válido e normaliza espaços', () => {
    const result = validatePetDraft({name: '  Bolinhas  ', species: 'dog', breed: ' Labrador ', ageValue: '3', ageUnit: 'years'});
    expect(result).toEqual({ok: true, value: {name: 'Bolinhas', species: 'dog', breed: 'Labrador', age: {value: 3, unit: 'years'}}});
  });

  it('aceita gato sem raça nem idade', () => {
    const result = validatePetDraft({...emptyPetDraft(), name: 'Mia', species: 'cat'});
    expect(result).toEqual({ok: true, value: {name: 'Mia', species: 'cat', breed: '', age: null}});
  });

  it('aceita acentos, apóstrofos e hífenes no nome', () => {
    expect(validatePetDraft({...emptyPetDraft(), name: "Lúcia D'Ávila-Sá"}).ok).toBe(true);
  });

  it('exige nome', () => {
    const result = validatePetDraft({...emptyPetDraft(), name: '   '});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.name).toBe('Indica o nome do teu companheiro.');
  });

  it('rejeita nomes demasiado longos e com símbolos', () => {
    const long = validatePetDraft({...emptyPetDraft(), name: 'a'.repeat(LIMITS.nameMaxLength + 1)});
    const html = validatePetDraft({...emptyPetDraft(), name: '<script>'});
    expect(long.ok).toBe(false);
    expect(html.ok).toBe(false);
  });

  it('rejeita espécies fora de cão/gato', () => {
    const result = validatePetDraft({...emptyPetDraft(), name: 'Nemo', species: 'fish'});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.species).toBeDefined();
  });

  it('valida idade: inteiro, intervalo e unidade', () => {
    expect(validatePetDraft({...emptyPetDraft(), name: 'A', ageValue: '2.5'}).ok).toBe(false);
    expect(validatePetDraft({...emptyPetDraft(), name: 'A', ageValue: '-1'}).ok).toBe(false);
    expect(validatePetDraft({...emptyPetDraft(), name: 'A', ageValue: '31', ageUnit: 'years'}).ok).toBe(false);
    expect(validatePetDraft({...emptyPetDraft(), name: 'A', ageValue: '24', ageUnit: 'months'}).ok).toBe(false);
    expect(validatePetDraft({...emptyPetDraft(), name: 'A', ageValue: '6', ageUnit: 'weeks'}).ok).toBe(false);
    expect(validatePetDraft({...emptyPetDraft(), name: 'A', ageValue: '6', ageUnit: 'months'})).toEqual({
      ok: true,
      value: {name: 'A', species: 'dog', breed: '', age: {value: 6, unit: 'months'}},
    });
    expect(validatePetDraft({...emptyPetDraft(), name: 'A', ageValue: '0'}).ok).toBe(true);
  });

  it('rejeita raça demasiado longa', () => {
    expect(validatePetDraft({...emptyPetDraft(), name: 'A', breed: 'x'.repeat(LIMITS.breedMaxLength + 1)}).ok).toBe(false);
  });

  it('remove caracteres de controlo', () => {
    const result = validatePetDraft({...emptyPetDraft(), name: 'Bo\u0000li\u200Bnhas'});
    expect(result.ok && result.value.name).toBe('Bo li nhas');
  });
});

describe('parsePetsMetafield / serializePets', () => {
  it('trata metafield inexistente como lista vazia', () => {
    expect(parsePetsMetafield(null)).toEqual({pets: [], discarded: 0});
    expect(parsePetsMetafield(undefined)).toEqual({pets: [], discarded: 0});
    expect(parsePetsMetafield('')).toEqual({pets: [], discarded: 0});
  });

  it('faz round-trip do formato v1', () => {
    const pets = [pet(), pet({id: 'bbbbbbbb-0000-4000-8000-000000000002', name: 'Mia', species: 'cat', breed: '', age: null})];
    const json = serializePets(pets);
    expect(JSON.parse(json).version).toBe(1);
    expect(parsePetsMetafield(json)).toEqual({pets, discarded: 0});
  });

  it('lê o formato antigo do starter (array com ageYears)', () => {
    const legacy = JSON.stringify([{id: '1729000000000-abcdefghij', name: 'Rex', species: 'dog', breed: 'SRD', ageYears: 4}]);
    const parsed = parsePetsMetafield(legacy);
    expect(parsed.pets[0]).toMatchObject({name: 'Rex', age: {value: 4, unit: 'years'}});
  });

  it('descarta registos inválidos e duplicados sem falhar', () => {
    const raw = JSON.stringify({
      version: 1,
      pets: [pet(), pet(), {id: 'x', name: 'Curto'}, {id: 'cccccccc-0000-4000-8000-000000000003', name: 'Peixe', species: 'fish'}, null, 'texto'],
    });
    const parsed = parsePetsMetafield(raw);
    expect(parsed.pets).toHaveLength(1);
    expect(parsed.discarded).toBe(5);
  });

  it('limita ao máximo de companheiros', () => {
    const many = Array.from({length: LIMITS.maxPets + 3}, (_, i) =>
      pet({id: `dddddddd-0000-4000-8000-${String(i).padStart(12, '0')}`}),
    );
    const parsed = parsePetsMetafield(JSON.stringify({version: 1, pets: many}));
    expect(parsed.pets).toHaveLength(LIMITS.maxPets);
    expect(parsed.discarded).toBe(3);
  });

  it('lança PetsDataError para JSON ilegível ou formato desconhecido (nunca sobrescreve)', () => {
    expect(() => parsePetsMetafield('{not json')).toThrow(PetsDataError);
    expect(() => parsePetsMetafield('{"foo":1}')).toThrow(PetsDataError);
    expect(() => parsePetsMetafield('{"version":99,"pets":[]}')).toThrow(PetsDataError);
  });

  it('serializePets recusa mais do que o máximo', () => {
    const many = Array.from({length: LIMITS.maxPets + 1}, (_, i) => pet({id: `eeeeeeee-${i}-aaaa`}));
    expect(() => serializePets(many)).toThrow(PetsDataError);
  });

  it('não guarda campos extra (minimização de dados)', () => {
    const withExtra = {...pet(), email: 'x@y.pt'} as Pet;
    expect(serializePets([withExtra])).not.toContain('email');
  });
});

describe('upsertPet / removePet', () => {
  const input = {name: 'Mia', species: 'cat' as const, breed: '', age: null};

  it('adiciona com id novo e datas', () => {
    const next = upsertPet([], input, {nowIso: NOW, newId: () => 'ffffffff-0000-4000-8000-000000000009'});
    expect(next).toEqual([{id: 'ffffffff-0000-4000-8000-000000000009', ...input, createdAt: NOW, updatedAt: NOW}]);
  });

  it('edita preservando id e createdAt', () => {
    const original = pet({createdAt: '2026-01-01T00:00:00.000Z'});
    const next = upsertPet([original], input, {id: original.id, nowIso: NOW});
    expect(next[0]).toMatchObject({id: original.id, name: 'Mia', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: NOW});
  });

  it('não muta a lista original', () => {
    const list = [pet()];
    upsertPet(list, input, {nowIso: NOW, newId: () => 'ffffffff-0000-4000-8000-00000000000a'});
    expect(list).toHaveLength(1);
  });

  it('respeita o limite ao adicionar', () => {
    const full = Array.from({length: LIMITS.maxPets}, (_, i) => pet({id: `abcdefab-${i}-0000`}));
    expect(() => upsertPet(full, input)).toThrow(PetsDataError);
  });

  it('remove e falha para ids inexistentes', () => {
    const list = [pet()];
    expect(removePet(list, list[0].id)).toEqual([]);
    expect(() => removePet(list, 'nope')).toThrow(PetsDataError);
    expect(() => upsertPet(list, input, {id: 'nope'})).toThrow(PetsDataError);
  });
});

describe('apresentação', () => {
  it('descreve o companheiro em pt-PT', () => {
    expect(describePet(pet())).toBe('Cão · Labrador · 3 anos');
    expect(describePet(pet({species: 'cat', breed: '', age: {value: 1, unit: 'years'}}))).toBe('Gato · 1 ano');
    expect(describePet(pet({age: {value: 6, unit: 'months'}}))).toBe('Cão · Labrador · 6 meses');
    expect(describePet(pet({age: {value: 0, unit: 'years'}}))).toBe('Cão · Labrador · Menos de 1 ano');
  });

  it('gera iniciais', () => {
    expect(petInitials('bolinhas')).toBe('B');
    expect(petInitials('Senhor Bigodes')).toBe('SB');
    expect(petInitials('')).toBe('?');
  });

  it('converte para rascunho de formulário', () => {
    expect(petToDraft(pet())).toEqual({name: 'Bolinhas', species: 'dog', breed: 'Labrador', ageValue: '3', ageUnit: 'years'});
  });
});
