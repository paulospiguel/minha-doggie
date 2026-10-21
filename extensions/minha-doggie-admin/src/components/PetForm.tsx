import {
  PET_COPY,
  PET_LIMITS,
  SPECIES_LIST,
  validatePetDraft,
  type PetDraft,
  type PetErrors,
  type ValidPetInput,
} from '@minha-doggie/core';
import {useState} from 'preact/hooks';
import {ADMIN_COPY} from '../copy';
import {readValue} from '../lib/events';

interface PetFormProps {
  mode: 'create' | 'edit';
  initialDraft: PetDraft;
  saving: boolean;
  formError: string | null;
  onSubmit: (input: ValidPetInput) => void;
  onCancel: () => void;
}

/** Formulário inline (o bloco de admin não usa modais): mesma validação da conta de cliente. */
export function PetForm({mode, initialDraft, saving, formError, onSubmit, onCancel}: PetFormProps) {
  const [draft, setDraft] = useState<PetDraft>(initialDraft);
  const [errors, setErrors] = useState<PetErrors>({});
  const copy = ADMIN_COPY.form;

  function update(field: keyof PetDraft, value: string) {
    setDraft((current) => ({...current, [field]: value}));
    if (errors[field]) setErrors((current) => ({...current, [field]: undefined}));
  }

  function submit() {
    if (saving) return;
    const result = validatePetDraft(draft, ADMIN_COPY.validation);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.value);
  }

  const maxAge = draft.ageUnit === 'months' ? PET_LIMITS.maxAgeMonths : PET_LIMITS.maxAgeYears;

  return (
    <s-stack direction="block" gap="base">
      <s-heading>{mode === 'edit' ? copy.headingEdit : copy.headingNew}</s-heading>
      {formError ? <s-banner tone="critical">{formError}</s-banner> : null}
      <s-text-field
        label={copy.name}
        value={draft.name}
        required
        maxLength={PET_LIMITS.nameMaxLength}
        autocomplete="off"
        error={errors.name}
        onInput={(event: Event) => update('name', readValue(event))}
      />
      <s-select
        label={copy.species}
        value={draft.species}
        error={errors.species}
        onChange={(event: Event) => update('species', readValue(event))}
      >
        {SPECIES_LIST.map((species) => (
          <s-option key={species} value={species}>
            {PET_COPY.species[species]}
          </s-option>
        ))}
      </s-select>
      <s-text-field
        label={copy.breed}
        value={draft.breed}
        maxLength={PET_LIMITS.breedMaxLength}
        autocomplete="off"
        error={errors.breed}
        onInput={(event: Event) => update('breed', readValue(event))}
      />
      <s-stack direction="inline" gap="base">
        <s-number-field
          label={copy.ageValue}
          value={draft.ageValue}
          min={0}
          max={maxAge}
          step={1}
          inputMode="numeric"
          error={errors.ageValue}
          onInput={(event: Event) => update('ageValue', readValue(event))}
          onChange={(event: Event) => update('ageValue', readValue(event))}
        />
        <s-select
          label={copy.ageUnit}
          value={draft.ageUnit}
          error={errors.ageUnit}
          onChange={(event: Event) => update('ageUnit', readValue(event))}
        >
          <s-option value="years">{PET_COPY.ageUnit.years}</s-option>
          <s-option value="months">{PET_COPY.ageUnit.months}</s-option>
        </s-select>
      </s-stack>
      <s-stack direction="inline" gap="small" justifyContent="end">
        <s-button variant="secondary" disabled={saving} onClick={onCancel}>
          {copy.cancel}
        </s-button>
        <s-button variant="primary" loading={saving} onClick={submit}>
          {copy.save}
        </s-button>
      </s-stack>
    </s-stack>
  );
}
