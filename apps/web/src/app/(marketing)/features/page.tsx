import {
  Brain,
  Eye,
  TrendingUp,
  GitCompare,
  BarChart3,
  Zap,
  Layers,
  Bell,
  ShieldCheck,
  Globe2,
  Database,
  Lock,
  MessagesSquare,
  ArrowRight,
  Sparkles,
  FileText,
  Webhook,
  Languages,
  Clock,
  Code2,
} from 'lucide-react';
import Link from 'next/link';
import { CAPABILITIES, LAUNCH_OFFER } from '@independentai/shared';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Özellikler — AI brand visibility için ihtiyacın olan her şey',
  description:
    '3 AI modelinde paralel sorgu, akıllı marka tespiti, görünürlük skoru, share of voice, 30 günlük trend, rakip karşılaştırması ve daha fazlası — tek panelde.',
  path: '/features',
});

const PILLARS = [
  {
    id: 'tracking',
    eyebrow: 'İzleme',
    title: 'Her gece 3 modelde paralel sorgu',
    body: 'Soruları bir kez yazarsınız, sistem her gece ChatGPT, Claude ve Gemini\'de paralel çalıştırır. İstediğiniz an "şimdi çalıştır" diyerek anında manuel rerun yapabilirsiniz.',
    features: [
      {
        icon: Brain,
        t: '3 model — ChatGPT, Claude, Gemini',
        d: 'OpenAI gpt-4o-mini, Anthropic Claude Haiku 4.5, Google Gemini 2.5 Flash. Perplexity ve Grok yol haritasında (henüz yok).',
      },
      {
        icon: Clock,
        t: 'Günlük otomatik rerun',
        d: 'Her gece ~02:00 (TR, ±1 saat) tüm aktif sorgular yeniden çalıştırılır; birikmiş işler zincirleme tetikleyiciyle tamamlanır. Sabah paneliniz hazır.',
      },
      {
        icon: Zap,
        t: 'Anında manuel çalıştırma',
        d: 'Bir soruyu eklediniz ve sonucu hemen görmek istiyorsunuz? Tek tıkla 3 modeli paralel koşturun, 10-20 saniyede sonuç.',
      },
      {
        icon: Languages,
        t: 'Türkçe içerik için optimize',
        d: 'Modellere Türkçe prompt gönderir, Türkçe metinde marka tespiti yapar. Türkçe karakterler, ek yapıları doğru ele alınır.',
      },
    ],
  },
  {
    id: 'detection',
    eyebrow: 'Tespit',
    title: 'Akıllı marka tespiti — yazımdan bağımsız',
    body: 'Markanızı "Acme", "Acme Corp", "acme.com" veya "AcmeCorp" olarak da yazsa AI cevabında — sistem hepsini yakalar ve aynı marka olarak sayar.',
    features: [
      {
        icon: Eye,
        t: 'Alias matching',
        d: "Onboarding'de tüm alternatif yazımları girin, sistem cevap metninde regex ile arar. Word-boundary kontrolü ile yanlış pozitif yok.",
      },
      {
        icon: Layers,
        t: 'Pozisyon takibi',
        d: 'Cevapta kaçıncı bahsedilen markasınız? 1.sırada olmak listede olmamaktan çok daha kıymetli — pozisyon başlı başına ölçülür.',
      },
      {
        icon: MessagesSquare,
        t: 'Cümle bağlamı',
        d: 'Markanın geçtiği cümlenin etrafındaki ±80 karakterlik bağlam kaydedilir. "Tavsiye edilir" mi "önerilmez" mi — bağlamla görün.',
      },
      {
        icon: Brain,
        t: 'Sentiment analizi',
        d: 'Pozitif / nötr / negatif tonal değerlendirme — LLM destekli sınıflandırma; sağlayıcı anahtarı yoksa yalnızca heuristik. Beta.',
        badge: 'beta',
      },
    ],
  },
  {
    id: 'analytics',
    eyebrow: 'Analiz',
    title: 'Tek bir panel, dört kritik metrik',
    body: 'Tek bakışta görünürlüğünüz nasıl ve hangi yönde gidiyor anlayın. Filtreleyin, karşılaştırın, eyleme dökün.',
    features: [
      {
        icon: TrendingUp,
        t: 'Görünürlük skoru',
        d: 'İzlenen tüm sorgularda markanızın geçtiği oran. 0-100 arasında tek sayı, anlık sağlık göstergesi.',
      },
      {
        icon: GitCompare,
        t: 'Share of Voice',
        d: 'Sizin + rakiplerinizin toplam bahsetme sayısı içindeki yüzdeniz. Kategori pazar payınızın AI versiyonu.',
      },
      {
        icon: BarChart3,
        t: '30 günlük trend',
        d: "Görünürlük ve SoV'un zaman serisi. Geçen hafta ne değişti — net görün, neden değişti — soru sorabilin.",
      },
      {
        icon: Layers,
        t: 'Modele göre dağılım',
        d: "ChatGPT'de %72, Claude'da %68, Gemini'de %45? Hangi modelde zayıfsanız orada konumlanma stratejisi farklılaşır.",
      },
    ],
  },
  {
    id: 'collaboration',
    eyebrow: 'Takım',
    title: 'Çok kullanıcılı — pazarlama ekipleri için',
    body: `Tek bir hesap altında ekip üyelerini e-posta ile davet edin (lansmanda ${LAUNCH_OFFER.fairUse.members} üyeye kadar). Roller ile yetki sınırlandırın.`,
    features: [
      {
        icon: Globe2,
        t: 'Roller: Owner, Admin, Viewer',
        d: 'Owner her şey yapar, Admin içerik ekler/siler, Viewer sadece görür. Pazarlama + satış + danışman ekiplerinde net iş bölümü.',
      },
      {
        icon: Bell,
        t: 'E-posta + Slack uyarıları',
        d: 'Görünürlüğünüz beklenmedik bir şekilde düşerse e-posta ve Slack ile anında haberdar olun. Haftalık özet rapor da aynı kanallardan gider.',
      },
      {
        icon: Code2,
        t: 'Public API',
        d: 'Salt-okunur GET /api/v1/visibility — görünürlük skoru, SoV, trend, rakip ve atıf kaynakları. Token bazlı, 60 istek/dk. Dokümantasyon: /docs/api.',
      },
      {
        icon: FileText,
        t: 'Aylık PDF rapor',
        d: 'Görünürlük, SoV ve rakip değişimini içeren aylık rapor planlanıyor; henüz mevcut değil.',
        badge: 'yakında',
      },
      {
        icon: Webhook,
        t: 'Webhooks',
        d: 'Olay tabanlı bildirimler (düşüş, cron tamamlandı) planlanıyor; şimdilik veriyi Public API ile çekin.',
        badge: 'yakında',
      },
    ],
  },
  {
    id: 'trust',
    eyebrow: 'Güven',
    title: 'Bağımsız, güvenli, Türkiye odaklı',
    body: 'Verileriniz size ait. Hiçbir AI provider ile menfaat ilişkimiz yok — sonuçları olduğu gibi gösteririz.',
    features: [
      {
        icon: ShieldCheck,
        t: 'Bağımsız üçüncü taraf',
        d: 'OpenAI, Anthropic veya Google ile iş ortaklığımız yok. Cevaplar filtrelenmez, taraflı sıralanmaz.',
      },
      {
        icon: Lock,
        t: 'TLS şifreli iletişim',
        d: 'Tüm bağlantılar HTTPS/TLS 1.3. Şifreler scrypt ile hashlenir, JWT tabanlı oturum.',
      },
      {
        icon: Database,
        t: 'PostgreSQL veri tabanı',
        d: 'Verileriniz Supabase Postgres (AB — Frankfurt) üzerinde, günlük otomatik yedekleme ile.',
      },
      {
        icon: ShieldCheck,
        t: 'KVKK uyumlu',
        d: 'KVKK aydınlatma metni, veri işleme sözleşmesi (DPA), veri sahibi hakları formu — hepsi mevcut.',
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Özellikler', href: '/features' },
        ]}
      />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Özellikler</div>
          <h1 className="font-display text-[52px] lg:text-[72px] tracking-tight mt-4 leading-[1.02]">
            AI brand visibility için ihtiyacın olan <span className="text-brand">her şey, tek panelde.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            İzleme, akıllı marka tespiti, analiz ve takım çalışması. Her özellik bir GEO ekibinin gerçek iş akışından
            çıkarıldı — gereksiz şişirme yok, eksik temel yok.
          </p>
        </Container>
      </section>

      {PILLARS.map((p, idx) => (
        <Section
          key={p.id}
          id={p.id}
          eyebrow={p.eyebrow}
          title={p.title}
          intro={p.body}
          className={idx % 2 === 1 ? 'bg-paper-2/40' : ''}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {p.features.map((f) => (
              <div key={f.t} className="card p-6">
                <div className="flex items-center justify-between">
                  <f.icon className="w-5 h-5 text-brand" />
                  {'badge' in f && f.badge ? <span className="chip !text-[10px]">{f.badge}</span> : null}
                </div>
                <h3 className="font-display text-[19px] mt-4 leading-snug">{f.t}</h3>
                <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </Section>
      ))}

      {/* Yol haritası — tek kaynak: CAPABILITIES (status === 'roadmap') */}
      <Section
        eyebrow="Yol haritası"
        title="Planlanıyor — henüz üründe yok."
        intro="Aşağıdakiler yol haritamızda; hiçbiri şu an çalışan bir özellik değil. Sıralama kullanıcı geri bildirimine göre değişebilir."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CAPABILITIES.filter((c) => c.status === 'roadmap').map((r) => (
            <div key={r.key} className="card p-5 border-dashed border-2 border-hairline bg-transparent">
              <div className="eyebrow text-brand-deep">yakında</div>
              <div className="font-display text-[15px] mt-2">{r.label}</div>
              {r.note ? <p className="text-[12.5px] text-ink-muted mt-2 leading-relaxed">{r.note}</p> : null}
            </div>
          ))}
        </div>
        <div className="mt-10 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-brand" />
          <span className="text-[13px] text-ink-muted">Yol haritası kullanıcı geri bildirimi ile şekilleniyor.</span>
          <Link
            href="/contact"
            className="text-[13px] text-brand-deep hover:text-brand inline-flex items-center gap-1.5"
          >
            İstek yolla <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Section>

      <CtaBlock />
    </>
  );
}
