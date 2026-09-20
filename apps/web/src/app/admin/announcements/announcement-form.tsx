'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InlineAlert } from '@/components/ui/inline-alert';
import { useHydrated } from '@/lib/use-hydrated';
import { AnnouncementRow } from '@/components/announcement-banner';
import type { AnnouncementAdminDto } from '@/server/announcements';
import { cn } from '@/lib/cn';

/**
 * Duyuru yöneticisi (Kârmatik admin.banner deseni): form (yeni/düzenle + canlı önizleme) ve liste
 * (yayında anahtarı, düzenle, sil — ConfirmDialog). Mutasyonlar /api/admin/announcements → router.refresh().
 */
const TONES = [
  { key: 'INFO', label: 'Bilgi' },
  { key: 'PROMO', label: 'Kampanya' },
  { key: 'WARN', label: 'Uyarı' },
] as const;
const PLACEMENTS = [
  { key: 'LANDING', label: 'Ana sayfa' },
  { key: 'PRICING', label: 'Fiyatlandırma' },
  { key: 'TOOLS', label: 'Araç sayfaları' },
  { key: 'APP', label: 'Panel' },
] as const;

type Tone = (typeof TONES)[number]['key'];
type Placement = (typeof PLACEMENTS)[number]['key'];

type FormState = {
  text: string;
  tone: Tone;
  placement: Placement;
  href: string;
  ctaLabel: string;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
};

const EMPTY: FormState = {
  text: '',
  tone: 'INFO',
  placement: 'LANDING',
  href: '',
  ctaLabel: '',
  enabled: true,
  startsAt: '',
  endsAt: '',
};

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // datetime-local: TSİ (UTC+3) — sunucuya ISO olarak geri çevrilir
  const t = new Date(d.getTime() + 3 * 3_600_000);
  return t.toISOString().slice(0, 16);
}
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(`${v}:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function AnnouncementsManager({ items }: { items: AnnouncementAdminDto[] }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const ids = {
    text: useId(),
    tone: useId(),
    placement: useId(),
    href: useId(),
    cta: useId(),
    enabled: useId(),
    starts: useId(),
    ends: useId(),
  };
  const [editing, setEditing] = useState<string | null>(null); // null = kapalı, 'new' = yeni, id = düzenle
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<AnnouncementAdminDto | null>(null);

  function startNew() {
    setEditing('new');
    setForm(EMPTY);
    setError(null);
    setOk(null);
  }
  function startEdit(a: AnnouncementAdminDto) {
    setEditing(a.id);
    setForm({
      text: a.text,
      tone: a.tone,
      placement: a.placement,
      href: a.href ?? '',
      ctaLabel: a.ctaLabel ?? '',
      enabled: a.enabled,
      startsAt: toLocalInput(a.startsAt),
      endsAt: toLocalInput(a.endsAt),
    });
    setError(null);
    setOk(null);
  }

  async function run(key: string, fn: () => Promise<unknown>, success?: string) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      if (success) setOk(success);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const payload = () => ({
    text: form.text.trim(),
    tone: form.tone,
    placement: form.placement,
    href: form.href.trim() || null,
    ctaLabel: form.ctaLabel.trim() || null,
    enabled: form.enabled,
    startsAt: fromLocalInput(form.startsAt),
    endsAt: fromLocalInput(form.endsAt),
  });

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.text.trim()) return;
    const isNew = editing === 'new';
    run(
      'save',
      async () => {
        if (isNew) await apiFetch('/api/admin/announcements', { method: 'POST', json: payload() });
        else await apiFetch(`/api/admin/announcements/${editing}`, { method: 'PATCH', json: payload() });
        setEditing(null);
        setForm(EMPTY);
      },
      isNew ? 'Duyuru oluşturuldu.' : 'Duyuru güncellendi.',
    );
  }

  const preview = {
    id: 'preview',
    tone: form.tone,
    placement: form.placement,
    text: form.text.trim() || 'Duyuru metni burada görünür',
    href: form.href.trim() || null,
    ctaLabel: form.ctaLabel.trim() || null,
    updatedAt: '',
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[13px] text-ink-muted">
          Aynı yerleşimde en çok 3 duyuru üst üste gösterilir (en yeni üstte). Her düzenleme (aç/kapa dahil) şeridi
          kapatanlara yeniden gösterir.
        </p>
        {!editing && (
          <button
            type="button"
            onClick={startNew}
            disabled={!hydrated}
            className="btn-primary !py-2 !px-4 text-[13px] inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Yeni duyuru
          </button>
        )}
      </div>

      {ok && (
        <InlineAlert tone="success" className="mt-4">
          {ok}
        </InlineAlert>
      )}

      {editing && (
        <form onSubmit={save} className="card p-5 mt-4 border-brand/30" aria-labelledby="ann-form-title">
          <div className="flex items-center justify-between">
            <h2 id="ann-form-title" className="font-display text-[17px]">
              {editing === 'new' ? 'Yeni duyuru' : 'Duyuruyu düzenle'}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              aria-label="Formu kapat"
              className="p-2 -m-2 rounded-md text-ink-faint hover:text-ink"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4">
            <label
              htmlFor={ids.text}
              className="text-[11px] uppercase tracking-wider text-ink-faint font-medium block mb-1"
            >
              Metin{' '}
              <span className="text-danger" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id={ids.text}
              className="input"
              value={form.text}
              maxLength={300}
              required
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              placeholder="Örn. Yeni: 11 ücretsiz site aracı yayında"
              aria-describedby={`${ids.text}-hint`}
            />
            <div id={`${ids.text}-hint`} className="text-[11px] text-ink-faint mt-1 tabular">
              {form.text.length}/300
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <div>
              <label
                htmlFor={ids.tone}
                className="text-[11px] uppercase tracking-wider text-ink-faint font-medium block mb-1"
              >
                Ton
              </label>
              <select
                id={ids.tone}
                className="input"
                value={form.tone}
                onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value as Tone }))}
              >
                {TONES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor={ids.placement}
                className="text-[11px] uppercase tracking-wider text-ink-faint font-medium block mb-1"
              >
                Yerleşim
              </label>
              <select
                id={ids.placement}
                className="input"
                value={form.placement}
                onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value as Placement }))}
              >
                {PLACEMENTS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor={ids.href}
                className="text-[11px] uppercase tracking-wider text-ink-faint font-medium block mb-1"
              >
                Bağlantı (isteğe bağlı)
              </label>
              <input
                id={ids.href}
                className="input"
                value={form.href}
                onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))}
                placeholder="/arac ya da https://…"
              />
            </div>
            <div>
              <label
                htmlFor={ids.cta}
                className="text-[11px] uppercase tracking-wider text-ink-faint font-medium block mb-1"
              >
                Düğme etiketi
              </label>
              <input
                id={ids.cta}
                className="input"
                value={form.ctaLabel}
                maxLength={40}
                onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                placeholder="İncele"
              />
            </div>
            <div>
              <label
                htmlFor={ids.starts}
                className="text-[11px] uppercase tracking-wider text-ink-faint font-medium block mb-1"
              >
                Başlangıç (TSİ)
              </label>
              <input
                id={ids.starts}
                type="datetime-local"
                className="input"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              />
            </div>
            <div>
              <label
                htmlFor={ids.ends}
                className="text-[11px] uppercase tracking-wider text-ink-faint font-medium block mb-1"
              >
                Bitiş (TSİ)
              </label>
              <input
                id={ids.ends}
                type="datetime-local"
                className="input"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              />
            </div>
            <label htmlFor={ids.enabled} className="flex items-center gap-2 text-[13px] self-end min-h-[44px]">
              <input
                id={ids.enabled}
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                className="w-4 h-4"
              />
              Yayında
            </label>
          </div>

          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wider text-ink-faint font-medium mb-1">Önizleme</div>
            <div className="rounded-lg overflow-hidden border border-hairline">
              <AnnouncementRow a={preview} onDismiss={() => undefined} />
            </div>
          </div>

          {error && (
            <InlineAlert className="mt-4" tone="error">
              {error}
            </InlineAlert>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="btn-secondary !py-2 !px-4 text-[13px]"
              disabled={busy === 'save'}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={!hydrated || busy === 'save' || !form.text.trim()}
              aria-busy={busy === 'save'}
              className="btn-primary !py-2 !px-4 text-[13px] disabled:opacity-50"
            >
              {busy === 'save' ? 'Kaydediliyor…' : editing === 'new' ? 'Yayınla' : 'Güncelle'}
            </button>
          </div>
        </form>
      )}

      {!editing && error && (
        <InlineAlert className="mt-4" tone="error">
          {error}
        </InlineAlert>
      )}

      <ul className="mt-5 space-y-2" aria-label="Duyuru listesi">
        {items.length === 0 && (
          <li className="card p-10 text-center">
            <h2 className="font-display text-[20px]">Henüz duyuru yok</h2>
            <p className="text-[13.5px] text-ink-muted mt-2">
              “Yeni duyuru” ile ilkini oluşturun; önizleme formun altında.
            </p>
          </li>
        )}
        {items.map((a) => {
          const toneLabel = TONES.find((t) => t.key === a.tone)?.label ?? a.tone;
          const placeLabel = PLACEMENTS.find((p) => p.key === a.placement)?.label ?? a.placement;
          return (
            <li key={a.id} className={cn('card p-3.5 flex items-center gap-3', !a.live && 'opacity-70')}>
              <label className="inline-flex items-center gap-2 shrink-0 text-[12px] text-ink-muted cursor-pointer min-h-[36px]">
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={a.enabled}
                  aria-label={`${a.text} — yayında`}
                  checked={a.enabled}
                  disabled={!hydrated || busy === `toggle-${a.id}`}
                  onChange={(e) =>
                    run(`toggle-${a.id}`, () =>
                      apiFetch(`/api/admin/announcements/${a.id}`, {
                        method: 'PATCH',
                        json: { enabled: e.target.checked },
                      }),
                    )
                  }
                  className="w-4 h-4"
                />
                {a.enabled ? 'Yayında' : 'Kapalı'}
              </label>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium truncate">{a.text}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="chip !text-[10px]">{toneLabel}</span>
                  <span className="chip !text-[10px]">{placeLabel}</span>
                  {a.live ? (
                    <span className="chip own !text-[10px]">canlı</span>
                  ) : (
                    <span className="chip !text-[10px]">görünmüyor</span>
                  )}
                  {a.href && <span className="text-ink-faint truncate max-w-[200px] font-mono">→ {a.href}</span>}
                  {(a.startsAt || a.endsAt) && (
                    <span className="text-ink-faint font-mono">
                      {a.startsAt
                        ? new Date(a.startsAt).toLocaleString('tr-TR', {
                            timeZone: 'Europe/Istanbul',
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '…'}
                      {' – '}
                      {a.endsAt
                        ? new Date(a.endsAt).toLocaleString('tr-TR', {
                            timeZone: 'Europe/Istanbul',
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '…'}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(a)}
                  aria-label={`Düzenle: ${a.text}`}
                  className="p-2 rounded-md text-ink-muted hover:text-ink hover:bg-paper-2 min-w-[36px] min-h-[36px]"
                >
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm(a)}
                  aria-label={`Sil: ${a.text}`}
                  className="p-2 rounded-md text-ink-muted hover:text-danger hover:bg-paper-2 min-w-[36px] min-h-[36px]"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={!!confirm}
        title="Duyuru silinsin mi?"
        description={
          confirm
            ? `“${confirm.text}” kalıcı olarak silinir. Yayından kaldırmak için “Yayında” anahtarını kapatmak yeterlidir.`
            : undefined
        }
        confirmLabel="Sil"
        destructive
        busy={busy === 'delete'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const target = confirm;
          if (!target) return;
          run(
            'delete',
            async () => {
              await apiFetch(`/api/admin/announcements/${target.id}`, { method: 'DELETE' });
              setConfirm(null);
            },
            'Duyuru silindi.',
          );
        }}
      />
    </div>
  );
}
