import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { requirePageActor } from '@/server/authz';
import { listPrompts } from '@/server/repo';
import { NewPromptForm } from './new-prompt-form';

export const metadata = { title: 'İzlenen Sorular' };

export default async function PromptsPage() {
  const actor = await requirePageActor();
  const prompts = await listPrompts(actor.tenantId);
  const readOnly = actor.role === 'VIEWER' || !actor.entitlement.active;

  return (
    <div className="max-w-5xl">
      <div className="eyebrow">İzlenen Sorular</div>
      <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mt-2">Sorular</h1>
      <p className="text-[14px] text-ink-muted mt-2">Her gece bu sorular 3 modelde otomatik çalıştırılır.</p>
      {readOnly && (
        <p className="text-[12.5px] text-warning mt-3" role="status">
          {actor.role === 'VIEWER'
            ? 'Görüntüleyici rolündesiniz; soru ekleme ve çalıştırma yönetici yetkisi gerektirir.'
            : 'Deneme süresi dolduğu için yeni soru eklenemez ve ölçümler durdu.'}
        </p>
      )}

      <div className="mt-8">
        <NewPromptForm disabled={readOnly} count={prompts.length} limit={actor.entitlement.limits.prompts} />
      </div>

      <ul className="mt-8 card divide-y divide-hairline" aria-label="İzlenen sorular">
        {prompts.length === 0 && (
          <li className="p-10 text-center text-ink-muted">
            <MessageSquare className="w-7 h-7 mx-auto mb-3 text-ink-faint" aria-hidden />
            Henüz izlenen soru eklemediniz.
          </li>
        )}
        {prompts.map((p) => (
          <li key={p.id}>
            <Link
              href={`/dashboard/prompts/${p.id}`}
              className="flex items-center justify-between gap-3 p-4 sm:p-5 hover:bg-paper-2 transition group"
            >
              <div className="min-w-0">
                <div className="text-[14px] text-ink truncate">{p.text}</div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {p.category && <span className="chip">{p.category}</span>}
                  <span className="text-[11px] text-ink-faint font-mono">{p._count.runs} başarılı çalıştırma</span>
                  {!p.isActive && <span className="chip comp">pasif</span>}
                </div>
              </div>
              <div className="text-[12px] text-ink-faint group-hover:text-brand transition shrink-0">Detay →</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
