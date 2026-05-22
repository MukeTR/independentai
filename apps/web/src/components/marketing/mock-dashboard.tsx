/**
 * Statik dashboard mockup'ı — landing'de "ürünü gör" amaçlı.
 * Gerçek dashboard'a alternatif olarak görsel önizleme.
 */
export function MockDashboard() {
  const trend = [42, 38, 51, 47, 56, 62, 58, 64, 71, 68, 74, 79, 76, 82];
  const max = Math.max(...trend);
  const w = 480;
  const h = 100;
  const points = trend
    .map((v, i) => `${(i * w) / (trend.length - 1)},${h - (v / max) * h * 0.8}`)
    .join(' ');

  return (
    <div className="card bg-paper-3 p-6 shadow-[0_30px_80px_-20px_rgba(20,17,13,0.15)]">
      {/* topbar */}
      <div className="flex items-center justify-between border-b-hairline border-hairline pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-paper-4" />
          <span className="w-2 h-2 rounded-full bg-paper-4" />
          <span className="w-2 h-2 rounded-full bg-paper-4" />
          <span className="text-[11px] text-ink-faint font-mono ml-3">independentai.space/dashboard</span>
        </div>
        <span className="text-[10px] text-ink-faint">demo veri</span>
      </div>

      <div className="grid grid-cols-12 gap-4 mt-5">
        {/* metric cards */}
        <div className="col-span-4 border-hairline border rounded-lg p-3">
          <div className="text-[9px] text-ink-faint tracking-wider uppercase">Görünürlük</div>
          <div className="font-display text-[28px] tabular text-brand mt-1">68<span className="text-[14px] text-ink-faint">%</span></div>
        </div>
        <div className="col-span-4 border-hairline border rounded-lg p-3">
          <div className="text-[9px] text-ink-faint tracking-wider uppercase">Share of Voice</div>
          <div className="font-display text-[28px] tabular mt-1">41<span className="text-[14px] text-ink-faint">%</span></div>
        </div>
        <div className="col-span-4 border-hairline border rounded-lg p-3">
          <div className="text-[9px] text-ink-faint tracking-wider uppercase">Çalıştırma</div>
          <div className="font-display text-[28px] tabular mt-1">432</div>
        </div>

        {/* trend chart */}
        <div className="col-span-8 border-hairline border rounded-lg p-4">
          <div className="text-[9px] text-ink-faint tracking-wider uppercase">Görünürlük trendi · 14 gün</div>
          <svg width="100%" height="120" viewBox={`0 0 ${w} ${h}`} className="mt-2">
            <defs>
              <linearGradient id="m" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`0,${h} ${points} ${w},${h}`} fill="url(#m)" />
            <polyline points={points} fill="none" stroke="#4F46E5" strokeWidth="2" />
            {trend.map((v, i) => (
              <circle
                key={i}
                cx={(i * w) / (trend.length - 1)}
                cy={h - (v / max) * h * 0.8}
                r="2"
                fill="#4F46E5"
              />
            ))}
          </svg>
        </div>

        {/* provider breakdown */}
        <div className="col-span-4 border-hairline border rounded-lg p-4">
          <div className="text-[9px] text-ink-faint tracking-wider uppercase">Modellere göre</div>
          <ul className="mt-3 space-y-2.5">
            {[
              { name: 'ChatGPT', val: 72 },
              { name: 'Claude', val: 68 },
              { name: 'Gemini', val: 64 },
            ].map((m) => (
              <li key={m.name}>
                <div className="flex items-center justify-between text-[11px]">
                  <span>{m.name}</span>
                  <span className="font-mono tabular">{m.val}%</span>
                </div>
                <div className="h-1 rounded-full bg-paper-4 mt-1 overflow-hidden">
                  <div className="h-full bg-brand" style={{ width: `${m.val}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* prompt list */}
        <div className="col-span-12 border-hairline border rounded-lg p-4">
          <div className="text-[9px] text-ink-faint tracking-wider uppercase mb-3">Son izlenen sorular</div>
          <div className="space-y-2.5">
            {[
              { q: 'Restoranlar için en iyi kar-zarar yazılımı?', mention: true, comps: 2 },
              { q: 'Türkiye\'de en iyi POS sistemleri', mention: true, comps: 3 },
              { q: 'KOBİ muhasebe yazılımı önerir misin?', mention: false, comps: 4 },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between border-b-hairline border-hairline last:border-0 pb-2 last:pb-0">
                <span className="text-[12px] truncate">{p.q}</span>
                <div className="flex gap-1.5 shrink-0">
                  {p.mention ? (
                    <span className="chip own !text-[9px] !py-0.5">markanız var</span>
                  ) : (
                    <span className="chip !text-[9px] !py-0.5">geçmiyor</span>
                  )}
                  <span className="chip comp !text-[9px] !py-0.5">{p.comps} rakip</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
