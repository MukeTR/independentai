'use client';

import { useState, useMemo } from 'react';
import { ClipboardCheck, Download, Sparkles } from 'lucide-react';

const STEPS = [
  { id: 's1', label: 'Kategori sorularını listele (10-15 adet, marka-içermez)', hint: 'Müşterilerinizin AI\'a sorabileceği sorular' },
  { id: 's2', label: 'Her soruyu 3 modelde (ChatGPT, Claude, Gemini) çalıştır', hint: 'Manuel veya Independent AI ile' },
  { id: 's3', label: 'Markanızın geçtiği soruları işaretle → baseline %', hint: 'Visibility Score hesabı' },
  { id: 's4', label: 'Geçmediğiniz sorularda hangi rakipler geçiyor not et', hint: 'Rakip listesi çıkar' },
  { id: 's5', label: 'Geçtiğiniz sorularda pozisyon + sentiment', hint: '1.sıra mı, ton pozitif mi?' },
  { id: 's6', label: 'llms.txt durumu: var mı, güncel mi?', hint: 'sitenizin.com/llms.txt kontrolü' },
  { id: 's7', label: 'robots.txt\'te AI bot\'larına explicit allow var mı?', hint: 'GPTBot, ClaudeBot, PerplexityBot' },
  { id: 's8', label: 'Yapılandırılmış veri (JSON-LD) durumu', hint: 'Organization, FAQPage, BreadcrumbList' },
  { id: 's9', label: 'Son 12 ayda bağımsız sitelerde mention sayısı', hint: 'Quick search ile' },
  { id: 's10', label: 'Wikipedia varlığınız var mı?', hint: 'Markanız için sayfa kontrolü' },
];

export function GeoAuditChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const score = useMemo(() => {
    const done = Object.values(checked).filter(Boolean).length;
    return { done, total: STEPS.length, pct: Math.round((done / STEPS.length) * 100) };
  }, [checked]);

  function toggle(id: string) {
    setChecked({ ...checked, [id]: !checked[id] });
  }

  function updateNote(id: string, value: string) {
    setNotes({ ...notes, [id]: value });
  }

  function downloadReport() {
    const lines: string[] = [];
    lines.push('# GEO Audit Raporu');
    lines.push(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`);
    lines.push(`Tamamlanma: ${score.done}/${score.total} (${score.pct}%)\n`);
    for (const step of STEPS) {
      lines.push(`## ${checked[step.id] ? '✅' : '⬜'} ${step.label}`);
      lines.push(`_${step.hint}_\n`);
      if (notes[step.id]) {
        lines.push(`**Notlar:** ${notes[step.id]}\n`);
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geo-audit-raporu.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="not-prose card bg-paper-3 overflow-hidden my-12">
      <div className="px-7 py-5 border-b-hairline border-hairline flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-5 h-5 text-brand" />
          <div>
            <div className="font-display text-[18px] tracking-tight">GEO Audit Checklist</div>
            <div className="text-[11px] text-ink-faint font-mono">10 adımlık denetim · notlarınla birlikte indir</div>
          </div>
        </div>
        <div className="font-mono text-[14px] tabular text-brand">
          {score.done}/{score.total} ({score.pct}%)
        </div>
      </div>

      <div className="px-7 py-5">
        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <div key={step.id} className={`border-hairline border rounded-lg p-4 transition ${checked[step.id] ? 'bg-paper-2/50' : ''}`}>
              <button
                type="button"
                onClick={() => toggle(step.id)}
                className="flex items-start gap-3 text-left w-full"
              >
                <div
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium ${
                    checked[step.id] ? 'bg-brand text-paper-3' : 'bg-paper-4 text-ink-muted'
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className={`text-[14px] ${checked[step.id] ? 'text-ink-faint line-through' : 'text-ink'}`}>
                    {step.label}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-0.5">{step.hint}</div>
                </div>
              </button>
              {checked[step.id] && (
                <textarea
                  rows={2}
                  value={notes[step.id] ?? ''}
                  onChange={(e) => updateNote(step.id, e.target.value)}
                  placeholder="Notlarınız, bulgularınız..."
                  className="input mt-3 !text-[12px] resize-none"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-7 py-4 border-t-hairline border-hairline bg-paper-2/40 flex items-center justify-between">
        <div className="text-[12px] text-ink-muted flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-brand" />
          Tüm 10 adımı 2 saatte tamamlayabilirsin
        </div>
        <button onClick={downloadReport} className="btn-primary !py-2 !px-4 inline-flex items-center gap-2 text-[13px]">
          <Download className="w-3.5 h-3.5" />
          Rapor indir
        </button>
      </div>
    </div>
  );
}
