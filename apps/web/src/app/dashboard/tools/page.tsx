import Link from 'next/link';
import { ArrowRight, FileText, Bot, Code, ClipboardCheck, Calculator, CheckCircle2, Wrench } from 'lucide-react';

const TOOLS = [
  {
    href: '/dashboard/tools/llms-txt',
    icon: FileText,
    title: 'llms.txt Generator',
    desc: 'AI bot\'lara markanızı doğrudan anlatan markdown dosyası üret. 30 saniyede hazır.',
    category: 'Üretici',
  },
  {
    href: '/dashboard/tools/robots',
    icon: Bot,
    title: 'robots.txt Generator',
    desc: 'AI crawler\'larını yönet (GPTBot, ClaudeBot, PerplexityBot), sitemap referansı ekle.',
    category: 'Üretici',
  },
  {
    href: '/dashboard/tools/schema',
    icon: Code,
    title: 'Schema Markup Generator',
    desc: 'Organization JSON-LD üret, HTML\'inize yapıştır. AI gözündeki kanonik bilginiz.',
    category: 'Üretici',
  },
  {
    href: '/dashboard/tools/audit',
    icon: ClipboardCheck,
    title: 'GEO Audit Checklist',
    desc: '10 adımlık denetim, her adımda not alma, markdown rapor olarak indir.',
    category: 'Denetim',
  },
  {
    href: '/dashboard/tools/visibility',
    icon: Calculator,
    title: 'Visibility Score Hesaplayıcı',
    desc: 'Promptlarınızı ve mention sayılarınızı gir, anlık Score + SoV çıktısı al.',
    category: 'Hesaplayıcı',
  },
  {
    href: '/dashboard/tools/checklist',
    icon: CheckCircle2,
    title: 'AI SEO Checklist',
    desc: '25 maddelik interaktif checklist, kategori bazlı skor, rapor indir.',
    category: 'Denetim',
  },
];

const CATEGORIES = ['Üretici', 'Denetim', 'Hesaplayıcı'];

export default function ToolsHub() {
  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-2">
        <Wrench className="w-5 h-5 text-brand" />
        <div className="eyebrow">Araçlar</div>
      </div>
      <h1 className="font-display text-[36px] tracking-tight">GEO araç kutusu</h1>
      <p className="text-[15px] text-ink-muted mt-3 max-w-2xl">
        AI çağında markanızı optimize etmek için ihtiyacınız olan tüm araçlar tek bir yerde.
        Hepsi tarayıcıda çalışır, sunucu kaydı yok, gizliliğiniz korunur.
      </p>

      {CATEGORIES.map((cat) => (
        <section key={cat} className="mt-10">
          <div className="eyebrow mb-4">{cat}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TOOLS.filter((t) => t.category === cat).map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="card p-6 hover:bg-paper-3 hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-glow flex items-center justify-center shrink-0 group-hover:bg-brand/15 transition">
                    <tool.icon className="w-5 h-5 text-brand" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-[17px] leading-tight">{tool.title}</h3>
                    <p className="text-[13px] text-ink-muted mt-2 leading-relaxed">{tool.desc}</p>
                    <div className="inline-flex items-center gap-1.5 text-[12px] text-brand-deep mt-3 group-hover:gap-2 transition-all">
                      Aracı aç <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <div className="card p-6 mt-10 bg-paper-2/40">
        <div className="eyebrow mb-2">Sırada ne var?</div>
        <p className="text-[13.5px] text-ink-muted leading-relaxed">
          Yol haritasında: Brand alias suggester, prompt önerici, AI crawler log analyzer, citation tracker, sentiment analizi tool\'u.
          Aklında olan bir araç var mı? <a href="/contact" className="text-brand-deep hover:text-brand underline">İletişim</a>'den bize yaz.
        </p>
      </div>
    </div>
  );
}
