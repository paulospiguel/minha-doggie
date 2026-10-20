import {buildSegmentQueries, type CsvDelimiter} from '@minha-doggie/core';
import {useRef, useState} from 'preact/hooks';
import {ADMIN_COPY} from '../copy';
import {exportFromAllCustomers, exportFromIds, exportFromSegment, resolvePetNamespace, type ExportResult} from '../graphql/api';
import {errorMessage, readValue} from '../lib/events';
import {buildExportFile, LARGE_EXPORT_BYTES, MAX_INLINE_TEXT_ROWS, type ExportFile} from '../lib/exportFile';

type Source = 'all' | 'segment';
type State =
  | {status: 'idle'}
  | {status: 'running'; scanned: number}
  | {status: 'done'; file: ExportFile; result: ExportResult}
  | {status: 'error'; message: string};

const copy = ADMIN_COPY.exporter;

/** Exportação CSV. Com `selectedIds`, exporta só esses clientes (ação de seleção). */
export function ExportPanel({selectedIds}: {selectedIds?: readonly string[]}) {
  const [source, setSource] = useState<Source>('all');
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(';');
  const [state, setState] = useState<State>({status: 'idle'});
  const [showText, setShowText] = useState(false);
  const cancelled = useRef(false);

  async function run() {
    cancelled.current = false;
    setShowText(false);
    setState({status: 'running', scanned: 0});
    const options = {
      onProgress: ({done}: {done: number}) => setState({status: 'running', scanned: done}),
      isCancelled: () => cancelled.current,
    };
    try {
      let result: ExportResult;
      if (selectedIds) {
        result = await exportFromIds(selectedIds, options);
      } else if (source === 'segment') {
        const info = await resolvePetNamespace();
        if (!info.namespace) throw new Error(copy.segmentUnavailable);
        const query = buildSegmentQueries(info.namespace).find((segment) => segment.id === 'com_companheiros')!.query;
        result = await exportFromSegment(query, options);
      } else {
        result = await exportFromAllCustomers(options);
      }
      setState({status: 'done', result, file: buildExportFile(result.records, delimiter)});
    } catch (error) {
      setState({status: 'error', message: copy.error(errorMessage(error))});
    }
  }

  const running = state.status === 'running';

  return (
    <s-section heading={selectedIds ? copy.headingSelection : copy.heading}>
      <s-stack direction="block" gap="base">
        <s-paragraph>{copy.intro}</s-paragraph>
        {selectedIds ? <s-text type="strong">{copy.selectionCount(selectedIds.length)}</s-text> : null}
        {!selectedIds ? (
          <s-select label={copy.source} value={source} disabled={running} onChange={(event: Event) => setSource(readValue(event) === 'segment' ? 'segment' : 'all')}>
            <s-option value="all">{copy.sourceAll}</s-option>
            <s-option value="segment">{copy.sourceSegment}</s-option>
          </s-select>
        ) : null}
        <s-select label={copy.delimiter} value={delimiter} disabled={running} onChange={(event: Event) => setDelimiter(readValue(event) === ',' ? ',' : ';')}>
          <s-option value=";">{copy.delimiterSemicolon}</s-option>
          <s-option value=",">{copy.delimiterComma}</s-option>
        </s-select>
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-button variant="primary" loading={running} onClick={() => void run()}>
            {copy.generate}
          </s-button>
          {running ? (
            <s-button variant="secondary" onClick={() => (cancelled.current = true)}>
              {copy.cancel}
            </s-button>
          ) : null}
          {running ? <s-text color="subdued">{copy.progress(state.scanned)}</s-text> : null}
        </s-stack>
        {state.status === 'error' ? <s-banner tone="critical">{state.message}</s-banner> : null}
        {state.status === 'done' ? <ExportResultView state={state} showText={showText} onToggleText={() => setShowText((v) => !v)} /> : null}
      </s-stack>
    </s-section>
  );
}

function ExportResultView({
  state,
  showText,
  onToggleText,
}: {
  state: {file: ExportFile; result: ExportResult};
  showText: boolean;
  onToggleText: () => void;
}) {
  const {file, result} = state;
  if (file.rows === 0) {
    return <s-banner tone="info">{copy.readyEmpty}</s-banner>;
  }
  return (
    <s-stack direction="block" gap="small">
      <s-banner tone={result.truncated ? 'warning' : 'success'}>
        <s-stack direction="block" gap="small">
          <s-text>{copy.ready(file.rows, file.customers)}</s-text>
          {result.truncated ? <s-text>{copy.truncated}</s-text> : null}
          {result.unreadable > 0 ? <s-text>{copy.unreadable(result.unreadable)}</s-text> : null}
          {file.bytes > LARGE_EXPORT_BYTES ? <s-text>{copy.large}</s-text> : null}
        </s-stack>
      </s-banner>
      <s-stack direction="inline" gap="small">
        <s-button variant="primary" icon="export" href={file.dataUrl} download={file.fileName}>
          {copy.download}
        </s-button>
        {file.rows <= MAX_INLINE_TEXT_ROWS ? (
          <s-button variant="tertiary" onClick={onToggleText}>
            {showText ? copy.hideText : copy.showText}
          </s-button>
        ) : null}
      </s-stack>
      {showText ? <s-text-area label={copy.textLabel} value={file.csv} readOnly rows={8} /> : null}
    </s-stack>
  );
}
