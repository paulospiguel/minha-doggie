import {useCallback, useEffect, useRef, useState} from 'preact/hooks';
import {fetchCustomer, PetsConflictError, savePets} from '../graphql/api';
import type {CustomerProfile, LoadState, Pet, PetsState} from '../types';

export type SaveFailureReason = 'conflict' | 'error' | 'not-ready' | 'blocked';
export type SaveOutcome = {status: 'saved'} | {status: 'failed'; reason: SaveFailureReason};

export interface CustomerDataApi {
  profile: LoadState<CustomerProfile>;
  /** 'blocked' = JSON guardado ilegível; leitura apenas. */
  pets: LoadState<PetsState> | {status: 'blocked'};
  saving: boolean;
  reload: () => Promise<void>;
  persist: (next: Pet[]) => Promise<SaveOutcome>;
}

export function useCustomerData(): CustomerDataApi {
  const [profile, setProfile] = useState<LoadState<CustomerProfile>>({status: 'loading'});
  const [pets, setPets] = useState<CustomerDataApi['pets']>({status: 'loading'});
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  const savingRef = useRef(false);

  const reload = useCallback(async () => {
    try {
      const data = await fetchCustomer();
      if (!mounted.current) return;
      setProfile({status: 'ready', data: data.profile});
      setPets(data.pets ? {status: 'ready', data: data.pets} : {status: 'blocked'});
    } catch (error) {
      if (!mounted.current) return;
      const message = error instanceof Error ? error.message : 'unknown';
      setProfile({status: 'error', message});
      setPets({status: 'error', message});
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void reload();
    return () => {
      mounted.current = false;
    };
  }, [reload]);

  const persist = useCallback(
    async (next: Pet[]): Promise<SaveOutcome> => {
      if (pets.status === 'blocked') return {status: 'failed', reason: 'blocked'};
      if (profile.status !== 'ready' || pets.status !== 'ready') return {status: 'failed', reason: 'not-ready'};
      if (savingRef.current) return {status: 'failed', reason: 'not-ready'};
      savingRef.current = true;
      setSaving(true);
      try {
        const digest = await savePets(profile.data.id, next, pets.data.compareDigest);
        if (mounted.current) {
          setPets({status: 'ready', data: {pets: next, compareDigest: digest, discarded: 0}});
        }
        return {status: 'saved'};
      } catch (error) {
        if (error instanceof PetsConflictError) {
          await reload();
          return {status: 'failed', reason: 'conflict'};
        }
        return {status: 'failed', reason: 'error'};
      } finally {
        savingRef.current = false;
        if (mounted.current) setSaving(false);
      }
    },
    [pets, profile, reload],
  );

  return {profile, pets, saving, reload, persist};
}
