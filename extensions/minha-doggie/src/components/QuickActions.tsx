import {MODAL_IDS, ROUTES} from '../constants';
import {COPY} from '../copy';
import type {IconName} from '../types';
import {SectionHeader} from './SectionHeader';

interface QuickActionsProps {
  canAddPet: boolean;
  onAddPet: () => void;
}

type TileTarget = {href: string} | {commandFor: string; onClick: () => void; disabled: boolean};

interface TileProps {
  icon: IconName;
  title: string;
  body: string;
  target: TileTarget;
}

function TileContent({icon, title, body}: Omit<TileProps, 'target'>) {
  return (
    <s-stack direction="block" gap="small">
      <s-grid gridTemplateColumns="minmax(0, 1fr) auto" alignItems="center">
        <s-icon type={icon} />
        <s-icon type="chevron-right" size="small" />
      </s-grid>
      <s-text type="strong">{title}</s-text>
      <s-text color="subdued" type="small">
        {body}
      </s-text>
    </s-stack>
  );
}

function Tile({icon, title, body, target}: TileProps) {
  const label = `${title}. ${body}`;
  if ('href' in target) {
    return (
      <s-clickable href={target.href} border="base" borderRadius="large" padding="base" blockSize="100%" accessibilityLabel={label}>
        <TileContent icon={icon} title={title} body={body} />
      </s-clickable>
    );
  }
  return (
    <s-clickable
      command="--show"
      commandFor={target.commandFor}
      onClick={target.onClick}
      disabled={target.disabled}
      border="base"
      borderRadius="large"
      padding="base"
      blockSize="100%"
      accessibilityLabel={label}
    >
      <TileContent icon={icon} title={title} body={body} />
    </s-clickable>
  );
}

export function QuickActions({canAddPet, onAddPet}: QuickActionsProps) {
  return (
    <s-section accessibilityLabel={COPY.quickActions.heading}>
      <s-stack direction="block" gap="base">
        <SectionHeader icon="grid" title={COPY.quickActions.heading} />
        <s-query-container>
          <s-grid
            gridTemplateColumns="@container (inline-size > 400px) repeat(3, minmax(0, 1fr)), minmax(0, 1fr)"
            gap="small"
          >
            <Tile icon="reorder" title={COPY.quickActions.orders.title} body={COPY.quickActions.orders.body} target={{href: ROUTES.orders}} />
            <Tile icon="location" title={COPY.quickActions.profile.title} body={COPY.quickActions.profile.body} target={{href: ROUTES.profile}} />
            <Tile
              icon="plus"
              title={COPY.quickActions.addPet.title}
              body={COPY.quickActions.addPet.body}
              target={{commandFor: MODAL_IDS.petForm, onClick: onAddPet, disabled: !canAddPet}}
            />
          </s-grid>
        </s-query-container>
      </s-stack>
    </s-section>
  );
}
