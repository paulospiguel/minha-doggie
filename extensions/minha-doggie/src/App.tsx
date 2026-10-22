import {useRef, useState} from 'preact/hooks';
import {LIMITS} from './constants';
import {COPY} from './copy';
import {OrdersSection} from './components/OrdersSection';
import {PetFormModal, type ModalElement, type PetSubmitResult} from './components/PetFormModal';
import {PetsSection, type PetsView} from './components/PetsSection';
import {QuickActions} from './components/QuickActions';
import {SubscriptionsSection} from './components/SubscriptionsSection';
import {WelcomeSection} from './components/WelcomeSection';
import {useCustomerData, type SaveFailureReason} from './hooks/useCustomerData';
import {useRecentOrders} from './hooks/useRecentOrders';
import {emptyPetDraft, petToDraft, removePet, upsertPet} from '@minha-doggie/core';
import {displayFirstName, readSettings} from './lib/settings';
import {readRawSettings, showToast} from './platform';
import type {Pet, PetDraft, ValidPetInput} from './types';

function hide(ref: {current: ModalElement | null}) {
  try {
    ref.current?.hideOverlay();
  } catch {
    // O host pode já ter fechado o overlay.
  }
}

function saveErrorMessage(reason: SaveFailureReason): string {
  switch (reason) {
    case 'conflict':
      return COPY.saveErrors.conflict;
    case 'not-ready':
      return COPY.saveErrors.notReady;
    case 'blocked':
      return COPY.saveErrors.blocked;
    default:
      return COPY.saveErrors.generic;
  }
}

export function App() {
  const settings = readSettings(readRawSettings());
  const customer = useCustomerData();
  const orders = useRecentOrders();

  const formRef = useRef<ModalElement>(null);
  const [formSession, setFormSession] = useState(0);
  const [editing, setEditing] = useState<Pet | null>(null);
  const [initialDraft, setInitialDraft] = useState<PetDraft>(emptyPetDraft());

  const pets = customer.pets;
  const petsView: PetsView =
    pets.status === 'ready'
      ? {status: 'ready', pets: pets.data.pets, discarded: pets.data.discarded}
      : {status: pets.status};
  const currentPets = pets.status === 'ready' ? pets.data.pets : [];
  const canAddPet = pets.status === 'ready' && currentPets.length < LIMITS.maxPets && !customer.saving;

  const firstName = customer.profile.status === 'ready' ? displayFirstName(customer.profile.data.firstName) : null;

  function openCreate() {
    setEditing(null);
    setInitialDraft(emptyPetDraft());
    setFormSession((value) => value + 1);
  }

  function openEdit(pet: Pet) {
    setEditing(pet);
    setInitialDraft(petToDraft(pet));
    setFormSession((value) => value + 1);
  }

  async function submitPet(input: ValidPetInput): Promise<PetSubmitResult> {
    let next: Pet[];
    try {
      next = upsertPet(currentPets, input, {id: editing?.id ?? null});
    } catch (error) {
      return {status: 'error', message: error instanceof Error ? error.message : COPY.saveErrors.generic};
    }
    const outcome = await customer.persist(next);
    if (outcome.status !== 'saved') return {status: 'error', message: saveErrorMessage(outcome.reason)};
    hide(formRef);
    showToast(editing ? COPY.petForm.updated : COPY.petForm.saved);
    setEditing(null);
    return {status: 'saved'};
  }

  async function removeEditing(): Promise<PetSubmitResult> {
    if (!editing) return {status: 'error', message: COPY.saveErrors.generic};
    let next: Pet[];
    try {
      next = removePet(currentPets, editing.id);
    } catch {
      return {status: 'error', message: COPY.saveErrors.conflict};
    }
    const outcome = await customer.persist(next);
    if (outcome.status !== 'saved') return {status: 'error', message: saveErrorMessage(outcome.reason)};
    hide(formRef);
    showToast(COPY.petDelete.removed);
    setEditing(null);
    return {status: 'saved'};
  }

  const heroImageUrl =
    customer.banner.enabled && customer.banner.imageUrl ? customer.banner.imageUrl : settings.heroImageUrl;
  const heroImageAlt =
    customer.banner.enabled && customer.banner.imageUrl
      ? customer.banner.alt || settings.heroImageAlt
      : settings.heroImageAlt;

  return (
    <s-page heading={COPY.page.greeting(firstName)} subheading={COPY.page.subheading} inlineSize="large">
      <s-stack direction="block" gap="large">
        {customer.profile.status === 'error' ? <s-banner tone="critical">{COPY.account.loadError}</s-banner> : null}

        <WelcomeSection
          storeUrl={settings.storeUrl}
          heroImageUrl={heroImageUrl}
          heroImageAlt={heroImageAlt}
        />

        <s-query-container>
          <s-grid
            gridTemplateColumns="@container (inline-size > 860px) minmax(0, 7fr) minmax(0, 5fr), minmax(0, 1fr)"
            gap="large"
            alignItems="start"
          >
            <s-stack direction="block" gap="large">
              <PetsSection
                view={petsView}
                saving={customer.saving}
                onAdd={openCreate}
                onOpen={openEdit}
                onRetry={(): void => {
                  void customer.reload();
                }}
              />
              <OrdersSection state={orders} storeUrl={settings.storeUrl} />
              <SubscriptionsSection manageUrl={settings.subscriptionsUrl} />
            </s-stack>
            <QuickActions canAddPet={canAddPet} onAddPet={openCreate} storeUrl={settings.storeUrl} />
          </s-grid>
        </s-query-container>
      </s-stack>

      <PetFormModal
        modalRef={formRef}
        session={formSession}
        mode={editing ? 'edit' : 'create'}
        initialDraft={initialDraft}
        saving={customer.saving}
        onSubmit={submitPet}
        onRemove={editing ? removeEditing : undefined}
        petName={editing?.name}
        onCancel={(): void => hide(formRef)}
      />
    </s-page>
  );
}
