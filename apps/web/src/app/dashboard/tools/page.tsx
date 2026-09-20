import Link from 'next/link';
import { ArrowRight, Wrench } from 'lucide-react';
import { DASHBOARD_TOOLS as TOOLS, DASHBOARD_TOOL_CATEGORIES as CATEGORIES } from './tools-data';

export default function ToolsHub() {
  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-2">
        <Wrench className="w-5 h-5 text-brand" />
        <div className="eyebrow">Araçlar</div>
      </div>
      <h1 className="font-display text-[36px] tracking-tight">GEO araç kutusu</h1>
      <p className="text-[15px] text-ink-muted mt-3 max-w-2xl">
        AI çağında markanızı optimize etmek için ihtiyacınız olan tüm araçlar tek bir yerde. Hepsi tarayıcıda çalışır,
        sunucu kaydı yok, gizliliğiniz korunur.
      </p>

      {CATEGORIES.filter((cat) => TOOLS.some((t) => t.category === cat)).map((cat) => (
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
        <div className="eyebrow mb-2">Ücretsiz public araçlar</div>
        <p className="text-[13.5px] text-ink-muted leading-relaxed">
          Kayıt gerektirmeyen hızlı kontrol araçları:{' '}
          <a href="/arac/chatgpt-rank-checker" className="text-brand-deep hover:text-brand underline">
            ChatGPT
          </a>
          ,{' '}
          <a href="/arac/claude-rank-checker" className="text-brand-deep hover:text-brand underline">
            Claude
          </a>{' '}
          ve{' '}
          <a href="/arac/gemini-rank-checker" className="text-brand-deep hover:text-brand underline">
            Gemini
          </a>{' '}
          rank checker;{' '}
          <a href="/arac/e-ticaret-ai-gorunurluk-testi" className="text-brand-deep hover:text-brand underline">
            e-ticaret AI görünürlük
          </a>
          ,{' '}
          <a href="/arac/urun-sayfasi-testi" className="text-brand-deep hover:text-brand underline">
            ürün sayfası
          </a>
          ,{' '}
          <a href="/arac/ai-crawler-testi" className="text-brand-deep hover:text-brand underline">
            AI crawler
          </a>{' '}
          testleri ve{' '}
          <a href="/arac/urun-aciklama-yazici" className="text-brand-deep hover:text-brand underline">
            ürün açıklama yazıcı
          </a>
          . Aklında olan bir araç var mı?{' '}
          <a href="/contact" className="text-brand-deep hover:text-brand underline">
            İletişim
          </a>
          'den bize yaz.
        </p>
      </div>
    </div>
  );
}
