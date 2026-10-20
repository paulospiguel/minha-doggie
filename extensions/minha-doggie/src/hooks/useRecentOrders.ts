import {useEffect, useState} from 'preact/hooks';
import {LIMITS} from '../constants';
import {fetchRecentOrders} from '../graphql/api';
import {toRecentOrderSummaries} from '../lib/orders';
import type {LoadState, OrderSummary} from '../types';

export function useRecentOrders(): LoadState<OrderSummary[]> {
  const [state, setState] = useState<LoadState<OrderSummary[]>>({status: 'loading'});

  useEffect(() => {
    let active = true;
    fetchRecentOrders()
      .then((nodes) => {
        if (active) setState({status: 'ready', data: toRecentOrderSummaries(nodes, LIMITS.recentOrders)});
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
