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
  const columns = heroImageUrl ? '@container (inline-size > 640px) minmax(0, 1fr) minmax(0, 1.2fr), minmax(0, 1fr)' : 'minmax(0, 1fr)';
  return (
    <s-section padding="none" accessibilityLabel={COPY.welcome.label}>
      <s-query-container>
        <s-grid gridTemplateColumns={columns} alignItems="center" overflow="hidden">
          <s-box padding="large-200">
            <s-stack direction="block" gap="large">
              <s-stack direction="block" gap="small-100">
                <s-paragraph>{COPY.welcome.intro}</s-paragraph>
                <s-text color="subdued" type="small">
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
          </s-box>
          {heroImageUrl ? (
            <s-image
              src={heroImageUrl}
              alt={heroImageAlt}
              aspectRatio="2/1"
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
