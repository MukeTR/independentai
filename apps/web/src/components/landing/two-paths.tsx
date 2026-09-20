import Link from 'next/link';
import { ArrowRight, Check, Clock } from 'lucide-react';
import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';
import { getOffer } from '@/server/offer';
import { capability, formatTry } from '@independentai/shared';
import { AGENCY_ITEMS, SAAS_ITEMS } from './two-paths-data';

/**
 * Adım 5 · İki yol. SaaS listesi capabilities ile sınırlı; Yapılacaklar listesi "yakında".
 * Yanıt Agency bir hizmettir: teklifle, garanti yok, ilerleme aynı panelden izlenir.
 */
export async function TwoPaths() {
  const offer = await getOffer();
  const agencyStatus = (() => {
    try {
      return capability('agency_service').status;
    } catch {
      return null;
    }
  })();
  return (
    <section id="agency" className="py-20 lg:py-28 border-t border-hairline scroll-mt-16">
      <Container>
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <div className="eyebrow text-brand-deep">Adım 5 · Uygula</div>
            <h2 className="font-display text-[34px] lg:text-[48px] tracking-tight mt-3 leading-[1.05]">
              Nasıl ilerlemek istediğinize <span className="accent-text">siz karar verin.</span>
            </h2>
            <p className="text-[16px] lg:text-[18px] text-ink-muted mt-5 leading-relaxed">
              Aynı ölçüm, iki kullanım şekli. Analizi Yanıt yapar; düzeltmeyi siz de yapabilirsiniz, Yanıt Agency de.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Reveal>
            <div className="card p-8 lg:p-10 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="font-display text-[26px]">Yanıt</div>
                <span className="chip !text-[10.5px]">SaaS</span>
              </div>
              <p className="font-display text-[20px] text-ink mt-4">Biz ölçelim. Siz düzeltin.</p>
              <p className="text-[14.5px] text-ink-muted mt-2 leading-relaxed">
                Hangi sorularda yoksunuz, rakibiniz neden var, önce ne düzeltmeli: nedenleriyle görün, ekibiniz
                uygulasın, her sabah yeniden ölçülsün.
              </p>
              <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {SAAS_ITEMS.map((s) => (
                  <li key={s.capability} className="flex items-center gap-2 text-[14px]">
                    <Check className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden /> {s.label}
                  </li>
                ))}
                <li className="flex items-center gap-2 text-[14px] text-ink-muted">
                  <Clock className="w-3.5 h-3.5 text-ink-faint shrink-0" aria-hidden /> Yapılacaklar listesi
                  <span className="chip !text-[9.5px] !py-0 !px-1.5">yakında</span>
                </li>
              </ul>
              <div className="mt-auto pt-9">
                <Link href="/register" className="btn-primary inline-flex items-center gap-2">
                  Yanıt’ı kullan <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
                <span className="block sm:inline text-[12px] text-ink-faint font-mono mt-3 sm:mt-0 sm:ml-3">
                  {formatTry(offer.saasMonthlyTry)}/ay · {offer.trialDays} gün ücretsiz · kart yok
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="card grad-border p-8 lg:p-10 h-full flex flex-col">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="font-display text-[26px]">
                  Yanıt <span className="accent-text">Agency</span>
                </div>
                <span className="flex items-center gap-1.5">
                  <span className="chip own !text-[10.5px]">hizmet · teklifle</span>
                  <span className="chip !text-[10.5px]">{agencyStatus}</span>
                </span>
              </div>
              <p className="font-display text-[20px] text-ink mt-4">Biz ölçelim. Biz düzeltelim.</p>
              <p className="text-[14.5px] text-ink-muted mt-2 leading-relaxed">
                Soyut “GEO çalışması” değil: <span className="text-ink">“31 bulgu, 9’u kritik, bu sprintte 6’sı”</span>{' '}
                <span className="chip !text-[9.5px] !py-0 !px-1.5 align-middle">temsili örnek</span>. Yanıt’ın bulduğu
                listeyi ekibimiz uygular; ilerlemeyi aynı panelden, aynı sorularla izlersiniz.
              </p>
              <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {AGENCY_ITEMS.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-[14px]">
                    <Check className="w-3.5 h-3.5 text-brand shrink-0 mt-1" aria-hidden /> {s}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-9">
                <Link href="/yanit-agency" className="btn-secondary inline-flex items-center gap-2">
                  Yanıt Agency’yi tanıyın <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
                <span className="block sm:inline text-[12px] text-ink-faint font-mono mt-3 sm:mt-0 sm:ml-3">
                  {formatTry(offer.agencyFromMonthlyTry)}/ay’dan · aylık sprint · teklifle · sonuç sözü yok, ölçüm var
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
