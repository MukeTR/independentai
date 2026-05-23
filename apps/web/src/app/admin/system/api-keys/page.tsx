import Link from 'next/link';
import { ArrowLeft, KeyRound, ShieldCheck, AlertCircle } from 'lucide-react';
import { requireSuperAdmin } from '@/server/admin';
import { listConfigStatus } from '@/server/system-config';
import { ApiKeysForm } from './api-keys-form';

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminApiKeys() {
  await requireSuperAdmin();
  const configs = await listConfigStatus();

  return (
    <div className="max-w-4xl">
      <Link href="/admin/system" className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint hover:text-ink">
        <ArrowLeft className="w-3 h-3" /> Sistem
      </Link>
      <div className="flex items-center gap-3 mt-4">
        <KeyRound className="w-5 h-5 text-brand" />
        <div className="eyebrow">Super Admin</div>
      </div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">AI Provider API Keys</h1>
      <p className="text-[14px] text-ink-muted mt-2 max-w-2xl">
        Platform-wide API key yönetimi. Buradan girilen değerler Vercel env\'ini override eder ve
        tüm tenant\'ların AI sorgularında kullanılır. AES-256-GCM ile şifrelenerek DB\'de saklanır.
      </p>

      {/* Security notice */}
      <div className="card p-5 mt-6 bg-paper-2/60 border-brand/20">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-brand mt-0.5 shrink-0" />
          <div className="text-[12.5px] text-ink-muted leading-relaxed">
            <strong className="text-ink">Güvenlik:</strong> Key\'ler JWT_SECRET\'tan türetilen anahtarla
            AES-256-GCM şifrelenir. JWT_SECRET değişirse mevcut key\'ler decrypt edilemez —
            yeniden girilmesi gerekir. Buraya girilen değerler ekranda asla tam olarak gösterilmez.
          </div>
        </div>
      </div>

      <div className="mt-8">
        <ApiKeysForm initial={configs} />
      </div>

      {/* How AI adapters resolve keys */}
      <div className="card p-6 mt-8">
        <div className="eyebrow mb-3">Key resolution sırası</div>
        <ol className="space-y-2 text-[13px] text-ink-muted list-decimal list-inside">
          <li><strong className="text-ink">DB (buradan)</strong> — varsa öncelikli olarak bu kullanılır.</li>
          <li><strong className="text-ink">Vercel env variable</strong> — DB boşsa fallback.</li>
          <li><strong className="text-ink">Mock mode</strong> — ikisi de yoksa otomatik mock cevaplar.</li>
        </ol>
        <p className="text-[12px] text-ink-faint mt-4 font-mono">
          // Run sırasında hydrateEnvFromConfig() çağrılır, DB değerleri process.env\'e enjekte edilir.
        </p>
      </div>

      {/* Warning if no keys */}
      {configs.every((c) => c.source === 'none') && (
        <div className="card p-5 mt-6 bg-warning/5 border-warning/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <div className="text-[12.5px] text-ink leading-relaxed">
              <strong>Hiçbir AI key tanımlı değil.</strong> Şu an tüm sorgular mock mode\'da çalışıyor —
              gerçek AI cevapları üretilmiyor. En az bir provider için key ekleyin.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
