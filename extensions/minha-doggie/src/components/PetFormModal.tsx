import type {Ref} from 'preact';

export type ModalElement = HTMLElementTagNameMap['s-modal'];
import {useEffect, useState} from 'preact/hooks';
import {LIMITS, MODAL_IDS} from '../constants';
import {COPY} from '../copy';
import {validatePetDraft} from '@minha-doggie/core';
import type {PetDraft, PetErrors, ValidPetInput} from '../types';

export type PetSubmitResult = {status: 'saved'} | {status: 'error'; message: string};

interface PetFormModalProps {
  modalRef: Ref<ModalElement>;
  /** Muda a cada abertura para reiniciar o formulário. */
  session: number;
  mode: 'create' | 'edit';
  initialDraft: PetDraft;
  saving: boolean;
  onSubmit: (input: ValidPetInput) => Promise<PetSubmitResult>;
  /** Só em modo edição. A remoção pede confirmação no próprio modal (a Shopify desaconselha modais encadeados). */
  onRemove?: () => Promise<PetSubmitResult>;
  /** Nome guardado do companheiro em edição (texto de confirmação). */
  petName?: string;
  onCancel: () => void;
}

function readValue(event: Event): string {
  const target = event.currentTarget as {value?: unknown} | null;
  return typeof target?.value === 'string' ? target.value : '';
}

function readFirstValue(event: Event): string {
  const target = event.currentTarget as {values?: unknown} | null;
  const values = target?.values;
  return Array.isArray(values) && typeof values[0] === 'string' ? values[0] : '';
}

/**
 * Formulário de adicionar/editar (e confirmar remoção) num único <s-modal>. O modal fica sempre
 * montado (necessário para command/commandFor); o estado é reiniciado
 * sempre que `session` muda (nova abertura).
 */
export function PetFormModal({
  modalRef,
  session,
  mode,
  initialDraft,
  saving,
  onSubmit,
  onRemove,
  petName,
  onCancel,
}: PetFormModalProps) {
  const [draft, setDraft] = useState<PetDraft>(initialDraft);
  const [errors, setErrors] = useState<PetErrors>({});
  const [step, setStep] = useState<'form' | 'confirm-remove'>('form');

  useEffect(() => {
    setDraft(initialDraft);
    setErrors({});
    setStep('form');
  }, [session]);

  async function confirmRemove() {
    if (saving || !onRemove) return;
    const outcome = await onRemove();
    if (outcome.status === 'error') setErrors({form: outcome.message});
  }

  if (step === 'confirm-remove') {
    return (
      <s-modal id={MODAL_IDS.petForm} ref={modalRef} heading={COPY.petDelete.heading} size="small">
        <s-stack direction="block" gap="base">
          {errors.form ? <s-banner tone="critical">{errors.form}</s-banner> : null}
          <s-paragraph>{COPY.petDelete.body(petName ?? '')}</s-paragraph>
        </s-stack>
        <s-button
          slot="secondary-actions"
          variant="secondary"
          disabled={saving}
          onClick={() => {
            setErrors({});
            setStep('form');
          }}
        >
          {COPY.petDelete.cancel}
        </s-button>
        <s-button slot="primary-action" variant="primary" tone="critical" loading={saving} onClick={() => void confirmRemove()}>
          {COPY.petDelete.confirm}
        </s-button>
      </s-modal>
    );
  }

  function update(field: keyof PetDraft, value: string) {
    setDraft((current) => ({...current, [field]: value}));
    if (errors[field] || errors.form) setErrors((current) => ({...current, [field]: undefined, form: undefined}));
  }

  async function submit() {
    if (saving) return;
    const result = validatePetDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const outcome = await onSubmit(result.value);
    if (outcome.status === 'error') setErrors({form: outcome.message});
  }

  const maxAge = draft.ageUnit === 'months' ? LIMITS.maxAgeMonths : LIMITS.maxAgeYears;

  // Os botões com `slot` têm de ser filhos diretos de <s-modal>.
  return (
    <s-modal
      id={MODAL_IDS.petForm}
      ref={modalRef}
      heading={mode === 'edit' ? COPY.petForm.headingEdit : COPY.petForm.headingNew}
      size="base"
    >
    <s-form
      onSubmit={() => {
        void submit();
      }}
    >
      <s-stack direction="block" gap="base">
        {errors.form ? <s-banner tone="critical">{errors.form}</s-banner> : null}
        <s-text-field
          label={COPY.petForm.name}
          value={draft.name}
          required
          maxLength={LIMITS.nameMaxLength}
          autocomplete="off"
          error={errors.name}
          onInput={(event: Event) => update('name', readValue(event))}
        />
        <s-choice-list
          label={COPY.petForm.species}
          name="species"
          values={[draft.species]}
          error={errors.species}
          onChange={(event: Event) => update('species', readFirstValue(event))}
        >
          <s-choice value="dog" selected={draft.species === 'dog'}>
            {COPY.pets.species.dog}
          </s-choice>
          <s-choice value="cat" selected={draft.species === 'cat'}>
            {COPY.pets.species.cat}
          </s-choice>
        </s-choice-list>
        <s-text-field
          label={COPY.petForm.breed}
          value={draft.breed}
          maxLength={LIMITS.breedMaxLength}
          placeholder={COPY.petForm.breedPlaceholder}
          autocomplete="off"
          error={errors.breed}
          onInput={(event: Event) => update('breed', readValue(event))}
        />
        <s-stack direction="inline" gap="base" alignItems="start">
          <s-number-field
            label={COPY.petForm.ageValue}
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
            label={COPY.petForm.ageUnit}
            value={draft.ageUnit}
            error={errors.ageUnit}
            onChange={(event: Event) => update('ageUnit', readValue(event))}
          >
            <s-option value="years">{COPY.pets.ageUnit.years}</s-option>
            <s-option value="months">{COPY.pets.ageUnit.months}</s-option>
          </s-select>
        </s-stack>
      </s-stack>
    </s-form>
      <s-button slot="secondary-actions" variant="secondary" disabled={saving} onClick={onCancel}>
        {COPY.petForm.cancel}
      </s-button>
      {mode === 'edit' && onRemove ? (
        <s-button
          slot="secondary-actions"
          variant="secondary"
          tone="critical"
          disabled={saving}
          onClick={() => {
            setErrors({});
            setStep('confirm-remove');
          }}
        >
          {COPY.petForm.remove}
        </s-button>
      ) : null}
      <s-button slot="primary-action" variant="primary" loading={saving} onClick={() => void submit()}>
        {COPY.petForm.save}
      </s-button>
    </s-modal>
  );
}
