import {useRef, useState} from 'preact/hooks';
import {ADMIN_COPY} from '../copy';
import {reindexAllCustomers, type ReindexSummary} from '../graphql/api';
import {errorMessage} from '../lib/events';

type State =
  | {status: 'idle'}
  | {status: 'running'; label: string}
  | {status: 'done'; summary: ReindexSummary}
  | {status: 'error'; message: string};

const copy = ADMIN_COPY.reindex;

export function ReindexPanel() {
  const [state, setState] = useState<State>({status: 'idle'});
  const cancelled = useRef(false);

  async function run() {
    cancelled.current = false;
    setState({status: 'running', label: copy.scanning(0)});
    try {
      const summary = await reindexAllCustomers({
        isCancelled: () => cancelled.current,
        onProgress: ({phase, done, total}) =>
          setState({status: 'running', label: phase === 'scan' ? copy.scanning(done) : copy.writing(done, total ?? done)}),
      });
      setState({status: 'done', summary});
    } catch (error) {
      setState({status: 'error', message: copy.error(errorMessage(error))});
    }
  }

  const running = state.status === 'running';
  return (
    <s-section heading={copy.heading}>
      <s-stack direction="block" gap="base">
        <s-paragraph>{copy.intro}</s-paragraph>
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-button variant="secondary" loading={running} onClick={() => void run()}>
            {copy.run}
          </s-button>
          {running ? (
            <s-button variant="tertiary" onClick={() => (cancelled.current = true)}>
              {copy.cancel}
            </s-button>
          ) : null}
          {running ? <s-text color="subdued">{state.label}</s-text> : null}
        </s-stack>
        {state.status === 'done' ? (
          <s-banner tone={state.summary.truncated || state.summary.failed > 0 || state.summary.conflicts > 0 ? 'warning' : 'success'}>
            <s-stack direction="block" gap="small">
              <s-text>{copy.summary(state.summary)}</s-text>
              {state.summary.truncated ? <s-text>{copy.truncated}</s-text> : null}
            </s-stack>
          </s-banner>
        ) : null}
        {state.status === 'error' ? <s-banner tone="critical">{state.message}</s-banner> : null}
      </s-stack>
    </s-section>
  );
}
