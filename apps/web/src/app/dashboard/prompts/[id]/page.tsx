import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PROVIDER_LABELS } from '@independentai/shared';
import { requireSession } from '@/server/session';
import { getPromptWithRuns } from '@/server/repo';
import { RunNowButton } from './run-now-button';

function highlightMentions(
  text: string,
  mentions: { mentionName: string; isOwnBrand: boolean }[],
): React.ReactNode {
  if (!mentions.length) return text;
  const tokens = mentions.map((m) => ({ name: m.mentionName, isOwn: m.isOwnBrand }));
  const pattern = new RegExp(`(${tokens.map((t) => t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return parts.map((part, i) => {
    const t = tokens.find((x) => x.name.toLowerCase() === part.toLowerCase());
    if (!t) return <span key={i}>{part}</span>;
    return (
      <mark
        key={i}
        className={t.isOwn
          ? 'bg-brand/15 text-brand-deep px-1 rounded font-medium'
          : 'bg-paper-4 text-ink px-1 rounded'}
      >
        {part}
      </mark>
    );
  });
}

export default async function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const prompt = await getPromptWithRuns(session.tenantId, id);
  if (!prompt) notFound();

  const latestByProvider = new Map<string, typeof prompt.runs[number]>();
  for (const r of prompt.runs) {
    if (!latestByProvider.has(r.provider)) latestByProvider.set(r.provider, r);
  }

  return (
    <div className="max-w-5xl">
      <Link href="/dashboard/prompts" className="text-[12px] text-ink-faint hover:text-ink">
        ← Promptlar
      </Link>
      <div className="eyebrow mt-4">İzlenen soru</div>
      <h1 className="font-display text-[28px] tracking-tight mt-2 leading-snug">{prompt.text}</h1>
      <div className="flex items-center gap-3 mt-3">
        {prompt.category && <span className="chip">{prompt.category}</span>}
        <span className="text-[12px] text-ink-faint font-mono">{prompt.runs.length} çalıştırma kaydı</span>
        <RunNowButton promptId={prompt.id} />
      </div>

      <div className="space-y-5 mt-8">
        {[...latestByProvider.values()].map((run) => (
          <div key={run.id} className="card p-6 rise-1">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-display text-[20px]">
                  {PROVIDER_LABELS[run.provider as keyof typeof PROVIDER_LABELS]}
                </div>
                <div className="font-mono text-[11px] text-ink-faint mt-1">
                  {run.modelName} · {new Date(run.runDate).toLocaleDateString('tr-TR')}
                  {run.isMocked && ' · mock'}
                </div>
              </div>
              <div className="flex gap-2">
                {run.mentions.filter((m) => m.isOwnBrand).map((m, i) => (
                  <span key={i} className="chip own">
                    {m.mentionName} · {m.position}.sırada
                  </span>
                ))}
                {run.mentions.filter((m) => m.isCompetitor).length > 0 && (
                  <span className="chip comp">
                    {run.mentions.filter((m) => m.isCompetitor).length} rakip
                  </span>
                )}
                {run.mentions.length === 0 && <span className="chip">marka geçmedi</span>}
              </div>
            </div>

            <div className="mt-5 text-[14.5px] leading-[1.7] text-ink whitespace-pre-wrap border-l-2 border-brand/30 pl-4 bg-paper-2 py-3 rounded-r">
              {highlightMentions(run.responseText, run.mentions)}
            </div>
          </div>
        ))}

        {prompt.runs.length === 0 && (
          <div className="card p-10 text-center text-ink-muted">
            Henüz çalıştırma yok. "Şimdi çalıştır" diyerek hemen test edebilirsiniz.
          </div>
        )}
      </div>
    </div>
  );
}
