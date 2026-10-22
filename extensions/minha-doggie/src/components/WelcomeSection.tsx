import {ROUTES} from '../constants';
import {COPY} from '../copy';

interface WelcomeSectionProps {
  storeUrl: string;
  heroImageUrl: string | null;
  heroImageAlt: string;
}

/**
 * Hero: a saudação "Olá, {nome}!" é o título da própria s-page (o maior
 * título que a plataforma permite). Aqui fica o bloco de destaque com fundo
 * `subdued`, texto, ações e a imagem configurada a ocupar a coluna direita
 * (proporção 2:1, `cover`; recomendado ≥ 1600×800 px, carregada em
 * Conteúdo → Ficheiros — as extensões não podem incluir imagens no bundle).
 */
export function WelcomeSection({storeUrl, heroImageUrl, heroImageAlt}: WelcomeSectionProps) {
  const columns = heroImageUrl
    ? '@container (inline-size > 640px) minmax(0, 1.15fr) minmax(0, 1fr), minmax(0, 1fr)'
    : 'minmax(0, 1fr)';
  return (
    <s-section accessibilityLabel={COPY.welcome.label}>
      <s-query-container>
        <s-grid gridTemplateColumns={columns} gap="large" alignItems="center">
          <s-stack direction="block" gap="base">
            <s-stack direction="inline">
              <s-badge size="small" color="subdued">
                {COPY.welcome.badge}
              </s-badge>
            </s-stack>
            <s-stack direction="block" gap="small-100">
              <s-heading>{COPY.welcome.intro}</s-heading>
              <s-text tone="critical" type="strong">
                {COPY.page.slogan}
              </s-text>
            </s-stack>
            <s-stack direction="inline" gap="base">
              <s-button variant="primary" href={ROUTES.profile}>
                {COPY.welcome.manageProfile}
              </s-button>
              <s-button variant="secondary" href={storeUrl}>
                {COPY.welcome.shopAgain}
              </s-button>
            </s-stack>
          </s-stack>
          {heroImageUrl ? (
            <s-image
              src={heroImageUrl}
              alt={heroImageAlt}
              aspectRatio="16/10"
              borderRadius="large"
              objectFit="cover"
              inlineSize="fill"
              loading="eager"
            />
          ) : null}
        </s-grid>
      </s-query-container>
    </s-section>
  );
}
