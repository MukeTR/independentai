import Link from 'next/link';
import { ArrowRight, Briefcase, Users, Link2, ShieldCheck, LayoutGrid, Share2, Lock, Check, Minus } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { AgencyPreanalysis } from '@/components/marketing/agency-preanalysis';
import { buildMetadata } from '@/lib/seo';
import { computeAgencyEntitlement } from '@/server/entitlement';

export const metadata = buildMetadata({
  title: 'Ajanslar için AI görünürlük portföyü — çok müşterili panel, roller, paylaşım linkleri',
  description:
    'Müşterilerinizin ChatGPT, Claude ve Gemini görünürlüğünü tek portföyde izleyin: müşteri başına çalışma alanı, ekip rolleri, salt-okunur rapor linkleri. Lansman döneminde ücretsiz. 3 alan adı için anında ön-analiz.',
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
    body: 'Müşteriniz zaten Independent AI kullanıyorsa hesabını devralmazsınız: tek kullanımlık onay linkini hesap sahibi onaylar, veri müşteride kalır, bağlantı istendiği an kesilir.',
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
    text: `Lansman planı: ${LAUNCH.limits.seats} koltuk, ${LAUNCH.limits.clients} müşteri, müşteri başına ${LAUNCH.limits.shareLinks} aktif paylaşım linki.`,
  },
  { ok: false, text: 'Beyaz etiket lansmanda YOK: paylaşılan raporlar "Independent AI ile hazırlandı" imzası taşır.' },
  {
    ok: false,
    text: 'Fiyat yok: lansman döneminde ücretsiz. Ücretli ajans planları duyurulmadı; süre sonunda portföy salt-okunur olur, veri silinmez.',
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

export default function AgenciesSolutionPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Çözümler', href: '/solutions/agencies' },
          { name: 'Ajanslar', href: '/solutions/agencies' },
        ]}
      />

      <section className="pt-24 pb-12">
        <Container className="max-w-4xl">
          <div className="inline-flex items-center gap-2 chip">
            <Briefcase className="w-3 h-3 text-brand" aria-hidden />
            <span className="font-mono tracking-eyebrow">Ajanslar için</span>
          </div>
          <h1 className="font-display text-[48px] lg:text-[64px] tracking-tight mt-5 leading-[1.02]">
            Müşterilerinizin AI görünürlüğünü <span className="text-brand">tek portföyde</span> yönetin.
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            "Neden ChatGPT bizi önermiyor?" sorusuna veriyle cevap verin. Müşteri başına çalışma alanı, ekip rolleri,
            onaylı hesap bağlama ve salt-okunur rapor linkleri — lansman döneminde ücretsiz.
          </p>
          <div className="mt-9 flex items-center gap-3 flex-wrap">
            <Link href="/register" className="btn-primary inline-flex items-center gap-2">
              Ajans hesabı aç <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <a href="#on-analiz" className="btn-secondary">
              3 müşteri için ön-analiz
            </a>
            <span className="text-[12px] text-ink-faint font-mono ml-2">kredi kartı yok · e-posta duvarı yok</span>
          </div>
        </Container>
      </section>

      <Section eyebrow="Ne var" title="Ajans modelinin dört parçası." className="py-12 lg:py-16">
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
        intro="GEO hazırlık skoru (0-100), e-ticaret platformu tespiti ve en kritik 3 bulgu. Yalnızca herkese açık sayfa sinyalleri kullanılır; sonuç kaydedilmez, e-posta istenmez."
        className="py-12 lg:py-16"
      >
        <AgencyPreanalysis />
      </Section>

      <Section
        eyebrow="Roller"
        title="Kim ne yapabilir?"
        intro="Efektif yetki sunucuda hesaplanır: ajans rolü müşteri alanında Owner/Admin/Viewer'a eşlenir; Analist her zaman salt-okunur. Müşteri hesabını silme ve müşteri sahipliğini devretme ajans üzerinden hiçbir rolle yapılamaz."
        className="py-12 lg:py-16"
      >
        <div className="card overflow-x-auto">
          <table className="w-full text-[13.5px]">
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

      <Section eyebrow="Dürüst kapsam" title="Neyin var, neyin yok olduğunu açık yazıyoruz." className="py-12 lg:py-16">
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
        eyebrow="Ajanslar için lansman"
        title={
          <>
            Portföyünüzü bugün kurun; <span className="text-brand">lansman döneminde ücretsiz.</span>
          </>
        }
        body={`Kayıt olun, kurulumda "Ajans olarak müşterilerim için" seçin, ilk müşterinizi açın. ${LAUNCH.limits.seats} koltuk ve ${LAUNCH.limits.clients} müşteriye kadar; fiyatlar duyurulduğunda haber veririz.`}
        primaryLabel="Ajans hesabı aç"
        secondaryHref="/use-cases#agency"
        secondaryLabel="Ajans senaryosunu oku"
      />
    </>
  );
}
