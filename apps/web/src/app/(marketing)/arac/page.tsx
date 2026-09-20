import { Suspense } from 'react';
import Link from 'next/link';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { Faq, type FaqItem } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { ToolHub, type HubGroup } from '@/components/marketing/tool-hub';
import { KVKK_SENTENCE } from '@/components/marketing/report-cta-row';
import { buildMetadata } from '@/lib/seo';
import { enabledTools, toolPath, TOOL_GROUP_LABELS, type ToolGroup } from '@/lib/tool-registry';

const PATH = '/arac';

export const metadata = buildMetadata({
  title: 'Ücretsiz site araçları — Siteniz yapay zekâya hazır mı?',
  description:
    'Tek adres girin, ücretsiz araçların hepsi hazır: SEO karnesi, WhatsApp önizleme, güvenlik başlıkları, kırık link, robots/sitemap, hreflang, schema, güven sinyalleri, rakip kıyası, e-ticaret ve AI crawler testleri. Hesap yok, e-posta duvarı yok, yapay zekâ puanlamada kullanılmaz.',
  path: PATH,
});

const GROUP_ORDER: ToolGroup[] = ['site-sagligi', 'ai-gorunurluk', 'paylasim-dil', 'e-ticaret'];

const FAQ: FaqItem[] = [
  {
    question: 'Araçlar gerçekten ücretsiz mi, kayıt gerekiyor mu?',
    answer:
      'Evet, ücretsiz. Hesap açmanız, e-posta bırakmanız veya kart girmeniz gerekmez. Sonuç anında görünür ve 30 gün geçerli kalıcı bir rapor bağlantısı alırsınız.',
  },
  {
    question: 'Skorlar nasıl hesaplanıyor?',
    answer:
      'Her araç deterministik bir tarayıcıyla çalışır: aynı sayfa aynı anda iki kez taranırsa aynı sonucu verir. Eksenler ve ağırlıklar her araç sayfasının "Skor nasıl hesaplanır?" bölümünde açıktır. Yapay zekâ (LLM) puanlamada kullanılmaz; araçlar sitenizin hazırlığını ölçer, yapay zekâ asistanlarının davranışını değil.',
  },
  {
    question: 'Verilerim nereye gidiyor?',
    answer:
      'Yalnızca girdiğiniz herkese açık sayfalar taranır. Ham IP adresiniz saklanmaz; kötüye kullanımı önlemek için geri çevrilemeyen bir özet tutulur. Tarama sonucu 30 gün saklanır ve hiçbir veri yapay zekâ servislerine gönderilmez. Ayrıntı: KVKK aydınlatma metni, "Ücretsiz araçlar ve iletişim formu" bölümü.',
  },
  {
    question: 'Site "bot koruması nedeniyle taranamadı" diyor, ne yapmalıyım?',
    answer:
      'Siteniz otomatik isteklere 403/503 döndürüyor (Cloudflare vb.). Bu bir hata değildir ve skor verilmez. WAF ayarlarında YanıtBot kullanıcı aracısına izin verip yeniden tarayabilirsiniz; bot açıklaması /bot sayfasındadır.',
  },
  {
    question: 'Sonuçları nasıl paylaşırım?',
    answer:
      'Her taramada kalıcı bir rapor bağlantısı üretilir (/rapor/…). Bağlantıyı kopyalayabilir veya WhatsApp’ta paylaşabilirsiniz; açan kişi giriş yapmadan aynı bulguları görür. Rapor 30 gün sonra kapanır.',
  },
];

/** /arac — ücretsiz araç hub'ı. Liste TEK kaynaktan (`TOOL_REGISTRY`, yalnız enabled) türer. */
export default function ToolHubPage() {
  const tools = enabledTools();
  const groups: HubGroup[] = GROUP_ORDER.map((key) => ({
    key,
    label: TOOL_GROUP_LABELS[key],
    tools: tools
      .filter((t) => t.group === key)
      .map((t) => ({
        slug: t.slug,
        path: toolPath(t.slug),
        title: t.title,
        question: t.question,
        description: t.description,
        group: t.group,
        icon: t.icon,
        scans: t.kind !== null,
        badge: t.badge,
      })),
  })).filter((g) => g.tools.length > 0);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Ücretsiz araçlar', href: PATH },
        ]}
      />
      <FaqJsonLd items={FAQ} />

      <Section className="pt-16 lg:pt-24 pb-10">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <div className="chip own !text-[10px] inline-flex">{tools.length} araç · ücretsiz · kayıt gerekmez</div>
            <h1 className="font-display text-[38px] lg:text-[52px] tracking-tight mt-5 leading-[1.05]">
              Siteniz yapay zekâya <span className="text-brand">hazır mı?</span>
            </h1>
            <p className="text-[16px] text-ink-muted mt-5 leading-relaxed">
              Müşteriniz satın almadan önce yapay zekâya soruyor. Bu araçlar sitenizin o cevaplarda görünmeye ne kadar
              hazır olduğunu ölçer, nedenini gösterir ve ne yapacağınızı söyler. Adresi bir kez yazın; her araç aynı
              siteyle açılır.
            </p>
          </div>
          <div className="max-w-4xl mx-auto mt-10">
            <Suspense fallback={<div className="card p-6 text-[13px] text-ink-faint">Araçlar yükleniyor…</div>}>
              {/* INTEGRATE (W5): <ToolHub blockedHint={<BlockedSiteHint … />} /> — yasaklı site ipucu yuvası */}
              <ToolHub groups={groups} />
            </Suspense>
            <p className="text-[12px] text-ink-faint mt-4 text-center">{KVKK_SENTENCE}</p>
          </div>
        </Container>
      </Section>

      <Section className="py-14 bg-paper-2/40">
        <Container>
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                t: 'Deterministik',
                d: 'Aynı sayfa, aynı sonuç. Eksen ağırlıkları her araçta açık; yapay zekâ puanlamada yok.',
              },
              {
                t: 'Kalıcı rapor',
                d: 'Her tarama 30 gün geçerli bir bağlantı üretir; WhatsApp’ta paylaşın, ekibinize gönderin.',
              },
              {
                t: 'Hazırlık ölçer',
                d: 'Araçlar sitenizin hazırlığını ölçer; yapay zekâ asistanlarının ne söylediğini panel ölçer.',
              },
            ].map((x) => (
              <div key={x.t} className="card p-5">
                <div className="font-display text-[16px]">{x.t}</div>
                <p className="text-[13px] text-ink-muted mt-2 leading-relaxed">{x.d}</p>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-ink-muted text-center mt-8">
            Sektörünüze özel kontroller ve satın alma soruları için{' '}
            <Link href="/demo" className="text-brand-deep hover:text-brand underline">
              demo turuna
            </Link>{' '}
            bakın.
          </p>
        </Container>
      </Section>

      <Section className="py-14">
        <Container>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-[26px] tracking-tight mb-6">Sıkça sorulan sorular</h2>
            <Faq items={FAQ} />
          </div>
        </Container>
      </Section>

      <CtaBlock
        eyebrow="Sürekli izleme"
        title={
          <>
            Tek tarama fotoğraf çeker; <span className="text-brand">Yanıt</span> her gün ölçer.
          </>
        }
        body="Panelde markanızın ChatGPT, Claude ve Gemini cevaplarında nasıl anıldığını rakiplerinizle karşılaştırın; düzeltmeleri siz yapın ya da Yanıt Agency yapsın."
        secondaryHref="/contact?src=arac#form"
        secondaryLabel="Bunları biz düzeltelim"
      />
    </>
  );
}
