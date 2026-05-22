'use client';

import { useState, useMemo } from 'react';
import { CheckCircle2, Circle, Download, Sparkles } from 'lucide-react';

type Item = { id: string; label: string; category: string };

const ITEMS: Item[] = [
  { id: 'i1', category: 'Temel altyapı', label: 'HTTPS aktif ve tüm canonical URL\'ler https:// ile başlıyor' },
  { id: 'i2', category: 'Temel altyapı', label: 'Sitemap.xml güncel, robots.txt erişilebilir' },
  { id: 'i3', category: 'Temel altyapı', label: 'llms.txt eklenmiş, content-type text/markdown' },
  { id: 'i4', category: 'Temel altyapı', label: 'Sayfa hızı: LCP < 2.5sn, CLS < 0.1' },
  { id: 'i5', category: 'Temel altyapı', label: 'Mobile-first responsive tasarım' },
  { id: 'i6', category: 'Temel altyapı', label: 'JS-bağımsız temel içerik (SSR veya SSG ile)' },
  { id: 'i7', category: 'Temel altyapı', label: 'Yapılandırılmış veri: Organization, WebSite, BreadcrumbList' },
  { id: 'i8', category: 'Temel altyapı', label: 'AI bot\'ları robots.txt\'te explicit allow' },
  { id: 'i9', category: 'İçerik', label: 'Her ana kategoride pillar makale (3000+ kelime)' },
  { id: 'i10', category: 'İçerik', label: 'Karşılaştırma içerikleri (X vs Y formatı)' },
  { id: 'i11', category: 'İçerik', label: 'FAQ bölümleri (FAQPage schema ile)' },
  { id: 'i12', category: 'İçerik', label: 'Tarafsız ton — kendi markanızı abartmayın' },
  { id: 'i13', category: 'İçerik', label: 'Sayısal veri ve kaynak atıfları' },
  { id: 'i14', category: 'İçerik', label: 'Düzenli güncelleme (yılda 2x major)' },
  { id: 'i15', category: 'İçerik', label: 'Bağımsız sitelerde geçme stratejisi' },
  { id: 'i16', category: 'İçerik', label: 'Wikipedia varlığı (uygunsanız)' },
  { id: 'i17', category: 'İçerik', label: 'Reddit/Quora/EksiSözlük forum görünürlüğü' },
  { id: 'i18', category: 'Ölçüm', label: 'Google Search Console aktif' },
  { id: 'i19', category: 'Ölçüm', label: 'Google Analytics 4 veya alternatif' },
  { id: 'i20', category: 'Ölçüm', label: 'Independent AI ile aylık GEO raporu' },
  { id: 'i21', category: 'Ölçüm', label: '5-10 kategorik soruyu sürekli izle' },
  { id: 'i22', category: 'Iterate', label: '3-5 rakip izlemesi sürekli aktif' },
  { id: 'i23', category: 'Iterate', label: 'AI crawler logları aylık analiz' },
  { id: 'i24', category: 'Iterate', label: 'Sentiment trend takibi' },
  { id: 'i25', category: 'Iterate', label: '90 günlük review döngüsü' },
];

const CATEGORIES = ['Temel altyapı', 'İçerik', 'Ölçüm', 'Iterate'];

export function AiSeoChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const score = useMemo(() => {
    const total = ITEMS.length;
    const done = Object.values(checked).filter(Boolean).length;
    return { done, total, pct: Math.round((done / total) * 100) };
  }, [checked]);

  const categoryStats = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const items = ITEMS.filter((i) => i.category === cat);
      const done = items.filter((i) => checked[i.id]).length;
      return { cat, done, total: items.length, pct: Math.round((done / items.length) * 100) };
    });
  }, [checked]);

  function toggle(id: string) {
    setChecked({ ...checked, [id]: !checked[id] });
  }

  function downloadReport() {
    const lines: string[] = [];
    lines.push('# AI SEO Checklist Raporu');
    lines.push(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`);
    lines.push(`Genel skor: ${score.done}/${score.total} (${score.pct}%)\n`);
    for (const cat of CATEGORIES) {
      lines.push(`## ${cat}`);
      const items = ITEMS.filter((i) => i.category === cat);
      const done = items.filter((i) => checked[i.id]).length;
      lines.push(`Skor: ${done}/${items.length}\n`);
      for (const item of items) {
        lines.push(`- ${checked[item.id] ? '[x]' : '[ ]'} ${item.label}`);
      }
      lines.push('');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-seo-checklist-raporu.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function reset() {
    setChecked({});
  }

  return (
    <div className="not-prose card bg-paper-3 overflow-hidden my-12">
      <div className="px-7 py-5 border-b-hairline border-hairline flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-brand" />
          <div>
            <div className="font-display text-[18px] tracking-tight">AI SEO Checklist Aracı</div>
            <div className="text-[11px] text-ink-faint font-mono">25 madde · interaktif · markdown olarak indir</div>
          </div>
        </div>
        <button type="button" onClick={reset} className="text-[11px] text-ink-faint hover:text-ink font-mono">
          sıfırla
        </button>
      </div>

      {/* Score */}
      <div className="px-7 py-5 bg-paper-2/40 border-b-hairline border-hairline">
        <div className="flex items-baseline justify-between mb-3">
          <div className="eyebrow">Genel Skor</div>
          <div className="font-display text-[36px] tabular text-brand">
            {score.pct}<span className="text-[18px] text-ink-faint">%</span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-paper-4 overflow-hidden">
          <div className="h-full bg-brand transition-all duration-300" style={{ width: `${score.pct}%` }} />
        </div>
        <div className="text-[11px] text-ink-faint mt-2 font-mono">{score.done}/{score.total} madde tamamlandı</div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {categoryStats.map((c) => (
            <div key={c.cat} className="text-center p-2 border-hairline border rounded-lg">
              <div className="text-[10px] text-ink-faint uppercase tracking-wider">{c.cat}</div>
              <div className="font-mono text-[13px] tabular mt-1">{c.done}/{c.total}</div>
              <div className="text-[10px] text-brand-deep">{c.pct}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="px-7 py-5">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="mb-7 last:mb-0">
            <div className="eyebrow mb-3">{cat}</div>
            <ul className="space-y-2">
              {ITEMS.filter((i) => i.category === cat).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className="flex items-start gap-3 text-left w-full hover:bg-paper-2/50 px-2 py-1.5 rounded-lg transition"
                  >
                    {checked[item.id] ? (
                      <CheckCircle2 className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-ink-faint mt-0.5 shrink-0" />
                    )}
                    <span className={checked[item.id] ? 'text-ink-faint line-through text-[13.5px]' : 'text-ink text-[13.5px]'}>
                      {item.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="px-7 py-4 border-t-hairline border-hairline bg-paper-2/40 flex items-center justify-between">
        <span className="text-[12px] text-ink-faint">Raporu paylaşmak için indir →</span>
        <button onClick={downloadReport} className="btn-primary !py-2 !px-4 inline-flex items-center gap-2 text-[13px]">
          <Download className="w-3.5 h-3.5" />
          Rapor indir
        </button>
      </div>
    </div>
  );
}
