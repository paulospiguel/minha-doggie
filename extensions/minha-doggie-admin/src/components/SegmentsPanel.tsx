import {buildSegmentQueries, type SegmentDefinition} from '@minha-doggie/core';
import {useEffect, useState} from 'preact/hooks';
import {ADMIN_COPY} from '../copy';
import {countSegment, createSegment, resolvePetNamespace, type NamespaceInfo} from '../graphql/api';
import {errorMessage} from '../lib/events';

type Load = {status: 'loading'} | {status: 'error'; message: string} | {status: 'ready'; info: NamespaceInfo};
type RowState = {busy?: boolean; count?: number; created?: boolean; error?: string};

const copy = ADMIN_COPY.segments;

export function SegmentsPanel() {
  const [load, setLoad] = useState<Load>({status: 'loading'});
  const [rows, setRows] = useState<Record<string, RowState>>({});

  useEffect(() => {
    let active = true;
    resolvePetNamespace()
      .then((info) => active && setLoad({status: 'ready', info}))
      .catch((error) => active && setLoad({status: 'error', message: copy.error(errorMessage(error))}));
    return () => {
      active = false;
    };
  }, []);

  function patch(id: string, value: RowState) {
    setRows((current) => ({...current, [id]: {...current[id], ...value}}));
  }

  async function verify(segment: SegmentDefinition) {
    patch(segment.id, {busy: true, error: undefined});
    try {
      patch(segment.id, {busy: false, count: await countSegment(segment.query)});
    } catch (error) {
      patch(segment.id, {busy: false, error: copy.error(errorMessage(error))});
    }
  }

  async function create(segment: SegmentDefinition) {
    patch(segment.id, {busy: true, error: undefined});
    try {
      await createSegment(segment.name, segment.query);
      patch(segment.id, {busy: false, created: true});
    } catch (error) {
      patch(segment.id, {busy: false, error: copy.error(errorMessage(error))});
    }
  }

  let content;
  if (load.status === 'loading') {
    content = (
      <s-stack direction="inline" gap="small" alignItems="center">
        <s-spinner accessibilityLabel={copy.loading} />
        <s-text color="subdued">{copy.loading}</s-text>
      </s-stack>
    );
  } else if (load.status === 'error') {
    content = <s-banner tone="critical">{load.message}</s-banner>;
  } else if (!load.info.namespace) {
    content = <s-banner tone="warning">{copy.missing}</s-banner>;
  } else {
    const segments = buildSegmentQueries(load.info.namespace);
    content = (
      <s-stack direction="block" gap="base">
        {load.info.suggestedQueryName ? <s-text color="subdued">{copy.suggestion(load.info.suggestedQueryName)}</s-text> : null}
        {segments.map((segment) => {
          const row = rows[segment.id] ?? {};
          return (
            <s-stack key={segment.id} direction="block" gap="small">
              <s-divider />
              <s-text type="strong">{segment.name}</s-text>
              <s-text-area label={segment.name} labelAccessibilityVisibility="exclusive" value={segment.query} readOnly rows={2} />
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-button variant="secondary" loading={row.busy} onClick={() => void verify(segment)}>
                  {copy.verify}
                </s-button>
                <s-button variant="secondary" disabled={row.busy || row.created} onClick={() => void create(segment)}>
                  {copy.create}
                </s-button>
                {row.count !== undefined ? <s-badge>{copy.count(row.count)}</s-badge> : null}
                {row.created ? <s-badge tone="success">{copy.created}</s-badge> : null}
              </s-stack>
              {row.error ? <s-banner tone="critical">{row.error}</s-banner> : null}
            </s-stack>
          );
        })}
      </s-stack>
    );
  }

  return (
    <s-section heading={copy.heading}>
      <s-stack direction="block" gap="base">
        <s-paragraph>{copy.intro}</s-paragraph>
        {content}
      </s-stack>
    </s-section>
  );
}
