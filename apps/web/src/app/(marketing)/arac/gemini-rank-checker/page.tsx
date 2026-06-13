import { RankCheckerPage } from '@/components/marketing/rank-checker-page';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: "Gemini Rank Checker — Markanız Gemini'de görünüyor mu?",
  description:
    "Markanızı ve bir soruyu girin, Google Gemini'de anılıp anılmadığınızı ve sıranızı ücretsiz öğrenin. Kayıt gerekmez.",
  path: '/arac/gemini-rank-checker',
});

export default function Page() {
  return (
    <RankCheckerPage
      provider="GOOGLE"
      label="Gemini"
      accent="#4285F4"
      examplePrompt="İstanbul'da en iyi dijital pazarlama ajansları?"
      path="/arac/gemini-rank-checker"
    />
  );
}
