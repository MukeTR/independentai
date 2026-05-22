import { Container } from '@/components/container';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Çerez Politikası',
  description: 'Independent AI çerez kullanımı ve tarayıcı saklama politikası.',
  path: '/legal/cookies',
});

export default function Cookies() {
  return (
    <article className="py-24">
      <Container className="max-w-3xl">
        <div className="eyebrow">Yasal</div>
        <h1 className="font-display text-[48px] tracking-tight mt-3 mb-4">Çerez Politikası</h1>
        <p className="text-[12px] text-ink-faint font-mono mb-12">Son güncelleme: 2026-05-22</p>

        <div className="space-y-8 text-[15px] leading-[1.7] text-ink">
          <p className="text-ink-muted">
            Independent AI yalnızca <strong>kullanım için zorunlu</strong> çerezler kullanır. Reklam, takip veya
            üçüncü taraf analitik çerezleri yoktur.
          </p>

          <section>
            <h2 className="font-display text-[22px] tracking-tight mb-3">Kullandığımız çerezler</h2>
            <div className="card overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-paper-2 text-left text-[11px] uppercase tracking-wider text-ink-faint">
                  <tr>
                    <th className="px-4 py-2.5">Çerez</th>
                    <th className="px-4 py-2.5">Amaç</th>
                    <th className="px-4 py-2.5">Süre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  <tr><td className="px-4 py-2.5 font-mono text-[12px]">iai_token</td><td className="px-4 py-2.5">Oturum yönetimi (JWT)</td><td className="px-4 py-2.5">30 gün</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-ink-muted">
            Çerezi silerseniz hesabınızdan çıkış yapmış sayılırsınız. Geri giriş yapmanız gerekir.
          </p>
        </div>
      </Container>
    </article>
  );
}
