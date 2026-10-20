import type {Pet} from '../src/types';

export const NOW = '2026-10-20T11:00:00.000Z';

export function pet(overrides: Partial<Pet> = {}): Pet {
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

export const OWNER = 'gid://shopify/Customer/7001';
