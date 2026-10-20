import {LIMITS, MODAL_IDS} from '../constants';
import {COPY} from '../copy';
import type {Pet} from '../types';
import {PetCard} from './PetCard';
import {SectionHeader} from './SectionHeader';

export type PetsView =
  | {status: 'loading'}
  | {status: 'error'}
  | {status: 'blocked'}
  | {status: 'ready'; pets: Pet[]; discarded: number};

interface PetsSectionProps {
  view: PetsView;
  saving: boolean;
  onAdd: () => void;
  onOpen: (pet: Pet) => void;
  onRetry: () => void;
}

/** Não há ícone de pata no conjunto oficial: usa-se `star` (os favoritos da família). */
export const PETS_ICON = 'star' as const;

export function PetsSection({view, saving, onAdd, onOpen, onRetry}: PetsSectionProps) {
  const canAdd = view.status === 'ready' && view.pets.length < LIMITS.maxPets && !saving;
  const hasPets = view.status === 'ready' && view.pets.length > 0;

  return (
    <s-section accessibilityLabel={COPY.pets.heading}>
      <s-stack direction="block" gap="base">
        <SectionHeader
          icon={PETS_ICON}
          title={COPY.pets.heading}
          action={
            hasPets
              ? {
                  label: COPY.pets.add,
                  accessibilityLabel: COPY.pets.addAccessibility,
                  commandFor: MODAL_IDS.petForm,
                  onClick: onAdd,
                  disabled: !canAdd,
                }
              : null
          }
        />

        {view.status === 'loading' ? <s-skeleton-paragraph content={COPY.pets.loading} /> : null}

        {view.status === 'error' ? (
          <s-banner tone="warning">
            <s-stack direction="block" gap="small">
              <s-text>{COPY.pets.loadError}</s-text>
              <s-button variant="secondary" onClick={onRetry}>
                {COPY.pets.retry}
              </s-button>
            </s-stack>
          </s-banner>
        ) : null}

        {view.status === 'blocked' ? <s-banner tone="critical">{COPY.pets.corrupted}</s-banner> : null}

        {view.status === 'ready' && view.pets.length === 0 ? (
          <s-box background="subdued" borderRadius="large" padding="large">
            <s-stack direction="block" gap="base" alignItems="center">
              <s-text type="strong">{COPY.pets.emptyTitle}</s-text>
              <s-paragraph color="subdued" textAlign="center">
                {COPY.pets.emptyBody}
              </s-paragraph>
              <s-button
                variant="primary"
                disabled={!canAdd}
                command="--show"
                commandFor={MODAL_IDS.petForm}
                onClick={onAdd}
              >
                {COPY.pets.addLong}
              </s-button>
            </s-stack>
          </s-box>
        ) : null}

        {view.status === 'ready' && view.pets.length > 0 ? (
          <s-stack direction="block" gap="base">
            <s-query-container>
              <s-grid
                gridTemplateColumns="@container (inline-size > 480px) repeat(2, minmax(0, 1fr)), minmax(0, 1fr)"
                gap="base"
              >
                {view.pets.map((pet) => (
                  <PetCard key={pet.id} pet={pet} disabled={saving} onOpen={onOpen} />
                ))}
              </s-grid>
            </s-query-container>
            {view.discarded > 0 ? <s-text color="subdued">{COPY.pets.discarded}</s-text> : null}
            {view.pets.length >= LIMITS.maxPets ? (
              <s-text color="subdued">{COPY.pets.limitReached(LIMITS.maxPets)}</s-text>
            ) : null}
            <s-text color="subdued" type="small">
              {COPY.pets.privacy}
            </s-text>
          </s-stack>
        ) : null}
      </s-stack>
    </s-section>
  );
}
