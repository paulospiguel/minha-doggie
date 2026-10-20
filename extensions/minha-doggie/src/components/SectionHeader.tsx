import type {IconName} from '../types';

type HeaderAction =
  | {label: string; accessibilityLabel?: string; href: string}
  | {label: string; accessibilityLabel?: string; commandFor: string; onClick: () => void; disabled?: boolean};

interface SectionHeaderProps {
  icon: IconName;
  title: string;
  action?: HeaderAction | null;
}

/**
 * Cabeçalho de secção ao estilo do mockup: ícone + título à esquerda e uma
 * ligação de texto à direita. O slot `secondary-actions` de s-section só
 * aceita botões, por isso o cabeçalho é composto com s-grid.
 */
export function SectionHeader({icon, title, action}: SectionHeaderProps) {
  return (
    <s-grid gridTemplateColumns="minmax(0, 1fr) auto" gap="base" alignItems="center">
      <s-stack direction="inline" gap="small-100" alignItems="center">
        <s-icon type={icon} />
        <s-heading>{title}</s-heading>
      </s-stack>
      {action ? <HeaderLink action={action} /> : null}
    </s-grid>
  );
}

function HeaderLink({action}: {action: HeaderAction}) {
  if ('href' in action) {
    return (
      <s-link href={action.href} accessibilityLabel={action.accessibilityLabel}>
        {action.label}
      </s-link>
    );
  }
  // s-link não tem estado "disabled": quando a ação não está disponível, não se mostra.
  if (action.disabled) return null;
  return (
    <s-link
      command="--show"
      commandFor={action.commandFor}
      accessibilityLabel={action.accessibilityLabel}
      onClick={action.onClick}
    >
      {action.label}
    </s-link>
  );
}
