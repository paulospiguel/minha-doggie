import {BANNER_LIMITS, EMPTY_BANNER, type BannerConfig} from '@minha-doggie/core';
import {useEffect, useState} from 'preact/hooks';
import {ADMIN_COPY} from '../copy';
import {fetchBanner, saveBanner, uploadBannerImage, validateBannerFile} from '../graphql/banner';
import {readValue} from '../lib/events';

const copy = ADMIN_COPY.banner;

function readChecked(event: Event): boolean {
  const target = event.currentTarget as {checked?: unknown} | null;
  return Boolean(target?.checked);
}

function readFirstFile(event: Event): File | null {
  const target = event.currentTarget as {files?: File[] | FileList | null} | null;
  const files = target?.files;
  if (!files || files.length === 0) return null;
  return files[0] ?? null;
}

/** Secção no painel da app para gerir o banner principal da página Minha DOGGIE. */
export function BannerPanel() {
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BannerConfig>(EMPTY_BANNER);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  async function handleFileSelect(event: Event) {
    const file = readFirstFile(event);
    if (!file) return;
    setError(null);
    setNotice(null);
    const issue = validateBannerFile(file);
    if (issue === 'type') {
      setError(copy.fileTypeError);
      return;
    }
    if (issue === 'size') {
      setError(copy.fileSizeError);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadBannerImage(file);
      setDraft((prev) => ({...prev, imageUrl: url, enabled: true}));
      setNotice(copy.uploaded);
    } catch {
      setError(copy.uploadError);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!shopId || saving || uploading) return;
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
            <s-switch
              label={copy.enabledLabel}
              checked={draft.enabled && Boolean(draft.imageUrl)}
              disabled={!draft.imageUrl || uploading || saving}
              onChange={(event: Event) => {
                setNotice(null);
                setDraft((prev) => ({...prev, enabled: readChecked(event)}));
              }}
            />

            <s-drop-zone
              label={copy.dropZoneLabel}
              accessibilityLabel={copy.dropZoneLabel}
              accept="image/jpeg,image/png,image/webp"
              multiple={false}
              disabled={uploading || saving}
              onChange={(event: Event) => {
                void handleFileSelect(event);
              }}
            />

            {uploading ? <s-text color="subdued">{copy.uploading}</s-text> : null}

            {draft.imageUrl ? (
              <s-box border="base" borderRadius="base" padding="base">
                <s-stack direction="block" gap="small">
                  <s-stack direction="inline" gap="base" alignItems="center">
                    <s-text type="strong">{copy.currentImage}</s-text>
                    <s-button
                      variant="tertiary"
                      tone="critical"
                      disabled={uploading || saving}
                      onClick={() => {
                        setNotice(null);
                        setDraft((prev) => ({...prev, imageUrl: null, enabled: false}));
                      }}
                    >
                      {copy.removeImage}
                    </s-button>
                  </s-stack>
                  <s-image
                    src={draft.imageUrl}
                    alt={draft.alt || copy.altPlaceholder}
                    aspectRatio="2/1"
                    objectFit="cover"
                    borderRadius="base"
                  />
                </s-stack>
              </s-box>
            ) : (
              <s-text color="subdued">{copy.noImage}</s-text>
            )}

            <s-text-field
              label={copy.altLabel}
              value={draft.alt}
              placeholder={copy.altPlaceholder}
              maxLength={BANNER_LIMITS.altMaxLength}
              disabled={uploading || saving}
              onInput={(event: Event) => {
                setNotice(null);
                setDraft((prev) => ({...prev, alt: readValue(event)}));
              }}
            />

            <s-stack direction="inline" gap="small">
              <s-button
                variant="primary"
                loading={saving}
                disabled={uploading || saving}
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
