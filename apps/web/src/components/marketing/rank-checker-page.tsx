import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { RankChecker } from '@/components/marketing/rank-checker';
import { BreadcrumbJsonLd } from '@/components/json-ld';

type Provider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE';

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
      <BreadcrumbJsonLd items={[{ name: 'Ana sayfa', href: '/' }, { name: `${label} Rank Checker`, href: path }]} />
      <Section className="pt-16 lg:pt-24">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <div className="chip own !text-[10px] inline-flex">Ücretsiz · kayıt gerekmez</div>
            <h1 className="font-display text-[40px] lg:text-[52px] tracking-tight mt-5 leading-[1.05]">
              Markanız <span style={{ color: accent }}>{label}</span>'de görünüyor mu?
            </h1>
            <p className="text-[16px] text-ink-muted mt-5">
              Markanızı ve müşterilerinizin sorabileceği bir soruyu girin. {label}'e gerçek zamanlı soralım,
              markanızın anılıp anılmadığını, kaçıncı sırada geçtiğini ve yerine kimlerin önerildiğini gösterelim.
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
              Independent AI bu fotoğrafı sürekli çeker: ChatGPT, Claude ve Gemini'de günlük takip, rakip karşılaştırması,
              sentiment ve trend analizi. Eksik kaldığınız soruları ve hangi kaynaklara atıf verildiğini gösterir;
              GEO Audit ile sayfanızı puanlar. İlk 6 ay tüm kullanıcılara ücretsiz.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
