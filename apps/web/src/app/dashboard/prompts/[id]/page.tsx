import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PROVIDER_LABELS } from '@independentai/shared';
import { requireSession } from '@/server/session';
import { getPromptWithRuns } from '@/server/repo';
import { RunNowButton } from './run-now-button';
import { MarkdownResponse } from '@/components/dashboard/markdown-response';
import { ArrowLeft, Sparkles } from 'lucide-react';

const PROVIDER_ACCENT: Record<string, string> = {
  OPENAI: '#10A37F',
  ANTHROPIC: '#D97706',
  GOOGLE: '#1A73E8',
};

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
      <Link href="/dashboard/prompts" className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint hover:text-ink">
        <ArrowLeft className="w-3 h-3" /> Promptlar
      </Link>
      <div className="eyebrow mt-4">İzlenen soru</div>
      <h1 className="font-display text-[28px] tracking-tight mt-2 leading-snug">{prompt.text}</h1>
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {prompt.category && <span className="chip">{prompt.category}</span>}
        <span className="text-[12px] text-ink-faint font-mono">{prompt.runs.length} çalıştırma kaydı</span>
        <RunNowButton promptId={prompt.id} />
      </div>

      <div className="space-y-5 mt-8">
        {[...latestByProvider.values()].map((run, idx) => {
          const ownMentions = run.mentions.filter((m) => m.isOwnBrand);
          const competitorMentions = run.mentions.filter((m) => m.isCompetitor);
          const accent = PROVIDER_ACCENT[run.provider] ?? 'var(--brand)';

          return (
            <div key={run.id} className={`card overflow-hidden rise-${Math.min(idx + 1, 5)}`}>
              {/* Header with provider accent bar */}
              <div
                className="px-6 py-4 border-b-hairline border-hairline flex items-baseline justify-between gap-4 flex-wrap"
                style={{ borderLeftWidth: 3, borderLeftColor: accent, borderLeftStyle: 'solid' }}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4" style={{ color: accent }} />
                  <div>
                    <div className="font-display text-[17px]">
                      {PROVIDER_LABELS[run.provider as keyof typeof PROVIDER_LABELS]}
                    </div>
                    <div className="font-mono text-[10.5px] text-ink-faint mt-0.5">
                      {run.modelName} · {new Date(run.runDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {run.isMocked && <span className="text-warning"> · mock</span>}
                      {run.latencyMs ? ` · ${run.latencyMs}ms` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {ownMentions.length > 0 ? (
                    ownMentions.map((m, i) => (
                      <span key={i} className="chip own">
                        {m.mentionName} · {m.position}.sırada
                      </span>
                    ))
                  ) : (
                    <span className="chip">marka geçmedi</span>
                  )}
                  {competitorMentions.length > 0 && (
                    <span className="chip comp">{competitorMentions.length} rakip</span>
                  )}
                </div>
              </div>

              {/* Markdown response body */}
              <div className="px-6 py-5 bg-paper-2/40">
                <MarkdownResponse text={run.responseText} mentions={run.mentions} />
              </div>

              {/* Footer: all mentions in order */}
              {run.mentions.length > 0 && (
                <div className="px-6 py-3 border-t-hairline border-hairline bg-paper-3 flex items-center gap-2 flex-wrap">
                  <span className="eyebrow !text-[9px] mr-1">Bahsedilme sırası</span>
                  {run.mentions.map((m, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 text-[10.5px] font-mono px-2 py-0.5 rounded ${
                        m.isOwnBrand
                          ? 'bg-brand/10 text-brand-deep'
                          : m.isCompetitor
                          ? 'bg-paper-4 text-ink-muted'
                          : 'bg-paper-4 text-ink-faint'
                      }`}
                    >
                      <span className="text-ink-faint">{m.position}.</span>
                      {m.mentionName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {prompt.runs.length === 0 && (
          <div className="card p-10 text-center text-ink-muted">
            <p>Henüz çalıştırma yok.</p>
            <p className="text-[12px] mt-2">"Şimdi çalıştır" diyerek hemen test edebilirsiniz.</p>
          </div>
        )}
      </div>

      {/* Insights bar — eğer markanız geçmiyorsa öneri ver */}
      {[...latestByProvider.values()].length > 0 &&
        [...latestByProvider.values()].every((r) => r.mentions.filter((m) => m.isOwnBrand).length === 0) && (
          <div className="card p-6 mt-8 bg-warning/5 border-warning/30">
            <div className="eyebrow text-warning mb-2">İçgörü</div>
            <h3 className="font-display text-[18px]">Markanız bu sorguda hiçbir modelde geçmiyor</h3>
            <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">
              Bu kategoride görünürlük kazanmak için:
            </p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-ink-muted">
              <li>→ <strong className="text-ink">/dashboard/tools/llms-txt</strong> ile markanızı AI bot\'larına tanıtın</li>
              <li>→ <strong className="text-ink">/dashboard/tools/schema</strong> ile structured data ekleyin</li>
              <li>→ Bağımsız sitelerde "X markaları karşılaştırması" tarzı içeriklerde geçmeyi hedefleyin</li>
              <li>→ <Link href="/blog/chatgpt-markanizi-neden-onermiyor" className="text-brand-deep underline">Neden ChatGPT markanızı önermiyor olabilir?</Link></li>
            </ul>
          </div>
        )}
    </div>
  );
}
