import Link from 'next/link';
import {
  Gauge, ShieldAlert, PenLine, FileSearch, GitFork, KeyRound, Link2,
  FileText, Bot, Code, Calculator, ClipboardCheck, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { Reveal } from './reveal';

type Tool = { icon: typeof Gauge; title: string; desc: string; cat: string };

// Mirrors dock-nav.tsx TOOLS — the in-app GEO toolbox, framed for marketing.
const FEATURED: { icon: typeof Gauge; cat: string; title: string; desc: string; visual: 'gauge' | 'alert' | 'write' }[] = [
  {
    icon: Gauge, cat: 'Denetim', title: 'GEO Audit',
    desc: 'Herhangi bir URL’yi tarar, yapay zekaya hazırlık skorunu 0-100 olarak verir — başlık yapısı, şema, içerik netliği, atıf edilebilirlik.',
    visual: 'gauge',
  },
  {
    icon: ShieldAlert, cat: 'Denetim', title: 'Halüsinasyon Tespiti',
    desc: 'Modellerin markanız hakkında uydurduğu yanlış bilgileri yakalar. Yanlış fiyat, yanlış özellik, yanlış konum — düzeltilmeden önce görün.',
    visual: 'alert',
  },
  {
    icon: PenLine, cat: 'Üretici', title: 'AEO İçerik Yazıcı',
    desc: 'Hedef soruya yapay zekaların alıntılayacağı şekilde yapılandırılmış, atıf-dostu içerik taslağı üretir. GEO için yazılmış metin.',
    visual: 'write',
  },
];

const TOOLS: Tool[] = [
  { icon: FileSearch, cat: 'Denetim', title: 'İçerik Denetleyici', desc: 'Sayfa → somut aksiyon kartları' },
  { icon: GitFork, cat: 'Denetim', title: 'Kanibalizasyon', desc: 'Kendi sayfalarınız birbirini yiyor mu' },
  { icon: ClipboardCheck, cat: 'Denetim', title: 'GEO Checklist', desc: '10 adımlık hızlı denetim' },
  { icon: CheckCircle2, cat: 'Denetim', title: 'SEO Checklist', desc: '25 maddelik teknik liste' },
  { icon: KeyRound, cat: 'Keşif', title: 'Prompt Bulucu', desc: 'Yüksek niyetli sorular' },
  { icon: Link2, cat: 'Keşif', title: 'Backlink Bulucu', desc: 'Atıf alan kaynakları bul' },
  { icon: FileText, cat: 'Üretici', title: 'llms.txt', desc: 'AI bot yönerge dosyası üret' },
  { icon: Bot, cat: 'Üretici', title: 'robots.txt', desc: 'Crawler kurallarını üret' },
  { icon: Code, cat: 'Üretici', title: 'Schema', desc: 'JSON-LD markup üret' },
  { icon: Calculator, cat: 'Üretici', title: 'Visibility Hesap.', desc: 'Score + Share of Voice formülü' },
];

const CAT_COLOR: Record<string, string> = {
  'Denetim': 'text-brand-deep',
  'Keşif': 'text-positive',
  'Üretici': 'text-warning',
};

export function ToolBento() {
  return (
    <div>
      {/* Featured hero cells */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {FEATURED.map((f, i) => (
          <Reveal key={f.title} delay={i * 90}>
            <div className="grad-border rounded-2xl p-7 h-full flex flex-col group hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center justify-between">
                <span className="w-11 h-11 rounded-xl bg-brand-glow flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-brand" />
                </span>
                <span className={`eyebrow ${CAT_COLOR[f.cat]}`}>{f.cat}</span>
              </div>
              <h3 className="font-display text-[22px] mt-5 leading-tight">{f.title}</h3>
              <p className="text-[13.5px] text-ink-muted mt-2.5 leading-relaxed flex-1">{f.desc}</p>
              <div className="mt-6"><FeaturedVisual kind={f.visual} /></div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Remaining tools — compact grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-5">
        {TOOLS.map((t, i) => (
          <Reveal key={t.title} delay={i * 45}>
            <div className="card p-4 h-full hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <t.icon className="w-[18px] h-[18px] text-brand" />
                <span className={`text-[9px] font-mono uppercase tracking-wider ${CAT_COLOR[t.cat]} opacity-70`}>{t.cat}</span>
              </div>
              <div className="text-[13.5px] text-ink mt-3 leading-tight font-medium">{t.title}</div>
              <div className="text-[11.5px] text-ink-faint mt-1 leading-snug">{t.desc}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={120}>
        <div className="mt-9 flex items-center gap-4 flex-wrap">
          <Link href="/register" className="btn-primary inline-flex items-center gap-2">
            13 aracın tümünü ücretsiz dene <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/features" className="inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand">
            Tüm özellik detayları <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

function FeaturedVisual({ kind }: { kind: 'gauge' | 'alert' | 'write' }) {
  if (kind === 'gauge') {
    return (
      <div className="flex items-end gap-3">
        <div className="font-display text-[40px] leading-none text-brand tabular">87</div>
        <div className="flex-1 pb-1">
          <div className="h-2 rounded-full bg-paper-4 overflow-hidden">
            <div className="h-full rounded-full bg-brand" style={{ width: '87%' }} />
          </div>
          <div className="text-[10px] text-ink-faint font-mono mt-1.5 tracking-wider">AI HAZIRLIK SKORU · 0-100</div>
        </div>
      </div>
    );
  }
  if (kind === 'alert') {
    return (
      <div className="rounded-xl bg-paper-2 border-hairline border p-3">
        <div className="flex items-center gap-2 text-[11px] text-danger font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-danger" /> 2 yanlış bilgi tespit edildi
        </div>
        <div className="text-[11.5px] text-ink-muted mt-2 leading-snug line-through opacity-70">“Ücretsiz planı yok”</div>
        <div className="text-[11.5px] text-ink mt-0.5 leading-snug">→ İlk 6 ay tüm özellikler ücretsiz</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-paper-2 border-hairline border p-3 space-y-1.5">
      <div className="h-2 rounded bg-paper-4 w-full" />
      <div className="h-2 rounded bg-paper-4 w-5/6" />
      <div className="h-2 rounded bg-brand/30 w-2/3" />
      <div className="text-[10px] text-brand-deep font-mono mt-2 tracking-wider">ATIF-DOSTU TASLAK ÜRETİLDİ</div>
    </div>
  );
}
