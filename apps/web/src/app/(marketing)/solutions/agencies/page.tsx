import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  Users,
  Link2,
  ShieldCheck,
  LayoutGrid,
  Share2,
  Lock,
  Check,
  Minus,
  Handshake,
  Sparkles,
} from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { AgencyPreanalysis } from '@/components/marketing/agency-preanalysis';
import { buildMetadata } from '@/lib/seo';
import { computeAgencyEntitlement } from '@/server/entitlement';
import { getOffer } from '@/server/offer';

export const metadata = buildMetadata({
  title: 'Ajanslar için Yanıt — müşteri portföyü ve ortaklık programı',
  description:
    'Müşterilerinizin yapay zekâ görünürlüğünü tek portföyde izleyin: çalışma alanları, ekip rolleri, paylaşılabilir raporlar, ön-analiz.',
  path: '/solutions/agencies',
});

// Tek kaynak: entitlement.ts LAUNCH limitleri (pazarlama metni koddan sapmasın).
const LAUNCH = computeAgencyEntitlement({
  plan: 'LAUNCH',
  trialEndsAt: new Date(Date.now() + 86_400_000),
  seats: 0,
  clients: 0,
});

const PILLARS = [
  {
    icon: LayoutGrid,
    title: 'Tek portföy, müşteri başına çalışma alanı',
    body: 'Her müşteri kendi markası, rakipleri ve sorularıyla ayrı bir alanda ölçülür; portföy ekranı hepsini eşit ağırlıklı ortalama, 7 günlük değişim ve sağlık durumuyla toplar. Bir tıkla müşterinin paneline geçersiniz.',
  },
  {
    icon: Users,
    title: 'Ekip rolleri ve müşteri atamaları',
    body: 'Sahip, Yönetici, Stratejist ve Analist rolleri. Stratejist ve Analist yalnızca atandığı müşterileri görür; müşteri başına rol daraltılabilir (örn. bir müşteride salt-okunur).',
  },
  {
    icon: Link2,
    title: 'Mevcut hesabı onaylı bağlama',
    body: 'Müşteriniz zaten Yanıt kullanıyorsa hesabını devralmazsınız: tek kullanımlık onay linkini hesap sahibi onaylar, veri müşteride kalır, bağlantı istendiği an kesilir.',
  },
  {
    icon: Share2,
    title: 'Salt-okunur rapor paylaşım linkleri',
    body: 'Müşteri veya yönetim için giriş gerektirmeyen görünürlük özeti: son 7/30/90 gün, trend, modele göre kırılım, en iyi sorular ve rakipler. En fazla 90 gün geçerli, anında iptal edilebilir.',
  },
];

const HONEST = [
  { ok: true, text: 'Portföy, roller, atamalar, davetler, paylaşım linkleri: kodda var ve testli.' },
  {
    ok: true,
    text: `Başlangıç planı: ${LAUNCH.limits.seats} koltuk, ${LAUNCH.limits.clients} müşteri, müşteri başına ${LAUNCH.limits.shareLinks} aktif paylaşım linki.`,
  },
  {
    ok: true,
    text: 'Ücretsiz site araçlarını müşteri toplantısında hesap açmadan kullanabilirsiniz; sonuç linki kalıcıdır.',
  },
  { ok: false, text: 'Beyaz etiket henüz YOK: paylaşılan raporlar “Yanıt ile hazırlandı” imzası taşır.' },
  {
    ok: false,
    text: 'Ajans portföyü Yanıt aboneliğiyle çalışır: ücretsiz deneme, kart gerekmez; süre sonunda portföy salt-okunur olur, veri silinmez.',
  },
  { ok: false, text: 'Aylık PDF rapor ve webhook yol haritasında; şu an yok.' },
];

const ROLES = ['Sahip', 'Yönetici', 'Stratejist', 'Analist'] as const;
const MATRIX: { cap: string; v: [boolean, boolean, boolean, boolean] }[] = [
  { cap: 'Portföyü ve atanan müşterileri görme', v: [true, true, true, true] },
  { cap: 'Müşteri panelinde soru/rakip ekleme, ölçüm çalıştırma', v: [true, true, true, false] },
  { cap: 'Rapor paylaşım linki oluşturma/iptal', v: [true, true, true, false] },
  { cap: 'Tüm müşterilere otomatik erişim', v: [true, true, false, false] },
  { cap: 'Müşteri oluşturma, duraklatma, arşivleme', v: [true, true, false, false] },
  { cap: 'Ekip daveti, rol ve atama yönetimi', v: [true, true, false, false] },
  { cap: 'Bağlantı kesme (müşteriyi portföyden çıkarma)', v: [true, false, false, false] },
  { cap: 'Ajans sahipliğini devretme', v: [true, false, false, false] },
  { cap: 'Müşteri hesabını silme / sahipliğini devretme', v: [false, false, false, false] },
];

const PARTNER_STEPS = [
  {
    n: '01',
    t: 'Ajans hesabı açın',
    d: 'Kurulumda “Ajans olarak müşterilerim için” seçin; ilk müşterinizi açın ya da mevcut hesabını onayla bağlayın.',
  },
  {
    n: '02',
    t: 'Ücretsiz araçlarla teklif toplantısı',
    d: 'Müşterinin sitesini toplantıda tarayın; hüküm (“3 kritik, 4 uyarı, 9 tamam”) ve kalıcı rapor linki hazır. E-posta duvarı yok.',
  },
  {
    n: '03',
    t: 'Panelde ölçün, raporu paylaşın',
    d: 'Her müşteri için sorular ve rakipler; haftalık rapor, düşüş uyarıları, imzalı paylaşım linki.',
  },
  {
    n: '04',
    t: 'Uygulamayı isterseniz Yanıt Agency’ye devredin',
    d: 'Teknik düzeltme ve içerik işini kendiniz yapabilir ya da teklifle Yanıt Agency’ye bırakabilirsiniz; ölçüm aynı panelde kalır.',
  },
];

export default async function AgenciesSolutionPage() {
  const offer = await getOffer();
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Çözümler', href: '/solutions' },
          { name: 'Ajanslar', href: '/solutions/agencies' },
        ]}
      />

      <section className="pt-24 pb-12">
        <Container className="max-w-4xl">
          <div className="inline-flex items-center gap-2 chip">
            <Briefcase className="w-3 h-3 text-brand" aria-hidden />
            <span className="font-mono tracking-eyebrow">Ajanslar için · ortaklık programı</span>
          </div>
          <h1 className="font-display text-[44px] lg:text-[64px] tracking-tight mt-5 leading-[1.02]">
            Müşteri portföyünüzü <span className="text-brand">tek panelde</span> ölçün; teklif toplantısına ücretsiz
            araçlarla girin.
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            “Neden ChatGPT bizi önermiyor?” sorusuna veriyle cevap verin. Müşteri başına çalışma alanı, ekip rolleri,
            onaylı hesap bağlama, salt-okunur rapor linkleri ve ortaklık programı. Kart gerekmez.
          </p>
          <div className="mt-9 flex items-center gap-3 flex-wrap">
            <Link href="/register?src=partner" className="btn-primary inline-flex items-center gap-2">
              Ben ajansım <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <a href="#on-analiz" className="btn-secondary">
              3 müşteri için ön-analiz
            </a>
            <span className="text-[12px] text-ink-faint font-mono ml-2">kredi kartı yok · e-posta duvarı yok</span>
          </div>
          <p className="mt-6 text-[14px] text-ink-muted">
            Yanıt Agency’yi mi arıyorsunuz? Uygulama hizmeti ayrı sayfada:{' '}
            <Link href="/yanit-agency" className="text-brand-deep hover:text-brand inline-flex items-center gap-1">
              Yanıt Agency <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </p>
        </Container>
      </section>

      <Section eyebrow="Portal · yayında" title="Ajans modelinin dört parçası." className="py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PILLARS.map((p) => (
            <div key={p.title} className="card p-7">
              <p.icon className="w-6 h-6 text-brand" aria-hidden />
              <h3 className="font-display text-[20px] mt-4 leading-tight">{p.title}</h3>
              <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="on-analiz"
        eyebrow="Ön-analiz"
        title="Üç müşteri alan adı, anında ilk bakış."
        intro="GEO hazırlık skoru (0–100), e-ticaret platformu tespiti ve en kritik 3 bulgu. Yalnızca herkese açık sayfa sinyalleri kullanılır; sonuç kaydedilmez, e-posta istenmez. Yalnızca herkese açık web sitenizi tarıyoruz; kişisel verinizi yapay zekâ servislerine göndermiyoruz."
        className="py-12 lg:py-16 scroll-mt-20"
      >
        <AgencyPreanalysis />
      </Section>

      <Section
        id="ortaklik"
        eyebrow="Ortaklık programı"
        title="Ajans ortaklığı: ölçümü siz satın, raporu siz sunun."
        intro={`Ajanslar Yanıt’ı müşteri kazanımında ve raporlamada kullanır: ${LAUNCH.limits.clients} müşteriye kadar portföy, ${LAUNCH.limits.seats} koltuk, müşteri başına ${LAUNCH.limits.shareLinks} aktif paylaşım linki (limitler plan yetkisinden gelir). Beyaz etiket rapor yol haritasında.`}
        className="py-12 lg:py-16 bg-paper-2/40 scroll-mt-20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {PARTNER_STEPS.map((s) => (
              <div key={s.n} className="card p-6 flex gap-5">
                <div className="font-mono text-[11px] tracking-eyebrow text-brand pt-1">{s.n}</div>
                <div>
                  <h3 className="font-display text-[18px] leading-snug">{s.t}</h3>
                  <p className="text-[14px] text-ink-muted mt-2 leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-5 space-y-4">
            <div className="card p-6">
              <div className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-brand" aria-hidden />
                <div className="font-display text-[18px]">Programda ne var</div>
              </div>
              <ul className="mt-4 space-y-2 text-[14px]">
                {[
                  'Müşteri başına çalışma alanı ve roller (yayında)',
                  'Ücretsiz araçlar ve kalıcı rapor linki (hesap gerekmez)',
                  'İmzalı rapor paylaşım linkleri (yayında)',
                  'Haftalık rapor, düşüş uyarıları (yayında)',
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check className="w-4 h-4 text-positive shrink-0 mt-0.5" aria-hidden /> <span>{t}</span>
                  </li>
                ))}
                {['Beyaz etiket rapor', 'Aylık PDF rapor', 'Webhooks'].map((t) => (
                  <li key={t} className="flex gap-2 text-ink-muted">
                    <Lock className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden />
                    <span>
                      {t} <span className="chip !text-[10px] ml-1">yakında</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-6 grad-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand" aria-hidden />
                <div className="font-display text-[18px]">Uygulama gerekirse</div>
              </div>
              <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">
                Müşteriniz için teknik düzeltme, şema/entity ve içerik işini Yanıt Agency üstlenebilir. Sabit paket
                yoktur: kapsam görüşmesinden sonra teklif verilir. Ölçüm ve rapor sizin panelinizde kalır.
              </p>
              <Link
                href="/yanit-agency#teklif"
                className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] text-brand-deep hover:text-brand"
              >
                Yanıt Agency’yi inceleyin <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 flex items-center gap-3 flex-wrap">
          <Link href="/register?src=partner" className="btn-primary inline-flex items-center gap-2">
            Ben ajansım <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
          <Link href="/contact?src=partner" className="btn-secondary">
            Ortaklık için yazın
          </Link>
        </div>
      </Section>

      <Section
        eyebrow="Roller"
        title="Kim ne yapabilir?"
        intro="Efektif yetki sunucuda hesaplanır: ajans rolü müşteri alanında Owner/Admin/Viewer’a eşlenir; Analist her zaman salt-okunur. Müşteri hesabını silme ve müşteri sahipliğini devretme ajans üzerinden hiçbir rolle yapılamaz."
        className="py-12 lg:py-16"
      >
        <div className="card overflow-x-auto">
          <table className="w-full text-[13.5px] min-w-[640px]">
            <thead>
              <tr className="border-b border-hairline text-left">
                <th className="px-5 py-3 font-medium text-ink-muted">Yetki</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-4 py-3 font-medium text-center">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {MATRIX.map((row) => (
                <tr key={row.cap}>
                  <td className="px-5 py-3">{row.cap}</td>
                  {row.v.map((ok, i) => (
                    <td key={i} className="px-4 py-3 text-center">
                      {ok ? (
                        <Check className="w-4 h-4 text-positive inline" aria-label="evet" />
                      ) : (
                        <Minus className="w-4 h-4 text-ink-faint inline" aria-label="hayır" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        eyebrow="Dürüst kapsam"
        title="Neyin var, neyin yok olduğunu açık yazıyoruz."
        className="py-12 lg:py-16 bg-paper-2/40"
      >
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {HONEST.map((h) => (
            <li key={h.text} className="card p-5 flex gap-3 text-[14px]">
              {h.ok ? (
                <ShieldCheck className="w-5 h-5 text-positive shrink-0" aria-hidden />
              ) : (
                <Lock className="w-5 h-5 text-warning shrink-0" aria-hidden />
              )}
              <span className={h.ok ? 'text-ink' : 'text-ink-muted'}>{h.text}</span>
            </li>
          ))}
        </ul>
        <p className="text-[12.5px] text-ink-faint mt-5 font-mono">
          // Veri sahipliği: bağlanan müşteri hesabı her zaman müşteriye aittir; ajans erişim alır, veriyi taşımaz.
        </p>
      </Section>

      <CtaBlock
        eyebrow="Ajanslar için"
        title={
          <>
            Portföyünüzü bugün kurun; <span className="text-brand">{offer.trialDays} gün ücretsiz deneyin.</span>
          </>
        }
        body={`Kayıt olun, kurulumda “Ajans olarak müşterilerim için” seçin, ilk müşterinizi açın. ${LAUNCH.limits.seats} koltuk ve ${LAUNCH.limits.clients} müşteriye kadar; kart gerekmez. Ortaklık programı ve toplu müşteri için bize yazın.`}
        primaryHref="/register?src=partner"
        primaryLabel="Ben ajansım"
        secondaryHref="/contact?src=partner"
        secondaryLabel="Ortaklık için yazın"
      />
    </>
  );
}
