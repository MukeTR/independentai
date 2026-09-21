import { Code2 } from 'lucide-react';
import { requirePageActor } from '@/server/authz';
import { ApiTokensManager } from '@/components/dashboard/api-tokens-manager';

export const metadata = { title: 'API Erişimi' };

export default async function ApiPage() {
  const actor = await requirePageActor();
  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <Code2 className="w-5 h-5 text-brand" aria-hidden />
        <div className="eyebrow">Geliştirici</div>
      </div>
      <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight">API Erişimi</h1>
      <p className="text-[15px] text-ink-muted mt-3 max-w-2xl mb-8">
        Görünürlük verinize programatik erişin. API token oluşturun, kendi panellerinize veya otomasyonlarınıza (Zapier,
        n8n, BI araçları) bağlayın. API salt-okunurdur.
      </p>
      <ApiTokensManager isOwner={actor.role === 'OWNER'} limit={actor.entitlement.limits.apiTokens} />
    </div>
  );
}
