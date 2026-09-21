'use client';

/**
 * Hedef yöneticisi — sektörden bağımsız dönüşüm tanımları.
 *
 * Üç eşleştirme yöntemi kullanıcıya sade anlatılır: URL yolu (kod yazmadan), olay adı (SDK olayı)
 * ve `data-iai-event` niteliği. Şablon paketi tek tıkla site türüne uygun hedefleri ekler.
 * Hiçbir hedef istemcide "eklendi" varsayılmaz; liste her işlemden sonra sunucudan tazelenir.
 */
import { useCallback, useEffect, useId, useState } from 'react';
import { Loader2, Plus, Sparkles, Target, Trash2 } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { InlineAlert } from '@/components/ui/inline-alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { GOAL_MATCH_LABELS, GOAL_TYPE_LABELS, labelOf, type GoalsResponse, type GoalView } from './types';

const GOAL_TYPES = Object.keys(GOAL_TYPE_LABELS);
const MATCH_METHODS = ['PATH', 'EVENT', 'DATA_ATTRIBUTE'] as const;

const MATCH_HINT: Record<string, string> = {
  PATH: 'Ziyaretçi bu yolu görüntülediğinde sayılır. Sondaki * ile alt sayfalar da kapsanır (örn. /tesekkurler veya /rezervasyon/*).',
  EVENT: 'SDK’nın gönderdiği olay adı (örn. form_submit, demo_request). Sitedeki kurulumla aynı yazılmalıdır.',
  DATA_ATTRIBUTE: 'Butona data-iai-event="teklif_al" eklerseniz tıklama bu hedefe sayılır.',
};

export function GoalManager({
  siteId,
  canWrite,
  onChanged,
}: {
  siteId: string;
  canWrite: boolean;
  onChanged?: () => void;
}) {
  const hydrated = useHydrated();
  const formId = useId();
  const [data, setData] = useState<GoalsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmGoal, setConfirmGoal] = useState<GoalView | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState('LEAD');
  const [matchMethod, setMatchMethod] = useState<string>('PATH');
  const [pathPattern, setPathPattern] = useState('');
  const [eventName, setEventName] = useState('');
  const [attributeValue, setAttributeValue] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<GoalsResponse>(`/api/discovery/sites/${encodeURIComponent(siteId)}/goals`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Hedefler yüklenemedi'));
    }
  }, [siteId]);

  useEffect(() => {
    setData(null);
    setError(null);
    void load();
  }, [load]);

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || adding) return;
    setAdding(true);
    setFlash(null);
    try {
      await apiFetch(`/api/discovery/sites/${encodeURIComponent(siteId)}/goals`, {
        method: 'POST',
        json: {
          name,
          type,
          matchMethod,
          pathPattern: matchMethod === 'PATH' ? pathPattern : undefined,
          eventName: matchMethod === 'EVENT' ? eventName : undefined,
          attributeValue: matchMethod === 'DATA_ATTRIBUTE' ? attributeValue : undefined,
        },
      });
      setName('');
      setPathPattern('');
      setEventName('');
      setAttributeValue('');
      setFlash({ tone: 'success', text: 'Hedef eklendi. Bundan sonraki ziyaretlerde ölçülmeye başlar.' });
      await load();
      onChanged?.();
    } catch (err) {
      setFlash({ tone: 'error', text: errorMessage(err, 'Hedef eklenemedi') });
    } finally {
      setAdding(false);
    }
  }

  async function toggle(goal: GoalView) {
    setBusy(goal.id);
    try {
      await apiFetch(`/api/discovery/sites/${encodeURIComponent(siteId)}/goals/${encodeURIComponent(goal.id)}`, {
        method: 'PATCH',
        json: { isActive: !goal.isActive },
      });
      await load();
      onChanged?.();
    } catch (err) {
      setFlash({ tone: 'error', text: errorMessage(err, 'Hedef güncellenemedi') });
    } finally {
      setBusy(null);
    }
  }

  async function applyTemplate() {
    if (!data) return;
    setBusy('template');
    setFlash(null);
    try {
      const r = await apiFetch<{ created: GoalView[] }>(
        `/api/discovery/sites/${encodeURIComponent(siteId)}/goals/template`,
        { method: 'POST', json: { kind: data.template.kind } },
      );
      setFlash({
        tone: r.created.length ? 'success' : 'info',
        text: r.created.length
          ? `${r.created.length} hazır hedef eklendi.`
          : 'Şablondaki hedefler zaten tanımlı; yeni hedef eklenmedi.',
      });
      await load();
      onChanged?.();
    } catch (err) {
      setFlash({ tone: 'error', text: errorMessage(err, 'Şablon uygulanamadı') });
    } finally {
      setBusy(null);
    }
  }

  async function removeGoal() {
    if (!confirmGoal) return;
    setConfirmBusy(true);
    try {
      await apiFetch(`/api/discovery/sites/${encodeURIComponent(siteId)}/goals/${encodeURIComponent(confirmGoal.id)}`, {
        method: 'DELETE',
      });
      setConfirmGoal(null);
      setFlash({ tone: 'info', text: 'Hedef silindi. Geçmiş olay verisi silinmez.' });
      await load();
      onChanged?.();
    } catch (err) {
      setFlash({ tone: 'error', text: errorMessage(err, 'Hedef silinemedi') });
    } finally {
      setConfirmBusy(false);
    }
  }

  if (!data && !error) {
    return (
      <div className="card p-8 flex justify-center" aria-busy="true">
        <Loader2 className="w-5 h-5 animate-spin text-ink-faint" aria-label="Hedefler yükleniyor" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {flash && <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert>}
      {error && (
        <div className="space-y-2">
          <InlineAlert>{error}</InlineAlert>
          <button type="button" className="btn-secondary !py-1.5 !px-3 text-[12.5px]" onClick={() => void load()}>
            Tekrar dene
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-display text-[17px]">Dönüşüm hedefleri</h3>
                <p className="text-[12.5px] text-ink-muted mt-1 max-w-xl leading-relaxed">
                  Hedef, sitenizde “başarı” sayılan eylemdir. AI kaynaklı ziyaretin hedefe ulaşıp ulaşmadığı buradan
                  ölçülür. Aynı oturumda aynı hedef yalnızca bir kez sayılır.
                </p>
              </div>
              {data.template.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => void applyTemplate()}
                  disabled={!hydrated || !canWrite || busy === 'template'}
                  className="btn-secondary inline-flex items-center gap-1.5 !py-1.5 !px-3 text-[12.5px] disabled:opacity-50"
                >
                  {busy === 'template' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" aria-hidden />
                  )}
                  Hazır paketi uygula
                </button>
              )}
            </div>

            {data.goals.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-6 h-6 text-ink-faint mx-auto" aria-hidden />
                <p className="text-[13.5px] text-ink-muted mt-2">Henüz hedef tanımlı değil.</p>
                <p className="text-[12px] text-ink-faint mt-1">
                  En hızlı yol: teşekkür sayfanızın URL’sini hedef olarak ekleyin.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-hairline mt-4" aria-label="Tanımlı hedefler">
                {data.goals.map((g) => (
                  <li key={g.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13.5px] text-ink flex items-center gap-2 flex-wrap">
                        {g.name}
                        <span className="chip !text-[10px]">{labelOf(GOAL_TYPE_LABELS, g.type)}</span>
                        {!g.isActive && <span className="chip !text-[10px] !text-ink-faint">pasif</span>}
                      </div>
                      <div className="text-[11.5px] text-ink-faint font-mono mt-0.5 break-all">
                        {labelOf(GOAL_MATCH_LABELS, g.matchMethod)}: {g.pathPattern ?? g.eventName ?? g.attributeValue}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void toggle(g)}
                        disabled={!hydrated || !canWrite || busy === g.id}
                        aria-pressed={g.isActive}
                        className="rounded-lg border border-hairline px-3 py-1.5 text-[12px] hover:bg-paper-2 transition disabled:opacity-50"
                      >
                        {g.isActive ? 'Duraklat' : 'Etkinleştir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmGoal(g)}
                        disabled={!hydrated || !canWrite}
                        aria-label={`${g.name} hedefini sil`}
                        className="rounded-lg px-2 py-1.5 text-ink-muted hover:text-danger hover:bg-danger/5 transition disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form className="card p-5 space-y-4" onSubmit={addGoal}>
            <h3 className="font-display text-[16px]">Yeni hedef</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor={`${formId}-name`} className="text-[12px] text-ink-muted block mb-1.5">
                  Hedef adı
                </label>
                <input
                  id={`${formId}-name`}
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Teşekkür sayfası"
                  maxLength={80}
                  required
                />
              </div>
              <div>
                <label htmlFor={`${formId}-type`} className="text-[12px] text-ink-muted block mb-1.5">
                  Hedef türü
                </label>
                <select id={`${formId}-type`} className="input" value={type} onChange={(e) => setType(e.target.value)}>
                  {GOAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {GOAL_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${formId}-match`} className="text-[12px] text-ink-muted block mb-1.5">
                  Eşleştirme yöntemi
                </label>
                <select
                  id={`${formId}-match`}
                  className="input"
                  value={matchMethod}
                  onChange={(e) => setMatchMethod(e.target.value)}
                  aria-describedby={`${formId}-match-hint`}
                >
                  {MATCH_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {GOAL_MATCH_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                {matchMethod === 'PATH' && (
                  <>
                    <label htmlFor={`${formId}-path`} className="text-[12px] text-ink-muted block mb-1.5">
                      URL yolu
                    </label>
                    <input
                      id={`${formId}-path`}
                      className="input font-mono"
                      value={pathPattern}
                      onChange={(e) => setPathPattern(e.target.value)}
                      placeholder="/tesekkurler"
                      required
                    />
                  </>
                )}
                {matchMethod === 'EVENT' && (
                  <>
                    <label htmlFor={`${formId}-event`} className="text-[12px] text-ink-muted block mb-1.5">
                      Olay adı
                    </label>
                    <input
                      id={`${formId}-event`}
                      className="input font-mono"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="form_submit"
                      required
                    />
                  </>
                )}
                {matchMethod === 'DATA_ATTRIBUTE' && (
                  <>
                    <label htmlFor={`${formId}-attr`} className="text-[12px] text-ink-muted block mb-1.5">
                      data-iai-event değeri
                    </label>
                    <input
                      id={`${formId}-attr`}
                      className="input font-mono"
                      value={attributeValue}
                      onChange={(e) => setAttributeValue(e.target.value)}
                      placeholder="teklif_al"
                      required
                    />
                  </>
                )}
              </div>
            </div>
            <p id={`${formId}-match-hint`} className="text-[11.5px] text-ink-faint leading-relaxed">
              {MATCH_HINT[matchMethod]}
            </p>
            <button
              type="submit"
              disabled={!hydrated || !canWrite || adding}
              className="btn-primary inline-flex items-center gap-1.5 text-[13.5px] disabled:opacity-50"
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="w-4 h-4" aria-hidden />
              )}
              Hedef ekle
            </button>
            {!canWrite && (
              <p className="text-[11.5px] text-ink-faint">Görüntüleyici rolü hedef ekleyemez veya değiştiremez.</p>
            )}
          </form>
        </>
      )}

      <ConfirmDialog
        open={!!confirmGoal}
        title="Hedefi sil"
        description={
          <>
            <b>{confirmGoal?.name}</b> hedefi silinir ve bundan sonra dönüşüm sayılmaz. Geçmiş olay kayıtları silinmez;
            yalnızca bu hedefe bağlı raporlama durur.
          </>
        }
        confirmLabel="Sil"
        destructive
        busy={confirmBusy}
        onConfirm={() => void removeGoal()}
        onCancel={() => setConfirmGoal(null)}
      />
    </div>
  );
}
