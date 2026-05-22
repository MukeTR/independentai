'use client';

import { useState, useMemo } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';

export function VisibilityCalculator() {
  const [prompts, setPrompts] = useState(10);
  const [models, setModels] = useState(3);
  const [days, setDays] = useState(30);
  const [brandMentions, setBrandMentions] = useState(285);
  const [competitorMentions, setCompetitorMentions] = useState(420);

  const result = useMemo(() => {
    const totalRuns = prompts * models * days;
    const visibility = totalRuns > 0 ? Math.round((brandMentions / totalRuns) * 100) : 0;
    const totalAllMentions = brandMentions + competitorMentions;
    const sov = totalAllMentions > 0 ? Math.round((brandMentions / totalAllMentions) * 100) : 0;
    return { totalRuns, visibility, sov };
  }, [prompts, models, days, brandMentions, competitorMentions]);

  const benchmark = useMemo(() => {
    if (result.visibility >= 70) return { label: 'Mükemmel', color: 'text-positive', desc: 'Kategori liderisiniz' };
    if (result.visibility >= 50) return { label: 'İyi', color: 'text-brand', desc: 'Sağlam pozisyon' };
    if (result.visibility >= 30) return { label: 'Orta', color: 'text-warning', desc: 'Gelişim alanı var' };
    return { label: 'Düşük', color: 'text-danger', desc: 'Hızlı aksiyon gerek' };
  }, [result.visibility]);

  return (
    <div className="not-prose card bg-paper-3 overflow-hidden my-12">
      <div className="px-7 py-5 border-b-hairline border-hairline flex items-center gap-3">
        <Calculator className="w-5 h-5 text-brand" />
        <div>
          <div className="font-display text-[18px] tracking-tight">AI Visibility Score Hesaplayıcı</div>
          <div className="text-[11px] text-ink-faint font-mono">Formülünü canlı uygula · sektör benchmark ile karşılaştır</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-hairline">
        {/* Input */}
        <div className="p-7 space-y-5">
          <div>
            <label className="eyebrow block mb-2">İzlenen prompt sayısı</label>
            <input
              type="number"
              min={1}
              max={500}
              value={prompts}
              onChange={(e) => setPrompts(Math.max(1, Number(e.target.value)))}
              className="input"
            />
            <div className="text-[10.5px] text-ink-faint mt-1">Tipik: 5-15 (küçük marka), 30-50 (kurumsal)</div>
          </div>
          <div>
            <label className="eyebrow block mb-2">Model sayısı</label>
            <input
              type="number"
              min={1}
              max={5}
              value={models}
              onChange={(e) => setModels(Math.max(1, Number(e.target.value)))}
              className="input"
            />
            <div className="text-[10.5px] text-ink-faint mt-1">Tipik: 3 (ChatGPT + Claude + Gemini)</div>
          </div>
          <div>
            <label className="eyebrow block mb-2">İzleme penceresi (gün)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
              className="input"
            />
            <div className="text-[10.5px] text-ink-faint mt-1">Önerilen: 30 gün (standart)</div>
          </div>
          <div>
            <label className="eyebrow block mb-2">Markanızın geçtiği toplam run sayısı</label>
            <input
              type="number"
              min={0}
              value={brandMentions}
              onChange={(e) => setBrandMentions(Math.max(0, Number(e.target.value)))}
              className="input"
            />
            <div className="text-[10.5px] text-ink-faint mt-1">Independent AI dashboard\'undan veya manuel sayım</div>
          </div>
          <div>
            <label className="eyebrow block mb-2">Rakiplerin toplam mention sayısı</label>
            <input
              type="number"
              min={0}
              value={competitorMentions}
              onChange={(e) => setCompetitorMentions(Math.max(0, Number(e.target.value)))}
              className="input"
            />
            <div className="text-[10.5px] text-ink-faint mt-1">SoV hesabı için (opsiyonel)</div>
          </div>
        </div>

        {/* Output */}
        <div className="bg-paper-2/40 p-7">
          <div className="eyebrow mb-3">Sonuçlar</div>

          <div className="space-y-5">
            <div className="card bg-paper-3 p-5">
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-[11px] text-ink-faint uppercase tracking-wider">Visibility Score</div>
                <div className={`font-display text-[42px] tabular ${benchmark.color}`}>
                  {result.visibility}<span className="text-[18px] text-ink-faint">%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-paper-4 overflow-hidden">
                <div className="h-full bg-brand transition-all duration-500" style={{ width: `${result.visibility}%` }} />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <TrendingUp className={`w-3.5 h-3.5 ${benchmark.color}`} />
                <span className={`text-[12px] font-medium ${benchmark.color}`}>{benchmark.label}</span>
                <span className="text-[12px] text-ink-muted">— {benchmark.desc}</span>
              </div>
            </div>

            <div className="card bg-paper-3 p-5">
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-[11px] text-ink-faint uppercase tracking-wider">Share of Voice</div>
                <div className="font-display text-[36px] tabular">
                  {result.sov}<span className="text-[16px] text-ink-faint">%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-paper-4 overflow-hidden">
                <div className="h-full bg-ink transition-all duration-500" style={{ width: `${result.sov}%` }} />
              </div>
              <div className="text-[12px] text-ink-muted mt-3">
                Rakiplerle birlikte toplam içindeki payınız
              </div>
            </div>

            <div className="border-hairline border rounded-lg p-4 bg-paper-3">
              <div className="text-[11px] text-ink-faint uppercase tracking-wider mb-2">Detay</div>
              <dl className="text-[12px] space-y-1.5">
                <div className="flex justify-between"><dt className="text-ink-muted">Toplam run</dt><dd className="font-mono tabular">{result.totalRuns.toLocaleString('tr-TR')}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-muted">Marka mention</dt><dd className="font-mono tabular">{brandMentions.toLocaleString('tr-TR')}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-muted">Rakip mention</dt><dd className="font-mono tabular">{competitorMentions.toLocaleString('tr-TR')}</dd></div>
                <div className="flex justify-between border-t-hairline border-hairline pt-1.5 mt-1.5">
                  <dt className="text-ink">Toplam mention</dt>
                  <dd className="font-mono tabular text-ink">{(brandMentions + competitorMentions).toLocaleString('tr-TR')}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="px-7 py-4 border-t-hairline border-hairline bg-paper-2/40">
        <p className="text-[12px] text-ink-muted">
          <strong className="text-ink">Sektör benchmarkı:</strong> B2B SaaS 30-60% normal, 70+ sektör lideri. E-ticaret 40-70% normal, 80+ dominasyon.
          Yerel hizmet 20-50% normal.
        </p>
      </div>
    </div>
  );
}
