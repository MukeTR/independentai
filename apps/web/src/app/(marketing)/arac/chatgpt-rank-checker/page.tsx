import { RankCheckerPage } from '@/components/marketing/rank-checker-page';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: "ChatGPT Rank Checker — Markanız ChatGPT'de görünüyor mu?",
  description:
    "Markanızı ve bir soruyu girin, ChatGPT'de anılıp anılmadığınızı ve kaçıncı sırada geçtiğinizi ücretsiz öğrenin. Kayıt gerekmez.",
  path: '/arac/chatgpt-rank-checker',
});

export default function Page() {
  return (
    <RankCheckerPage
      provider="OPENAI"
      label="ChatGPT"
      accent="#10A37F"
      examplePrompt="En iyi muhasebe yazılımı hangisi?"
      path="/arac/chatgpt-rank-checker"
    />
  );
}
