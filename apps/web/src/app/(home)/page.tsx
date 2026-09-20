import { SoftwareApplicationJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { StoryProvider } from '@/components/landing/story';
import { HeroScan } from '@/components/landing/hero-scan';
import { StoryRail } from '@/components/landing/story-rail';
import { BuyerQuestions } from '@/components/landing/buyer-questions';
import { CeoScreen } from '@/components/landing/ceo-screen';
import { IndexTeaser } from '@/components/landing/index-teaser';
import { AuditWow } from '@/components/landing/audit-wow';
import { ProblemAction } from '@/components/landing/problem-action';
import { TaskBoard } from '@/components/landing/task-board';
import { TwoPaths } from '@/components/landing/two-paths';
import { MethodReveal } from '@/components/landing/method-reveal';
import { CaseStudy } from '@/components/landing/case-study';
import { AiChatDemo } from '@/components/landing/ai-chat-demo';
import { FeatureBento } from '@/components/landing/feature-bento';
import { FinalCta } from '@/components/landing/final-cta';
import { getOffer } from '@/server/offer';
import { formatTry } from '@independentai/shared';

export const metadata = buildMetadata({
  title: 'Müşteriniz yapay zekâya soruyor: sizi mi öneriyor, rakibinizi mi?',
  description:
    'Yanıt, müşterilerinizin satın almadan önce ChatGPT, Gemini ve Claude’a sorduğu sorularda sizi mi rakibinizi mi önerdiğini ölçer; nedenini ve yapılacakları verir. Siz yapın veya Yanıt Agency yapsın.',
  path: '/',
});

/**
 * Landing tek bir hikâyedir: SORU → CEVAP → GÖRÜNMÜYORSUN → NEDEN → YAPILACAKLAR → UYGULA → ÖLÇ → BÜYÜ.
 * Bölüm sırası ürünün çalışma sırasıdır; her bölümde panelin yalnızca ilgili parçası görünür.
 */
export default async function Landing() {
  const offer = await getOffer();
  return (
    <StoryProvider>
      <SoftwareApplicationJsonLd saasMonthlyTry={offer.saasMonthlyTry} trialDays={offer.trialDays} />
      <HeroScan />
      <StoryRail />
      <BuyerQuestions />
      <AuditWow />
      <CeoScreen />
      <ProblemAction />
      <TaskBoard />
      <TwoPaths />
      <MethodReveal />
      <CaseStudy />
      <AiChatDemo />
      <IndexTeaser />
      <FeatureBento />
      <FinalCta trialDays={offer.trialDays} saasMonthlyTry={formatTry(offer.saasMonthlyTry)} />
    </StoryProvider>
  );
}
