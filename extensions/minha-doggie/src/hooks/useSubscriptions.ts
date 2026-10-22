import {useEffect, useState} from 'preact/hooks';
import {fetchSubscriptions, type SubscriptionNode} from '../graphql/api';
import type {LoadState} from '../types';

export function useSubscriptions(): LoadState<SubscriptionNode[]> {
  const [state, setState] = useState<LoadState<SubscriptionNode[]>>({status: 'loading'});

  useEffect(() => {
    let active = true;
    fetchSubscriptions()
      .then((nodes) => {
        if (active) setState({status: 'ready', data: nodes.filter((node) => node && typeof node.id === 'string')});
      })
      .catch((error: unknown) => {
        if (active) setState({status: 'error', message: error instanceof Error ? error.message : 'unknown'});
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
