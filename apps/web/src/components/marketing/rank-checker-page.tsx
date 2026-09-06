import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { RankChecker } from '@/components/marketing/rank-checker';
import { BreadcrumbJsonLd } from '@/components/json-ld';

type Provider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE';

/**
 * Sağlayıcıya özgü içerik — 3 araç sayfasının near-duplicate olmasını önler.
 * Her model markaları farklı kaynaklardan ve farklı mantıkla anar; bu gerçek
 * farklılaşma hem kullanıcıya değer katar hem de Google'ın "templated/duplicate"
 * sinyalini engeller.
 */
const PROVIDER_NOTES: Record<Provider, { how: string; tips: string[] }> = {
  OPENAI: {
    how: 'ChatGPT, markaları büyük ölçüde eğitim verisindeki yaygınlığa ve (web arama açıkken) Bing kaynaklı güncel sonuçlara göre anar. Bir markanın forumlarda, incelemelerde ve yapılandırılmış içerikte ne kadar geçtiği doğrudan etkiler.',
    tips: [
      'Reddit ve sektör forumlarındaki organik bahsedilmeleri artırın — ChatGPT bunlara ağırlık verir.',
      'Karşılaştırma ve "en iyi X" listelerinde yer alın; ChatGPT bu formatları özetlemeyi sever.',
      "Bing Webmaster Tools üzerinden indekslenmenizi hızlandırın (web arama Bing'i kullanır).",
    ],
  },
  ANTHROPIC: {
    how: 'Claude, kaynak güvenilirliğine ve içeriğin tutarlı/doğrulanabilir olmasına diğer modellerden daha duyarlıdır. Abartılı pazarlama dilinden çok, net ve kanıta dayalı içerikten markaları çıkarır.',
    tips: [
      'Net, iddiasız ve kanıtlanabilir ürün açıklamaları yazın — Claude "marketing fluff"u eler.',
      'Bağımsız incelemeler ve üçüncü taraf doğrulamaları (case study, veri) Claude için güçlü sinyaldir.',
      'llms.txt ve yapılandırılmış içerikle markanızı makine-okunur hale getirin.',
    ],
  },
  GOOGLE: {
    how: 'Gemini, Google arama altyapısı ve Knowledge Graph ile en sıkı entegre modeldir. Markanın entity olarak tanınması (Knowledge Panel, tutarlı NAP, schema.org) görünürlüğü doğrudan belirler.',
    tips: [
      'Organization schema.org işaretlemesi ve tutarlı marka bilgisi (NAP) ekleyin.',
      "Google'da güçlü organik sıralama, Gemini görünürlüğünüzü besler — klasik SEO hâlâ önemli.",
      'Wikidata/Wikipedia ve güvenilir dizinlerde entity sinyallerinizi güçlendirin.',
    ],
  },
};

export function RankCheckerPage({
  provider,
  label,
  accent,
  examplePrompt,
  path,
}: {
  provider: Provider;
  label: string;
  accent: string;
  examplePrompt: string;
  path: string;
}) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: `${label} Rank Checker`, href: path },
        ]}
      />
      <Section className="pt-16 lg:pt-24">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <div className="chip own !text-[10px] inline-flex">Ücretsiz · kayıt gerekmez</div>
            <h1 className="font-display text-[40px] lg:text-[52px] tracking-tight mt-5 leading-[1.05]">
              Markanız <span style={{ color: accent }}>{label}</span>'de görünüyor mu?
            </h1>
            <p className="text-[16px] text-ink-muted mt-5">
              Markanızı ve müşterilerinizin sorabileceği bir soruyu girin. {label}'e gerçek zamanlı soralım, markanızın
              anılıp anılmadığını, kaçıncı sırada geçtiğini ve yerine kimlerin önerildiğini gösterelim.
            </p>
          </div>

          <div className="max-w-xl mx-auto mt-10">
            <RankChecker provider={provider} label={label} accent={accent} examplePrompt={examplePrompt} />
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-[26px] tracking-tight">Neden {label} görünürlüğü önemli?</h2>
            <p className="text-[15px] text-ink-muted mt-4 leading-relaxed">
              Kullanıcılar artık ürün ve hizmet ararken Google yerine doğrudan {label} gibi yapay zeka asistanlarına
              soruyor. {label} bir soruya cevap verirken hangi markaları andığını siz seçmiyorsunuz — bu, içeriğinizin
              yapısına, otoritenize ve AI'ın sizi ne kadar "anlayabildiğine" bağlı. Bu ücretsiz araç anlık bir fotoğraf
              verir; ama görünürlük zamanla ve modeller arası değişir.
            </p>
            <p className="text-[15px] text-ink-muted mt-4 leading-relaxed">
              Independent AI bu fotoğrafı sürekli çeker: ChatGPT, Claude ve Gemini'de günlük takip, rakip
              karşılaştırması, sentiment ve trend analizi. Eksik kaldığınız soruları ve hangi kaynaklara atıf
              verildiğini gösterir; GEO Audit ile sayfanızı puanlar. İlk 6 ay tüm kullanıcılara ücretsiz.
            </p>

            <h3 className="font-display text-[20px] tracking-tight mt-10">{label} markaları nasıl seçiyor?</h3>
            <p className="text-[15px] text-ink-muted mt-3 leading-relaxed">{PROVIDER_NOTES[provider].how}</p>

            <h3 className="font-display text-[20px] tracking-tight mt-8">{label}'de görünürlük için 3 ipucu</h3>
            <ul className="mt-3 space-y-2.5">
              {PROVIDER_NOTES[provider].tips.map((tip, i) => (
                <li key={i} className="flex gap-3 text-[15px] text-ink-muted leading-relaxed">
                  <span className="shrink-0 font-mono text-[12px] mt-1" style={{ color: accent }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>
    </>
  );
}
