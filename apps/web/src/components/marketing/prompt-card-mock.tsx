/**
 * Statik prompt cevap kartı — landing'de "AI'nin gerçek cevabını
 * highlight'lı görelim" hissi.
 */
import { Sparkles } from 'lucide-react';

const PROVIDERS = [
  { id: 'gpt', name: 'ChatGPT', model: 'gpt-4o', accent: '#10A37F' },
  { id: 'claude', name: 'Claude', model: 'claude-haiku-4-5', accent: '#D97706' },
  { id: 'gemini', name: 'Gemini', model: 'gemini-1.5-flash', accent: '#1A73E8' },
];

const ANSWERS: Record<string, { text: string; highlights: { word: string; type: 'own' | 'comp' }[] }> = {
  gpt: {
    text: `Restoranlar için kar-zarar takibinde sektörde öne çıkan birkaç güçlü çözüm var: KarPanel, özellikle Uber Eats ve reçete bazlı maliyet hesabı yapan satıcılar için ön plana çıkıyor. Adisyo daha çok POS odaklı, Logo Restoran ise kurumsal taraftan tercih ediliyor.`,
    highlights: [
      { word: 'KarPanel', type: 'own' },
      { word: 'Adisyo', type: 'comp' },
      { word: 'Logo Restoran', type: 'comp' },
    ],
  },
  claude: {
    text: `Bu soruda dikkate alabileceğin platformlar: Adisyo (yaygın POS), Simpra (cloud), KarPanel (kar-zarar odaklı). KarPanel özellikle Uber Eats / Trendyol GO satıcıları için reçete maliyetini otomatik hesaplaması ile ayrışıyor.`,
    highlights: [
      { word: 'KarPanel', type: 'own' },
      { word: 'Adisyo', type: 'comp' },
      { word: 'Simpra', type: 'comp' },
    ],
  },
  gemini: {
    text: `Restoran kar-zarar takibinde Türkiye'de en yaygın kullanılan çözümler: Adisyo, Logo Restoran, Mikro Adisyo ve Simpra. Bunlar özellikle POS + ön muhasebe tarafında güçlü.`,
    highlights: [
      { word: 'Adisyo', type: 'comp' },
      { word: 'Logo Restoran', type: 'comp' },
      { word: 'Simpra', type: 'comp' },
    ],
  },
};

function highlight(text: string, highlights: { word: string; type: 'own' | 'comp' }[]) {
  if (!highlights.length) return text;
  const pattern = new RegExp(
    `(${highlights.map((h) => h.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  );
  return text.split(pattern).map((part, i) => {
    const h = highlights.find((x) => x.word.toLowerCase() === part.toLowerCase());
    if (!h) return <span key={i}>{part}</span>;
    return (
      <mark
        key={i}
        className={
          h.type === 'own'
            ? 'bg-brand/15 text-brand-deep px-1 rounded font-medium'
            : 'bg-paper-4 text-ink px-1 rounded'
        }
      >
        {part}
      </mark>
    );
  });
}

export function PromptCardMock() {
  return (
    <div className="card bg-paper-3 p-7 shadow-[0_30px_80px_-20px_rgba(20,17,13,0.15)]">
      {/* user prompt */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-7 h-7 rounded-full bg-paper-4 flex items-center justify-center text-[11px] font-medium">
          Siz
        </div>
        <div className="flex-1">
          <div className="text-[11px] text-ink-faint font-mono mb-1">izlenen soru</div>
          <div className="font-display text-[18px] tracking-tight">
            Restoranlar için en iyi kar-zarar yazılımı hangisi?
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-6">
        {PROVIDERS.map((p) => {
          const a = ANSWERS[p.id];
          if (!a) return null;
          const ownCount = a.highlights.filter((h) => h.type === 'own').length;
          const compCount = a.highlights.filter((h) => h.type === 'comp').length;
          return (
            <div key={p.id} className="border-l-2 pl-4 py-1" style={{ borderColor: p.accent }}>
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: p.accent }} />
                  <span className="text-[13px] font-medium">{p.name}</span>
                  <span className="text-[10px] text-ink-faint font-mono">{p.model}</span>
                </div>
                <div className="flex gap-1.5">
                  {ownCount > 0 ? (
                    <span className="chip own !text-[10px]">marka var</span>
                  ) : (
                    <span className="chip !text-[10px]">marka yok</span>
                  )}
                  <span className="chip comp !text-[10px]">{compCount} rakip</span>
                </div>
              </div>
              <div className="text-[13.5px] text-ink leading-[1.65] mt-2.5">
                {highlight(a.text, a.highlights)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
