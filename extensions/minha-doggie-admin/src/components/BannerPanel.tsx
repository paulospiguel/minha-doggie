import {BANNER_LIMITS, EMPTY_BANNER, type BannerConfig} from '@minha-doggie/core';
import {useEffect, useState} from 'preact/hooks';
import {ADMIN_COPY} from '../copy';
import {fetchBanner, fetchLibraryImages, saveBanner, type LibraryImage} from '../graphql/banner';
import {readValue} from '../lib/events';

const copy = ADMIN_COPY.banner;

function readChecked(event: Event): boolean {
  const target = event.currentTarget as {checked?: unknown} | null;
  return Boolean(target?.checked);
}

/** Secção no painel da app para escolher o banner a partir de Conteúdo › Ficheiros e guardá-lo na loja. */
export function BannerPanel() {
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BannerConfig>(EMPTY_BANNER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    fetchBanner()
      .then((state) => {
        if (!active) return;
        setShopId(state.shopId);
        setDraft(state.config);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(copy.loadError);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function loadLibrary(query = search) {
    setError(null);
    setLibraryLoading(true);
    try {
      const items = await fetchLibraryImages(query);
      setLibraryImages(items);
    } catch {
      setError(copy.libraryError);
    } finally {
      setLibraryLoading(false);
    }
  }

  function toggleLibrary() {
    if (libraryOpen) {
      setLibraryOpen(false);
      return;
    }
    setLibraryOpen(true);
    void loadLibrary(search);
  }

  function handleSelectImage(item: LibraryImage) {
    setDraft((prev) => ({
      imageUrl: item.url,
      enabled: true,
      alt: prev.alt || item.alt,
    }));
    setLibraryOpen(false);
    setError(null);
    setNotice(copy.selectedNotice);
  }

  async function handleSave() {
    if (!shopId || saving) return;
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await saveBanner(shopId, draft);
      setNotice(copy.saved);
    } catch {
      setError(copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <s-section heading={copy.heading}>
      <s-stack direction="block" gap="base">
        <s-paragraph>{copy.intro}</s-paragraph>

        {loading ? <s-text color="subdued">{copy.loading}</s-text> : null}
        {error ? <s-banner tone="critical">{error}</s-banner> : null}
        {notice ? <s-banner tone="success">{notice}</s-banner> : null}

        {!loading && shopId ? (
          <s-stack direction="block" gap="base">
            <s-box background="subdued" border="base" borderRadius="base" padding="small">
              <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="center">
                <s-checkbox
                  label={copy.enabledLabel}
                  checked={draft.enabled && Boolean(draft.imageUrl)}
                  disabled={!draft.imageUrl || saving}
                  onChange={(event: Event) => {
                    setNotice(null);
                    setDraft((prev) => ({...prev, enabled: readChecked(event)}));
                  }}
                />
                {draft.enabled && draft.imageUrl ? (
                  <s-badge tone="success">{copy.visibleBadge}</s-badge>
                ) : (
                  <s-badge tone="neutral">{copy.hiddenBadge}</s-badge>
                )}
              </s-grid>
            </s-box>

            {draft.imageUrl ? (
              <s-stack direction="block" gap="small">
                <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
                  <s-text color="subdued" type="strong">
                    {copy.currentImage}
                  </s-text>
                  <s-button
                    variant="tertiary"
                    tone="critical"
                    disabled={saving}
                    onClick={() => {
                      setNotice(null);
                      setDraft((prev) => ({...prev, imageUrl: null, enabled: false}));
                    }}
                  >
                    {copy.removeImage}
                  </s-button>
                </s-grid>
                <s-box border="base" borderRadius="base" padding="base">
                  <s-image
                    src={draft.imageUrl}
                    alt={draft.alt || copy.altPlaceholder}
                    aspectRatio="2/1"
                    objectFit="cover"
                    borderRadius="base"
                  />
                </s-box>
              </s-stack>
            ) : (
              <s-text color="subdued">{copy.noImage}</s-text>
            )}

            <s-stack direction="inline" gap="small">
              <s-button variant="secondary" disabled={saving} onClick={toggleLibrary}>
                {libraryOpen ? copy.closeLibrary : copy.chooseFromLibrary}
              </s-button>
              <s-button variant="secondary" href="shopify:admin/content/files">
                {copy.openFilesAdmin}
              </s-button>
            </s-stack>

            {libraryOpen ? (
              <s-box border="base" borderRadius="base" padding="base">
                <s-stack direction="block" gap="base">
                  <s-grid gridTemplateColumns="1fr auto" gap="small" alignItems="end">
                    <s-text-field
                      label={copy.searchLabel}
                      value={search}
                      placeholder={copy.searchPlaceholder}
                      disabled={libraryLoading}
                      onInput={(event: Event) => setSearch(readValue(event))}
                    />
                    <s-button
                      variant="secondary"
                      loading={libraryLoading}
                      disabled={libraryLoading}
                      onClick={() => {
                        void loadLibrary(search);
                      }}
                    >
                      {copy.refreshLibrary}
                    </s-button>
                  </s-grid>

                  {libraryLoading ? <s-text color="subdued">{copy.loadingLibrary}</s-text> : null}

                  {!libraryLoading && libraryImages.length === 0 ? (
                    <s-text color="subdued">{copy.emptyLibrary}</s-text>
                  ) : null}

                  {!libraryLoading && libraryImages.length > 0 ? (
                    <s-grid gridTemplateColumns="repeat(2, 1fr)" gap="base">
                      {libraryImages.map((item) => {
                        const isSelected = draft.imageUrl === item.url;
                        const dims = item.width && item.height ? `${item.width}×${item.height}` : null;
                        return (
                          <s-box key={item.id} border="base" borderRadius="base" padding="small">
                            <s-stack direction="block" gap="small">
                              <s-image
                                src={item.url}
                                alt={item.alt || item.filename}
                                aspectRatio="2/1"
                                objectFit="cover"
                                borderRadius="base"
                              />
                              <s-stack direction="inline" gap="small" alignItems="center">
                                <s-text type="strong">{item.filename}</s-text>
                                {dims ? <s-badge tone="neutral">{dims}</s-badge> : null}
                                {isSelected ? <s-badge tone="success">{copy.selectedBadge}</s-badge> : null}
                              </s-stack>
                              <s-button
                                variant={isSelected ? 'secondary' : 'primary'}
                                onClick={() => handleSelectImage(item)}
                              >
                                {copy.selectImage}
                              </s-button>
                            </s-stack>
                          </s-box>
                        );
                      })}
                    </s-grid>
                  ) : null}
                </s-stack>
              </s-box>
            ) : null}

            <s-text-field
              label={copy.altLabel}
              value={draft.alt}
              placeholder={copy.altPlaceholder}
              maxLength={BANNER_LIMITS.altMaxLength}
              disabled={saving}
              onInput={(event: Event) => {
                setNotice(null);
                setDraft((prev) => ({...prev, alt: readValue(event)}));
              }}
            />

            <s-stack direction="inline" gap="small">
              <s-button
                variant="primary"
                loading={saving}
                disabled={saving}
                onClick={() => {
                  void handleSave();
                }}
              >
                {saving ? copy.saving : copy.save}
              </s-button>
            </s-stack>
          </s-stack>
        ) : null}
      </s-stack>
    </s-section>
  );
}
