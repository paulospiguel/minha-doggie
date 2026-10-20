import {
  describePet,
  emptyPetDraft,
  PET_LIMITS,
  petToDraft,
  removePet,
  upsertPet,
  type Pet,
  type ValidPetInput,
} from '@minha-doggie/core';
import {useEffect, useState} from 'preact/hooks';
import {ADMIN_COPY} from '../copy';
import {isAccessError} from '../graphql/client';
import {fetchCustomerPets, PetsConflictError, saveCustomerPets, type CustomerPetsState} from '../graphql/api';
import {errorMessage} from '../lib/events';
import {PetForm} from './PetForm';

type LoadState = {status: 'loading'} | {status: 'error'; message: string} | {status: 'ready'; data: CustomerPetsState};
type Mode = {type: 'list'} | {type: 'form'; petId: string | null} | {type: 'confirm'; petId: string};
type Notice = {tone: 'success' | 'warning' | 'critical'; message: string} | null;

const copy = ADMIN_COPY.block;

export function PetsBlock({customerId}: {customerId: string | null}) {
  const [load, setLoad] = useState<LoadState>({status: 'loading'});
  const [mode, setMode] = useState<Mode>({type: 'list'});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    if (!customerId) {
      setLoad({status: 'error', message: copy.loadError});
      return;
    }
    setLoad({status: 'loading'});
    fetchCustomerPets(customerId)
      .then((data) => active && setLoad({status: 'ready', data}))
      .catch(() => active && setLoad({status: 'error', message: copy.loadError}));
    return () => {
      active = false;
    };
  }, [customerId, reloadKey]);

  if (load.status === 'loading') {
    return (
      <s-admin-block heading={copy.heading}>
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-spinner accessibilityLabel={copy.loading} />
          <s-text color="subdued">{copy.loading}</s-text>
        </s-stack>
      </s-admin-block>
    );
  }

  if (load.status === 'error') {
    return (
      <s-admin-block heading={copy.heading}>
        <s-stack direction="block" gap="small">
          <s-banner tone="critical">{load.message}</s-banner>
          <s-button onClick={() => setReloadKey((key) => key + 1)}>{copy.retry}</s-button>
        </s-stack>
      </s-admin-block>
    );
  }

  const state = load.data;
  if (state.pets === null) {
    return (
      <s-admin-block heading={copy.heading}>
        <s-banner tone="warning">{copy.corrupted}</s-banner>
      </s-admin-block>
    );
  }
  const pets: Pet[] = state.pets;

  async function persist(next: Pet[], success: string) {
    setSaving(true);
    setFormError(null);
    try {
      const digest = await saveCustomerPets(state.customerId, next, state.compareDigest);
      setLoad({
        status: 'ready',
        data: {...state, pets: next, discarded: 0, compareDigest: digest, indexInSync: true, rawPetsValue: null},
      });
      setMode({type: 'list'});
      setNotice({tone: 'success', message: success});
    } catch (error) {
      if (error instanceof PetsConflictError) {
        setMode({type: 'list'});
        setNotice({tone: 'warning', message: copy.conflict});
        setReloadKey((key) => key + 1);
      } else if (isAccessError(error)) {
        setFormError(copy.accessError);
        setNotice({tone: 'critical', message: copy.accessError});
      } else {
        const message = copy.saveError(errorMessage(error));
        setFormError(message);
        setNotice({tone: 'critical', message});
      }
    } finally {
      setSaving(false);
    }
  }

  function submit(input: ValidPetInput, petId: string | null) {
    try {
      void persist(upsertPet(pets, input, {id: petId}), copy.saved);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  function confirmRemove(petId: string) {
    try {
      void persist(removePet(pets, petId), copy.removed);
    } catch (error) {
      setNotice({tone: 'critical', message: errorMessage(error)});
    }
  }

  const body = (() => {
    if (mode.type === 'form') {
      const pet = mode.petId ? pets.find((item) => item.id === mode.petId) : undefined;
      return (
        <PetFormHost
          key={mode.petId ?? 'new'}
          pet={pet}
          saving={saving}
          formError={formError}
          onSubmit={(input) => submit(input, mode.petId)}
          onCancel={() => {
            setFormError(null);
            setMode({type: 'list'});
          }}
        />
      );
    }
    if (mode.type === 'confirm') {
      const pet = pets.find((item) => item.id === mode.petId);
      return (
        <s-stack direction="block" gap="base">
          <s-text>{ADMIN_COPY.confirm.body(pet?.name ?? '')}</s-text>
          <s-stack direction="inline" gap="small" justifyContent="end">
            <s-button variant="secondary" disabled={saving} onClick={() => setMode({type: 'list'})}>
              {ADMIN_COPY.confirm.cancel}
            </s-button>
            <s-button variant="primary" tone="critical" loading={saving} onClick={() => confirmRemove(mode.petId)}>
              {ADMIN_COPY.confirm.confirm}
            </s-button>
          </s-stack>
        </s-stack>
      );
    }
    return (
      <s-stack direction="block" gap="base">
        {!state.indexInSync ? (
          <s-banner tone="warning">
            <s-stack direction="block" gap="small">
              <s-text>{copy.outOfSync}</s-text>
              <s-button loading={saving} onClick={() => void persist(pets, copy.synced)}>
                {copy.syncNow}
              </s-button>
            </s-stack>
          </s-banner>
        ) : null}
        {state.discarded > 0 ? <s-banner tone="info">{copy.discarded(state.discarded)}</s-banner> : null}
        {pets.length === 0 ? <s-text color="subdued">{copy.empty}</s-text> : null}
        {pets.map((pet, index) => (
          <s-stack key={pet.id} direction="block" gap="small">
            {index > 0 ? <s-divider /> : null}
            <s-stack direction="inline" gap="base" justifyContent="space-between" alignItems="center">
              <s-stack direction="block" gap="small-500">
                <s-text type="strong">{pet.name}</s-text>
                <s-text color="subdued">{describePet(pet)}</s-text>
              </s-stack>
              <s-stack direction="inline" gap="small-300">
                <s-button
                  variant="tertiary"
                  icon="edit"
                  accessibilityLabel={copy.edit(pet.name)}
                  onClick={() => {
                    setNotice(null);
                    setFormError(null);
                    setMode({type: 'form', petId: pet.id});
                  }}
                />
                <s-button
                  variant="tertiary"
                  tone="critical"
                  icon="delete"
                  accessibilityLabel={copy.remove(pet.name)}
                  onClick={() => {
                    setNotice(null);
                    setMode({type: 'confirm', petId: pet.id});
                  }}
                />
              </s-stack>
            </s-stack>
          </s-stack>
        ))}
        {pets.length >= PET_LIMITS.maxPets ? (
          <s-text color="subdued">{copy.limitReached}</s-text>
        ) : (
          <s-stack direction="inline">
            <s-button
              icon="plus"
              onClick={() => {
                setNotice(null);
                setFormError(null);
                setMode({type: 'form', petId: null});
              }}
            >
              {copy.add}
            </s-button>
          </s-stack>
        )}
      </s-stack>
    );
  })();

  return (
    <s-admin-block heading={copy.heading} collapsedSummary={copy.collapsed(pets.length)}>
      <s-stack direction="block" gap="base">
        {notice && mode.type === 'list' ? (
          <s-banner tone={notice.tone} dismissible onDismiss={() => setNotice(null)}>
            {notice.message}
          </s-banner>
        ) : null}
        {body}
      </s-stack>
    </s-admin-block>
  );
}


function PetFormHost(props: {
  pet: Pet | undefined;
  saving: boolean;
  formError: string | null;
  onSubmit: (input: ValidPetInput) => void;
  onCancel: () => void;
}) {
  return (
    <PetForm
      mode={props.pet ? 'edit' : 'create'}
      initialDraft={props.pet ? petToDraft(props.pet) : emptyPetDraft()}
      saving={props.saving}
      formError={props.formError}
      onSubmit={props.onSubmit}
      onCancel={props.onCancel}
    />
  );
}
