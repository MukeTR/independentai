import Link from 'next/link';
import { Container } from '@/components/container';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { LAUNCH_OFFER, capability } from '@independentai/shared';
import { ArrowLeft, KeyRound, Gauge, ShieldCheck, Code2, AlertTriangle, Globe2 } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'API Referansı',
  description:
    'Independent AI Public API v1: GET /api/v1/visibility ile görünürlük skoru, Share of Voice, trend, rakip dağılımı ve atıf kaynaklarını salt-okunur olarak çekin. Bearer token, 60 istek/dk.',
  path: '/docs/api',
  noIndex: false,
});

const BASE = 'https://independentai.space';
const ENDPOINT = `${BASE}/api/v1/visibility`;

const NAV = [
  { href: '#overview', t: 'Genel bakış' },
  { href: '#auth', t: 'Kimlik doğrulama' },
  { href: '#endpoint', t: 'GET /api/v1/visibility' },
  { href: '#response', t: 'Yanıt alanları' },
  { href: '#definitions', t: 'Metrik tanımları' },
  { href: '#rate-limit', t: 'Rate limit' },
  { href: '#errors', t: 'Hatalar' },
  { href: '#cors', t: 'CORS' },
  { href: '#security', t: 'Güvenlik' },
  { href: '#examples', t: 'Örnekler' },
];

const RESPONSE_FIELDS: { name: string; type: string; d: string }[] = [
  { name: 'window_days', type: 'number', d: 'İstenen pencere (1–90). Varsayılan 30.' },
  { name: 'generated_at', type: 'string (ISO 8601)', d: 'Yanıtın üretildiği an (UTC).' },
  { name: 'visibility_score', type: 'number (0–100)', d: 'Kendi markanızın geçtiği başarılı run oranı.' },
  { name: 'share_of_voice', type: 'number (0–100)', d: 'Kendi bahisleriniz / (kendi + rakip bahisleri).' },
  { name: 'total_runs', type: 'number', d: 'Penceredeki başarılı (SUCCESS) model çalıştırması sayısı.' },
  { name: 'errored_runs', type: 'number', d: 'Hatalı run sayısı; paydalara dahil edilmez.' },
  { name: 'total_mentions', type: 'number', d: 'Toplam marka bahsi (kendi + rakip).' },
  {
    name: 'trend',
    type: '{ date, visibility }[]',
    d: 'Günlük görünürlük serisi. date: YYYY-MM-DD, visibility: 0–100.',
  },
  {
    name: 'by_provider',
    type: '{ provider, visibility }[]',
    d: 'Sağlayıcıya göre görünürlük (OPENAI, ANTHROPIC, GOOGLE).',
  },
  { name: 'competitors', type: '{ name, count }[]', d: 'Rakip bahis sayıları, çoktan aza.' },
  {
    name: 'top_citation_sources',
    type: '{ domain, count }[]',
    d: 'AI cevaplarında atıf yapılan alan adları (beta: native web arama açıkken atıf, kapalıyken metin içi linkler).',
  },
  {
    name: 'definitions',
    type: '{ visibility_score, share_of_voice }',
    d: 'Metrik tanımlarının makine tarafından okunabilir açıklaması.',
  },
];

const ERROR_CODES: { status: string; code: string; d: string }[] = [
  {
    status: '401',
    code: 'unauthorized',
    d: "Authorization başlığı eksik, biçimi bozuk, token geçersiz, iptal edilmiş veya süresi dolmuş. Token gerekli scope'a sahip değilse de 401 döner.",
  },
  {
    status: '429',
    code: 'rate_limited',
    d: 'Token başına dakikalık limit aşıldı. Retry-After başlığı saniye cinsinden bekleme süresini verir.',
  },
  {
    status: '400',
    code: 'validation_error',
    d: 'Parametre doğrulaması başarısız (details.path hangi alan olduğunu söyler).',
  },
  { status: '400', code: 'bad_request', d: 'Geçersiz istek (ör. bozuk JSON gövdesi).' },
  {
    status: '403',
    code: 'trial_expired',
    d: 'Deneme süresi dolmuş, hesap salt-okunur; API bu durumda da okunur kalır, yazma uçları kapanır.',
  },
  { status: '500', code: 'internal', d: 'Beklenmeyen hata. requestId ile destek ekibine yazın.' },
];

const CURL = `curl -s "${ENDPOINT}?days=30" \\
  -H "Authorization: Bearer iai_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"`;

const EXAMPLE_JSON = `{
  "window_days": 30,
  "generated_at": "2026-09-06T08:12:41.000Z",
  "visibility_score": 62.5,
  "share_of_voice": 41.2,
  "total_runs": 432,
  "errored_runs": 6,
  "total_mentions": 655,
  "trend": [
    { "date": "2026-08-08", "visibility": 58.3 },
    { "date": "2026-08-09", "visibility": 61.1 }
  ],
  "by_provider": [
    { "provider": "OPENAI", "visibility": 71.4 },
    { "provider": "ANTHROPIC", "visibility": 63.9 },
    { "provider": "GOOGLE", "visibility": 52.1 }
  ],
  "competitors": [
    { "name": "Rakip A", "count": 212 },
    { "name": "Rakip B", "count": 173 }
  ],
  "top_citation_sources": [
    { "domain": "wikipedia.org", "count": 48 },
    { "domain": "g2.com", "count": 31 }
  ],
  "definitions": {
    "visibility_score": "own-brand-mentioned SUCCESS runs / SUCCESS runs × 100",
    "share_of_voice": "own mentions / (own + competitor mentions) × 100; errored runs excluded"
  }
}`;

const FETCH = `// Sunucu tarafında çalıştırın (Node 18+, Deno, Bun, edge function).
// Token'ı asla tarayıcıya gönderilen koda gömmeyin.
const res = await fetch('${ENDPOINT}?days=30', {
  headers: { Authorization: \`Bearer \${process.env.IAI_API_TOKEN}\` },
});

if (res.status === 429) {
  const wait = Number(res.headers.get('Retry-After') ?? 60);
  throw new Error(\`Rate limit; \${wait} sn sonra tekrar deneyin\`);
}
if (!res.ok) {
  const err = await res.json(); // { message, code, requestId }
  throw new Error(\`\${err.code}: \${err.message} (\${err.requestId})\`);
}

const data = await res.json();
console.log(data.visibility_score, data.share_of_voice);
console.log('Kalan istek:', res.headers.get('X-RateLimit-Remaining'));`;

const ERROR_JSON = `{
  "message": "Geçersiz veya eksik API token",
  "code": "unauthorized",
  "requestId": "req_7f3c2a91"
}`;

function Code({ children, lang }: { children: string; lang?: string }) {
  return (
    <div className="relative max-w-full">
      {lang ? (
        <span className="absolute top-2 right-3 text-[10px] font-mono text-ink-faint uppercase">{lang}</span>
      ) : null}
      <pre className="font-mono text-[12.5px] leading-relaxed bg-paper-4 rounded-lg p-4 overflow-x-auto whitespace-pre max-w-full">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function H2({ id, icon: Icon, children }: { id: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-display text-[26px] lg:text-[30px] tracking-tight scroll-mt-24 flex items-center gap-3">
      {Icon ? <Icon className="w-5 h-5 text-brand shrink-0" aria-hidden /> : null}
      {children}
    </h2>
  );
}

export default function ApiDocs() {
  const api = capability('api');
  const fair = LAUNCH_OFFER.fairUse;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Dokümantasyon', href: '/docs' },
          { name: 'API Referansı', href: '/docs/api' },
        ]}
      />

      <section className="pt-20 pb-12">
        <Container className="max-w-5xl">
          <Link href="/docs" className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint hover:text-ink">
            <ArrowLeft className="w-3 h-3" aria-hidden /> Dokümantasyon
          </Link>
          <div className="flex items-center gap-3 mt-6 flex-wrap">
            <div className="eyebrow">API Referansı</div>
            <span className="chip own !text-[10px]">v1 · {api.status === 'live' ? 'yayında' : api.status}</span>
            <span className="chip !text-[10px]">salt-okunur</span>
          </div>
          <h1 className="font-display text-[44px] lg:text-[60px] tracking-tight mt-4 leading-[1.02]">
            Public API <span className="text-brand">v1</span>
          </h1>
          <p className="text-[16px] text-ink-muted mt-6 leading-relaxed max-w-2xl">
            Panelde gördüğünüz görünürlük verisini kendi sistemlerinize çekin: görünürlük skoru, Share of Voice, günlük
            trend, sağlayıcı kırılımı, rakip dağılımı ve atıf kaynakları. Tek uç, tek token, 60 istek/dk.
          </p>
        </Container>
      </section>

      <section className="pb-24">
        <Container className="max-w-5xl">
          <div className="grid grid-cols-12 gap-10">
            {/* TOC */}
            <aside className="col-span-12 lg:col-span-3">
              <nav aria-label="Sayfa içi gezinme" className="lg:sticky lg:top-24">
                <div className="eyebrow mb-3">İçindekiler</div>
                <ul className="space-y-1.5">
                  {NAV.map((n) => (
                    <li key={n.href}>
                      <a href={n.href} className="text-[13px] text-ink-muted hover:text-brand-deep transition">
                        {n.t}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            <div className="col-span-12 lg:col-span-9 space-y-14 min-w-0">
              {/* Overview */}
              <div id="overview" className="scroll-mt-24 space-y-4">
                <H2 id="overview-h" icon={Code2}>
                  Genel bakış
                </H2>
                <p className="text-[14.5px] text-ink-muted leading-relaxed">
                  Public API v1 tek bir salt-okunur uç sunar. Yazma (prompt ekleme, rerun tetikleme) API üzerinden
                  yapılamaz; bunlar panelden yürütülür. Webhooks henüz yok —{' '}
                  <Link href="/docs/webhooks" className="text-brand-deep hover:text-brand">
                    planlanıyor
                  </Link>
                  .
                </p>
                <Code lang="http">{`GET ${ENDPOINT}?days=30
Authorization: Bearer iai_live_...`}</Code>
                <ul className="text-[13.5px] text-ink-muted space-y-1.5 list-disc pl-5">
                  <li>
                    <span className="text-ink">Taban URL:</span> <code className="font-mono text-[12.5px]">{BASE}</code>
                  </li>
                  <li>
                    <span className="text-ink">Biçim:</span> JSON (UTF-8). Tüm yanıtlar{' '}
                    <code className="font-mono text-[12.5px]">cache-control: no-store</code> ve{' '}
                    <code className="font-mono text-[12.5px]">x-request-id</code> başlığı taşır.
                  </li>
                  <li>
                    <span className="text-ink">Scope:</span>{' '}
                    <code className="font-mono text-[12.5px]">read:visibility</code> (şu an tek scope).
                  </li>
                  <li>
                    <span className="text-ink">Lansman adil kullanımı:</span> hesap başına {fair.apiTokens} aktif token.
                  </li>
                </ul>
              </div>

              {/* Auth */}
              <div id="auth" className="scroll-mt-24 space-y-4">
                <H2 id="auth-h" icon={KeyRound}>
                  Kimlik doğrulama
                </H2>
                <p className="text-[14.5px] text-ink-muted leading-relaxed">
                  Her istek <code className="font-mono text-[12.5px]">Authorization: Bearer iai_live_…</code> başlığı
                  taşımalıdır. Token, hesabın <span className="text-ink">Owner</span> rolündeki kullanıcısı tarafından
                  panelde{' '}
                  <Link href="/dashboard/api" className="text-brand-deep hover:text-brand font-mono text-[12.5px]">
                    /dashboard/api
                  </Link>{' '}
                  sayfasından oluşturulur.
                </p>
                <ul className="text-[13.5px] text-ink-muted space-y-1.5 list-disc pl-5">
                  <li>
                    Token <span className="text-ink">yalnızca oluşturulduğu anda bir kez</span> gösterilir; sonradan
                    tekrar görüntülenemez. Kaybederseniz yenisini oluşturun.
                  </li>
                  <li>
                    İsteğe bağlı <span className="text-ink">son kullanma süresi</span>: 1–365 gün. Süresi dolan token
                    401 döner.
                  </li>
                  <li>
                    Token istediğiniz an <span className="text-ink">iptal edilebilir</span> (revoke); iptal anında
                    geçersiz olur.
                  </li>
                  <li>
                    Her token tek scope ile gelir: <code className="font-mono text-[12.5px]">read:visibility</code>.
                  </li>
                  <li>
                    Eksik, biçimi bozuk, geçersiz, iptal edilmiş veya süresi dolmuş token →{' '}
                    <code className="font-mono text-[12.5px]">401 unauthorized</code>.
                  </li>
                </ul>
              </div>

              {/* Endpoint */}
              <div id="endpoint" className="scroll-mt-24 space-y-4">
                <H2 id="endpoint-h">GET /api/v1/visibility</H2>
                <p className="text-[14.5px] text-ink-muted leading-relaxed">
                  Hesabınızın (tenant) son <em>N</em> günlük agregat görünürlük verisini döner. Veri, panelin ana
                  sayfasındaki metriklerle birebir aynı hesaplamadan gelir.
                </p>
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-[13px] min-w-[520px]">
                    <thead>
                      <tr className="text-left text-ink-faint font-mono text-[11px] uppercase tracking-wider border-b border-hairline">
                        <th className="py-2 pr-4">Parametre</th>
                        <th className="py-2 pr-4">Tip</th>
                        <th className="py-2 pr-4">Varsayılan</th>
                        <th className="py-2">Açıklama</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-hairline align-top">
                        <td className="py-3 pr-4 font-mono text-[12.5px]">days</td>
                        <td className="py-3 pr-4 text-ink-muted">integer, 1–90</td>
                        <td className="py-3 pr-4 text-ink-muted">30</td>
                        <td className="py-3 text-ink-muted">
                          Pencere uzunluğu (gün). Aralık dışı değerler 1–90'a kırpılır; sayı olmayan değer varsayılana
                          döner.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[13px] text-ink-faint">
                  <code className="font-mono text-[12px]">OPTIONS</code> isteği CORS preflight için 204 döner.
                </p>
              </div>

              {/* Response */}
              <div id="response" className="scroll-mt-24 space-y-4">
                <H2 id="response-h">Yanıt alanları</H2>
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-[13px] min-w-[560px]">
                    <thead>
                      <tr className="text-left text-ink-faint font-mono text-[11px] uppercase tracking-wider border-b border-hairline">
                        <th className="py-2 pr-4">Alan</th>
                        <th className="py-2 pr-4">Tip</th>
                        <th className="py-2">Açıklama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RESPONSE_FIELDS.map((f) => (
                        <tr key={f.name} className="border-b border-hairline align-top">
                          <td className="py-3 pr-4 font-mono text-[12.5px] whitespace-nowrap">{f.name}</td>
                          <td className="py-3 pr-4 text-ink-muted font-mono text-[12px]">{f.type}</td>
                          <td className="py-3 text-ink-muted">{f.d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Definitions */}
              <div id="definitions" className="scroll-mt-24 space-y-4">
                <H2 id="definitions-h">Metrik tanımları</H2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card p-5">
                    <div className="eyebrow">visibility_score</div>
                    <p className="font-mono text-[12.5px] mt-3 leading-relaxed">
                      kendi markanın geçtiği SUCCESS run sayısı
                      <br />÷ toplam SUCCESS run sayısı × 100
                    </p>
                    <p className="text-[13px] text-ink-muted mt-3 leading-relaxed">
                      Bir "run" = bir soru × bir sağlayıcı × bir tarih. Markanız aynı cevapta birden çok kez geçse de o
                      run bir kez sayılır.
                    </p>
                  </div>
                  <div className="card p-5">
                    <div className="eyebrow">share_of_voice</div>
                    <p className="font-mono text-[12.5px] mt-3 leading-relaxed">
                      kendi marka bahisleri
                      <br />÷ (kendi + rakip bahisleri) × 100
                    </p>
                    <p className="text-[13px] text-ink-muted mt-3 leading-relaxed">
                      Bahis (mention) sayımı; aynı cevaptaki tekrarlar ayrı sayılır. Yalnızca panelde tanımlı rakipler
                      hesaba girer.
                    </p>
                  </div>
                </div>
                <p className="text-[13.5px] text-ink-muted leading-relaxed">
                  Hatalı (ERROR) run'lar her iki metrikte de <span className="text-ink">paydaya dahil edilmez</span>;{' '}
                  <code className="font-mono text-[12.5px]">errored_runs</code> alanında ayrıca raporlanır. Paydası
                  sıfır olan pencerelerde skor 0 döner.
                </p>
              </div>

              {/* Rate limit */}
              <div id="rate-limit" className="scroll-mt-24 space-y-4">
                <H2 id="rate-limit-h" icon={Gauge}>
                  Rate limit
                </H2>
                <p className="text-[14.5px] text-ink-muted leading-relaxed">
                  Token başına <span className="text-ink">60 istek / dakika</span> (kayan pencere). Her yanıt şu
                  başlıkları taşır:
                </p>
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-[13px] min-w-[480px]">
                    <tbody>
                      {[
                        ['X-RateLimit-Limit', 'Penceredeki toplam izin (60).'],
                        ['X-RateLimit-Remaining', 'Bu pencerede kalan istek sayısı.'],
                        ['X-RateLimit-Reset', 'Pencerenin sıfırlanacağı an, Unix saniye (UTC).'],
                        ['Retry-After', 'Yalnızca 429 yanıtlarında; kaç saniye bekleneceği.'],
                      ].map(([h, d]) => (
                        <tr key={h} className="border-b border-hairline align-top">
                          <td className="py-3 pr-4 font-mono text-[12.5px] whitespace-nowrap">{h}</td>
                          <td className="py-3 text-ink-muted">{d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[13.5px] text-ink-muted leading-relaxed">
                  Limit aşıldığında <code className="font-mono text-[12.5px]">429 rate_limited</code> döner. Veri gece
                  toplu güncellendiği için dakikada birden fazla çekmenin pratik faydası yoktur; sonuçları kendi
                  tarafınızda önbelleğe alın.
                </p>
              </div>

              {/* Errors */}
              <div id="errors" className="scroll-mt-24 space-y-4">
                <H2 id="errors-h" icon={AlertTriangle}>
                  Hatalar
                </H2>
                <p className="text-[14.5px] text-ink-muted leading-relaxed">
                  Tüm hata yanıtları aynı JSON şemasını kullanır.{' '}
                  <code className="font-mono text-[12.5px]">requestId</code> değerini destek taleplerinde paylaşın;{' '}
                  <code className="font-mono text-[12.5px]">details</code> yalnızca doğrulama hatalarında bulunur.
                </p>
                <Code lang="json">{ERROR_JSON}</Code>
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-[13px] min-w-[520px]">
                    <thead>
                      <tr className="text-left text-ink-faint font-mono text-[11px] uppercase tracking-wider border-b border-hairline">
                        <th className="py-2 pr-4">HTTP</th>
                        <th className="py-2 pr-4">code</th>
                        <th className="py-2">Ne zaman</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ERROR_CODES.map((e) => (
                        <tr key={e.status + e.code} className="border-b border-hairline align-top">
                          <td className="py-3 pr-4 font-mono text-[12.5px]">{e.status}</td>
                          <td className="py-3 pr-4 font-mono text-[12.5px] whitespace-nowrap">{e.code}</td>
                          <td className="py-3 text-ink-muted">{e.d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CORS */}
              <div id="cors" className="scroll-mt-24 space-y-4">
                <H2 id="cors-h" icon={Globe2}>
                  CORS
                </H2>
                <p className="text-[14.5px] text-ink-muted leading-relaxed">
                  <code className="font-mono text-[12.5px]">GET</code> ve{' '}
                  <code className="font-mono text-[12.5px]">OPTIONS</code> için{' '}
                  <code className="font-mono text-[12.5px]">Access-Control-Allow-Origin: *</code> döner; izin verilen
                  başlıklar <code className="font-mono text-[12.5px]">Authorization</code> ve{' '}
                  <code className="font-mono text-[12.5px]">Content-Type</code>. Bu, sunucu tarafı ve edge ortamlarını
                  kolaylaştırmak içindir —{' '}
                  <span className="text-ink">token'ı asla tarayıcıya gönderilen JavaScript'e gömmeyin</span>; herkesin
                  görebileceği bir yerde durur. Ön yüz gösterimleri için veriyi kendi backend'inizden proxy'leyin.
                </p>
              </div>

              {/* Security */}
              <div id="security" className="scroll-mt-24 space-y-4">
                <H2 id="security-h" icon={ShieldCheck}>
                  Güvenlik
                </H2>
                <ul className="text-[13.5px] text-ink-muted space-y-2 list-disc pl-5">
                  <li>
                    Token düz metin olarak saklanmaz; veri tabanında yalnızca{' '}
                    <span className="text-ink">SHA-256 hash</span>'i tutulur. Bu yüzden sonradan görüntülenemez.
                  </li>
                  <li>
                    <span className="text-ink">Rotasyon:</span> yeni bir token oluşturun, entegrasyonu güncelleyin,
                    eskisini iptal edin. Aynı anda birden fazla token aktif olabilir ({fair.apiTokens} adede kadar).
                  </li>
                  <li>
                    Token oluşturma ve iptal işlemleri hesabın{' '}
                    <span className="text-ink">denetim kaydına (audit log)</span> yazılır: kim, ne zaman.
                  </li>
                  <li>
                    Son kullanım zamanı (<code className="font-mono text-[12.5px]">lastUsedAt</code>) panelde görünür;
                    kullanılmayan token'ları iptal edin.
                  </li>
                  <li>
                    Token'ı ortam değişkeninde veya gizli anahtar yöneticisinde tutun; sürüm kontrolüne eklemeyin.
                  </li>
                </ul>
              </div>

              {/* Examples */}
              <div id="examples" className="scroll-mt-24 space-y-6">
                <H2 id="examples-h">Örnekler</H2>
                <div className="space-y-2">
                  <div className="eyebrow">curl</div>
                  <Code lang="bash">{CURL}</Code>
                </div>
                <div className="space-y-2">
                  <div className="eyebrow">Örnek yanıt (200)</div>
                  <Code lang="json">{EXAMPLE_JSON}</Code>
                </div>
                <div className="space-y-2">
                  <div className="eyebrow">JavaScript / TypeScript (sunucu tarafı)</div>
                  <Code lang="ts">{FETCH}</Code>
                </div>
              </div>

              <div className="card p-6 flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <div className="font-display text-[18px] tracking-tight">Token oluşturmaya hazır mısınız?</div>
                  <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">
                    Owner rolüyle panele girin, API sayfasından bir token üretin. Sorularınız için bize yazın.
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Link href="/dashboard/api" className="btn-primary inline-flex items-center gap-2 text-[13.5px]">
                    Panelde token oluştur
                  </Link>
                  <Link href="/contact" className="btn-secondary text-[13.5px]">
                    Destek
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
