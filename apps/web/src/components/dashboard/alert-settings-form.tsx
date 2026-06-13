'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Send, Check } from 'lucide-react';

type Config = {
  emailEnabled: boolean;
  weeklyReportEnabled: boolean;
  slackWebhookUrl: string | null;
  visibilityDropThreshold: number;
};

export function AlertSettingsForm() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    fetch('/api/alerts')
      .then((r) => r.json())
      .then((d) => setCfg({
        emailEnabled: d.emailEnabled ?? true,
        weeklyReportEnabled: d.weeklyReportEnabled ?? true,
        slackWebhookUrl: d.slackWebhookUrl ?? '',
        visibilityDropThreshold: d.visibilityDropThreshold ?? 15,
      }))
      .catch(() => setCfg({ emailEnabled: true, weeklyReportEnabled: true, slackWebhookUrl: '', visibilityDropThreshold: 15 }));
  }, []);

  async function save(testSlack = false) {
    if (!cfg) return;
    setSaving(true);
    setSaved(false);
    setError('');
    setTestResult('');
    try {
      const res = await fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailEnabled: cfg.emailEnabled,
          weeklyReportEnabled: cfg.weeklyReportEnabled,
          slackWebhookUrl: cfg.slackWebhookUrl || null,
          visibilityDropThreshold: cfg.visibilityDropThreshold,
          testSlack,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSaved(true);
        if (data.testResult) setTestResult(data.testResult === 'sent' ? 'Test mesajı gönderildi ✓' : 'Test başarısız — webhook URL\'ini kontrol edin');
      } else {
        setError(data.message || 'Kaydedilemedi, tekrar deneyin.');
      }
    } catch {
      setError('Bağlantı hatası, tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  if (!cfg) return <div className="card p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-ink-faint" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-6 space-y-4">
        <Toggle
          label="Haftalık e-posta raporu"
          desc="Her hafta görünürlük özetinizi hesap sahibine e-posta ile gönderir."
          checked={cfg.weeklyReportEnabled}
          onChange={(v) => setCfg({ ...cfg, weeklyReportEnabled: v })}
        />
        <Toggle
          label="E-posta bildirimleri"
          desc="Önemli değişikliklerde e-posta alın."
          checked={cfg.emailEnabled}
          onChange={(v) => setCfg({ ...cfg, emailEnabled: v })}
        />
      </div>

      <div className="card p-6">
        <label className="text-[14px] font-medium">Slack Webhook URL</label>
        <p className="text-[12.5px] text-ink-muted mt-1">
          Slack'te <span className="font-mono">Incoming Webhook</span> oluşturup URL'i yapıştırın. Haftalık raporlar ve düşüş uyarıları kanalınıza düşer.
        </p>
        <input
          value={cfg.slackWebhookUrl ?? ''}
          onChange={(e) => setCfg({ ...cfg, slackWebhookUrl: e.target.value })}
          placeholder="https://hooks.slack.com/services/..."
          className="input mt-3"
        />
        {cfg.slackWebhookUrl && (
          <button onClick={() => save(true)} disabled={saving} className="mt-3 text-[12.5px] inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 hover:bg-paper-3 transition">
            <Send className="w-3.5 h-3.5" /> Test mesajı gönder
          </button>
        )}
        {testResult && <div className="text-[12.5px] text-brand-deep mt-2">{testResult}</div>}
      </div>

      <div className="card p-6">
        <label className="text-[14px] font-medium">Görünürlük düşüş eşiği</label>
        <p className="text-[12.5px] text-ink-muted mt-1">
          Haftalık görünürlüğünüz bu puandan fazla düşerse acil uyarı gönderilir.
        </p>
        <div className="flex items-center gap-3 mt-3">
          <input
            type="range"
            min={5}
            max={50}
            value={cfg.visibilityDropThreshold}
            onChange={(e) => setCfg({ ...cfg, visibilityDropThreshold: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="font-mono text-[14px] tabular w-10 text-right">{cfg.visibilityDropThreshold}</span>
        </div>
      </div>

      {error && <div className="text-[13px] text-danger bg-danger/5 border border-danger/20 rounded-lg p-3">{error}</div>}

      <button onClick={() => save(false)} disabled={saving} className="btn-primary inline-flex items-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Kaydedildi' : 'Ayarları kaydet'}
      </button>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[14px]">{label}</div>
        <div className="text-[12.5px] text-ink-muted mt-0.5">{desc}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`shrink-0 w-11 h-6 rounded-full transition relative ${checked ? 'bg-brand' : 'bg-paper-4'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
