import { Link2, ExternalLink, Info } from 'lucide-react';
import { requirePageActor } from '@/server/authz';
import { getBacklinkTargets } from '@/server/insights';

export const metadata = { title: 'Backlink Bulucu' };

export default async function BacklinkFinderPage() {
  const session = await requirePageActor();
  const targets = await getBacklinkTargets(session.tenantId);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <Link2 className="w-5 h-5 text-brand" />
        <div className="eyebrow">Otorite</div>
      </div>
      <h1 className="font-display text-[36px] tracking-tight">Backlink Bulucu</h1>
      <p className="text-[15px] text-ink-muted mt-3 max-w-2xl mb-8">
        AI motorlarının sektörünüzdeki sorulara cevap verirken en çok atıf verdiği siteler. Bu sitelerde yer almak
        (içerik, listeleme, inceleme, bahsedilme) AI görünürlüğünüzü doğrudan artırır — en yüksek frekanslılar en
        değerli outreach hedefleriniz.
      </p>

      {targets.length === 0 ? (
        <div className="card p-8 text-center">
          <Info className="w-8 h-8 text-ink-faint mx-auto mb-3" />
          <h3 className="font-display text-[18px]">Henüz atıf verisi yok</h3>
          <p className="text-[13.5px] text-ink-muted mt-2 max-w-md mx-auto">
            Modeller cevaplarında kaynak gösterdikçe (özellikle Gemini ve web-bağlantılı modeller), en çok atıf alan
            siteler burada birikecek. Birkaç günlük çalıştırma sonrası tekrar bakın.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {targets.map((t, i) => (
            <div key={t.domain} className="card p-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-paper-3 flex items-center justify-center font-mono text-[12px] text-ink-muted">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-display text-[15px] flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-ink-faint" />
                    {t.domain}
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    {t.sampleUrls.map((u) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[11.5px] text-ink-faint hover:text-brand-deep truncate max-w-lg"
                      >
                        {u}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-[20px] tabular text-brand">{t.count}</div>
                <div className="text-[10.5px] text-ink-faint">atıf</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
