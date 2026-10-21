import {MODAL_IDS} from '../constants';
import {COPY} from '../copy';
import {petInitials} from '@minha-doggie/core';
import type {Pet} from '../types';

interface PetCardProps {
  pet: Pet;
  disabled: boolean;
  onOpen: (pet: Pet) => void;
}

/** Cartão compacto: avatar, nome, espécie · raça, idade e chevron. Abre o modal de edição. */
export function PetCard({pet, disabled, onOpen}: PetCardProps) {
  const summary = [COPY.pets.species[pet.species], pet.breed, pet.age ? COPY.pets.age(pet.age.value, pet.age.unit) : null]
    .filter(Boolean)
    .join(' • ');
  return (
    <s-clickable
      border="base"
      borderRadius="large"
      padding="base"
      disabled={disabled}
      command="--show"
      commandFor={MODAL_IDS.petForm}
      accessibilityLabel={COPY.pets.editAccessibility(pet.name)}
      onClick={() => onOpen(pet)}
    >
      <s-grid gridTemplateColumns="auto minmax(0, 1fr) auto" gap="base" alignItems="center">
        <s-avatar initials={petInitials(pet.name)} alt={pet.name} size="large" />
        <s-stack direction="block" gap="none">
          <s-text type="strong">{pet.name}</s-text>
          <s-text color="subdued" type="small">{summary}</s-text>
        </s-stack>
        <s-icon type="chevron-right" />
      </s-grid>
    </s-clickable>
  );
}
