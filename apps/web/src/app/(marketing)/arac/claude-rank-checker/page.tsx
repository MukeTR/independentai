import { RankCheckerPage } from '@/components/marketing/rank-checker-page';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: "Claude Rank Checker — Markanız Claude'da görünüyor mu?",
  description:
    "Markanızı ve bir soruyu girin, Anthropic Claude'da anılıp anılmadığınızı ve sıranızı ücretsiz öğrenin. Kayıt gerekmez.",
  path: '/arac/claude-rank-checker',
});

export default function Page() {
  return (
    <RankCheckerPage
      provider="ANTHROPIC"
      label="Claude"
      accent="#D97757"
      examplePrompt="Küçük işletmeler için en iyi CRM nedir?"
      path="/arac/claude-rank-checker"
    />
  );
}
