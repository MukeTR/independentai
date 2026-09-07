'use client';

import { useEffect, useId, useState } from 'react';
import { Loader2, Save, Send, Check } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';

type View = {
  emailEnabled: boolean;
  weeklyReportEnabled: boolean;
  visibilityDropThreshold: number;
  slackConfigured: boolean;
  slackWebhookMasked: string | null;
  lastNotifiedAt: string | null;
  lastDropAlertAt: string | null;
};

export function AlertSettingsForm({ readOnly = false }: { readOnly?: boolean }) {
  const ids = { slack: useId(), thr: useId() };
  const [cfg, setCfg] = useState<View | null>(null);
  const [slackInput, setSlackInput] = useState('');
  const [clearSlack, setClearSlack] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    apiFetch<View>('/api/alerts')
      .then(setCfg)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  async function save(testSlack = false) {
    if (!cfg || saving || readOnly) return;
    setSaving(true);
    setSaved(false);
    setError('');
    setTestResult('');
    try {
      const body: Record<string, unknown> = {
        emailEnabled: cfg.emailEnabled,
        weeklyReportEnabled: cfg.weeklyReportEnabled,
        visibilityDropThreshold: cfg.visibilityDropThreshold,
        testSlack,
      };
      if (clearSlack) body.slackWebhookUrl = null;
      else if (slackInput.trim()) body.slackWebhookUrl = slackInput.trim();
      const data = await apiFetch<View & { testResult?: string }>('/api/alerts', { method: 'PUT', json: body });
      setCfg(data);
      setSlackInput('');
      setClearSlack(false);
      setSaved(true);
      if (data.testResult)
        setTestResult(
          data.testResult === 'sent' ? 'Test mesajı gönderildi ✓' : 'Test başarısız — webhook adresini kontrol edin',
        );
    } catch (err) {
      setError(errorMessage(err, 'Kaydedilemedi, tekrar deneyin.'));
    } finally {
      setSaving(false);
    }
  }

  if (!cfg && !error)
    return (
      <div className="card p-8 flex justify-center" aria-busy="true">
        <Loader2 className="w-5 h-5 animate-spin text-ink-faint" aria-label="Yükleniyor" />
      </div>
    );
  if (!cfg) return <InlineAlert>{error}</InlineAlert>;

  return (
    <div className="space-y-6 max-w-2xl">
      <fieldset disabled={readOnly} className="space-y-6 min-w-0">
        <div className="card p-5 sm:p-6 space-y-4">
          <Toggle
            id="weekly"
            label="Haftalık e-posta raporu"
            desc="Her hafta görünürlük özetinizi hesap sahibine e-posta ile gönderir."
            checked={cfg.weeklyReportEnabled}
            onChange={(v) => setCfg({ ...cfg, weeklyReportEnabled: v })}
          />
          <Toggle
            id="email"
            label="E-posta bildirimleri"
            desc="Görünürlük düşüşlerinde e-posta alın."
            checked={cfg.emailEnabled}
            onChange={(v) => setCfg({ ...cfg, emailEnabled: v })}
          />
          {(cfg.lastNotifiedAt || cfg.lastDropAlertAt) && (
            <p className="text-[11.5px] text-ink-faint">
              {cfg.lastNotifiedAt ? `Son haftalık rapor: ${new Date(cfg.lastNotifiedAt).toLocaleString('tr-TR')}` : ''}
              {cfg.lastNotifiedAt && cfg.lastDropAlertAt ? ' · ' : ''}
              {cfg.lastDropAlertAt ? `Son düşüş uyarısı: ${new Date(cfg.lastDropAlertAt).toLocaleString('tr-TR')}` : ''}
            </p>
          )}
        </div>

        <div className="card p-5 sm:p-6">
          <label htmlFor={ids.slack} className="text-[14px] font-medium">
            Slack Webhook URL
          </label>
          <p className="text-[12.5px] text-ink-muted mt-1">
            Slack&apos;te <span className="font-mono">Incoming Webhook</span> oluşturup adresi yapıştırın. Adres şifreli
            saklanır ve bir daha gösterilmez.
          </p>
          {cfg.slackConfigured && !clearSlack && (
            <div className="flex items-center justify-between gap-2 mt-3 text-[12.5px]">
              <span className="font-mono text-ink-muted truncate">Kayıtlı: {cfg.slackWebhookMasked}</span>
              <button type="button" className="text-danger underline shrink-0" onClick={() => setClearSlack(true)}>
                Kaldır
              </button>
            </div>
          )}
          {clearSlack && (
            <InlineAlert tone="warning" className="mt-3">
              Kaydedince Slack bağlantısı kaldırılacak.{' '}
              <button type="button" className="underline" onClick={() => setClearSlack(false)}>
                Vazgeç
              </button>
            </InlineAlert>
          )}
          <input
            id={ids.slack}
            value={slackInput}
            onChange={(e) => setSlackInput(e.target.value)}
            placeholder={
              cfg.slackConfigured
                ? 'Yeni adres girerseniz mevcut üzerine yazılır'
                : 'https://hooks.slack.com/services/...'
            }
            className="input mt-3"
            autoComplete="off"
          />
          {cfg.slackConfigured && (
            <button
              type="button"
              onClick={() => save(true)}
              disabled={saving}
              className="mt-3 text-[12.5px] inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 hover:bg-paper-3 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" aria-hidden /> Test mesajı gönder
            </button>
          )}
          {testResult && (
            <div className="text-[12.5px] text-brand-deep mt-2" role="status">
              {testResult}
            </div>
          )}
        </div>

        <div className="card p-5 sm:p-6">
          <label htmlFor={ids.thr} className="text-[14px] font-medium">
            Görünürlük düşüş eşiği
          </label>
          <p className="text-[12.5px] text-ink-muted mt-1">
            Son 24 saat görünürlüğü, önceki 7 gün ortalamasından bu puandan fazla düşerse uyarı gönderilir (günde en
            fazla bir kez).
          </p>
          <div className="flex items-center gap-3 mt-3">
            <input
              id={ids.thr}
              type="range"
              min={5}
              max={50}
              value={cfg.visibilityDropThreshold}
              onChange={(e) => setCfg({ ...cfg, visibilityDropThreshold: Number(e.target.value) })}
              className="flex-1"
              aria-valuemin={5}
              aria-valuemax={50}
              aria-valuenow={cfg.visibilityDropThreshold}
            />
            <output htmlFor={ids.thr} className="font-mono text-[14px] tabular w-10 text-right">
              {cfg.visibilityDropThreshold}
            </output>
          </div>
        </div>
      </fieldset>

      {error && <InlineAlert>{error}</InlineAlert>}
      <button
        type="button"
        onClick={() => save(false)}
        disabled={saving || readOnly}
        className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        aria-busy={saving}
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        ) : saved ? (
          <Check className="w-4 h-4" aria-hidden />
        ) : (
          <Save className="w-4 h-4" aria-hidden />
        )}
        {saved ? 'Kaydedildi' : 'Ayarları kaydet'}
      </button>
    </div>
  );
}

function Toggle({
  id,
  label,
  desc,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[14px]" id={`${id}-label`}>
          {label}
        </div>
        <div className="text-[12.5px] text-ink-muted mt-0.5" id={`${id}-desc`}>
          {desc}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-desc`}
        onClick={() => onChange(!checked)}
        className={`shrink-0 w-11 h-6 rounded-full transition relative ${checked ? 'bg-brand' : 'bg-paper-4'}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}
