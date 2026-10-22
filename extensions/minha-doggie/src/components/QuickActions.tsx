import {MODAL_IDS, ROUTES} from '../constants';
import {COPY} from '../copy';
import type {IconName} from '../types';

interface QuickActionsProps {
  canAddPet: boolean;
  onAddPet: () => void;
  storeUrl: string;
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
    <s-stack direction="block" gap="large">
      <s-grid gridTemplateColumns="minmax(0, 1fr) auto" alignItems="start">
        <s-stack direction="inline">
          <s-box background="subdued" borderRadius="large" padding="small">
            <s-icon type={icon} />
          </s-box>
        </s-stack>
        <s-icon type="chevron-right" size="small" />
      </s-grid>
      <s-stack direction="block" gap="small-300">
        <s-text type="strong">{title}</s-text>
        <s-text color="subdued" type="small">
          {body}
        </s-text>
      </s-stack>
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

export function QuickActions({canAddPet, onAddPet, storeUrl}: QuickActionsProps) {
  return (
    <s-section accessibilityLabel={COPY.quickActions.heading}>
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-box background="subdued" borderRadius="base" padding="small-100">
            <s-icon type="grid" />
          </s-box>
          <s-stack direction="block" gap="none">
            <s-heading>{COPY.quickActions.heading}</s-heading>
            <s-text color="subdued" type="small">
              {COPY.quickActions.subheading}
            </s-text>
          </s-stack>
        </s-stack>
        <s-query-container>
          <s-grid gridTemplateColumns="repeat(2, minmax(0, 1fr))" gap="base">
            <Tile icon="reorder" title={COPY.quickActions.orders.title} body={COPY.quickActions.orders.body} target={{href: ROUTES.orders}} />
            <Tile icon="location" title={COPY.quickActions.profile.title} body={COPY.quickActions.profile.body} target={{href: ROUTES.profile}} />
            <Tile
              icon="plus"
              title={COPY.quickActions.addPet.title}
              body={COPY.quickActions.addPet.body}
              target={{commandFor: MODAL_IDS.petForm, onClick: onAddPet, disabled: !canAddPet}}
            />
            <Tile icon="profile" title={COPY.quickActions.account.title} body={COPY.quickActions.account.body} target={{href: ROUTES.profile}} />
          </s-grid>
        </s-query-container>
        <s-box background="subdued" borderRadius="large" paddingBlock="small" paddingInline="base">
          <s-grid gridTemplateColumns="minmax(0, 1fr) auto" gap="base" alignItems="center">
            <s-stack direction="inline" gap="small-200" alignItems="center">
              <s-icon type="bullet" tone="success" size="small" />
              <s-text color="subdued" type="small">
                {COPY.quickActions.support.label}
              </s-text>
            </s-stack>
            <s-link href={storeUrl}>{COPY.quickActions.support.action}</s-link>
          </s-grid>
        </s-box>
      </s-stack>
    </s-section>
  );
}
