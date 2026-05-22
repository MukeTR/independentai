import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { requireSession } from '@/server/session';
import { listPrompts } from '@/server/repo';
import { NewPromptForm } from './new-prompt-form';

export default async function PromptsPage() {
  const session = await requireSession();
  const prompts = await listPrompts(session.tenantId);

  return (
    <div className="max-w-5xl">
      <div className="eyebrow">İzlenen Sorular</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">Promptlar</h1>
      <p className="text-[14px] text-ink-muted mt-2">
        Her gece bu sorular 3 modelde otomatik çalıştırılır.
      </p>

      <div className="mt-8">
        <NewPromptForm />
      </div>

      <div className="mt-8 card divide-y divide-hairline">
        {prompts.length === 0 && (
          <div className="p-10 text-center text-ink-muted">
            <MessageSquare className="w-7 h-7 mx-auto mb-3 text-ink-faint" />
            Henüz izlenen soru eklemediniz.
          </div>
        )}
        {prompts.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/prompts/${p.id}`}
            className="flex items-center justify-between p-5 hover:bg-paper-2 transition group"
          >
            <div className="min-w-0">
              <div className="text-[14px] text-ink truncate">{p.text}</div>
              <div className="flex items-center gap-3 mt-1.5">
                {p.category && <span className="chip">{p.category}</span>}
                <span className="text-[11px] text-ink-faint font-mono">
                  {p._count.runs} çalıştırma
                </span>
                {!p.isActive && <span className="chip comp">pasif</span>}
              </div>
            </div>
            <div className="text-[12px] text-ink-faint group-hover:text-brand transition">Detay →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
