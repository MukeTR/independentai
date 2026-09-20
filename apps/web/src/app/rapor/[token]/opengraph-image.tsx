import { ImageResponse } from 'next/og';
import { siteUrl } from '@/server/env';
import { resolveReport, verdictLine } from '@/server/public-report';

/**
 * Rapor OG kartı (1200×630, sistem fontu): hostname, araç adı, skor halkası (renk skora göre), hüküm,
 * "Yanıt ile hazırlandı" ve site alan adı. Kayıtlı sonuçtan çizilir; ağ/LLM yok; `views` artmaz.
 * Önbellek: public, max-age=3600 (WhatsApp/LinkedIn önizleme botları için yeterli; rapor değişmez).
 */
export const runtime = 'nodejs';
export const alt = 'Yanıt — kalıcı site raporu';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const HEADERS = { 'cache-control': 'public, max-age=3600' };

function scoreColor(score: number): string {
  return score >= 70 ? '#10B981' : score >= 45 ? '#F59E0B' : '#E11D48';
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#07080F',
        backgroundImage:
          'radial-gradient(circle at 82% 18%, rgba(139,92,246,0.35), transparent 48%), radial-gradient(circle at 15% 92%, rgba(59,130,246,0.25), transparent 50%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '56px 72px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#F2F3F8',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
              color: '#fff',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 600,
            }}
          >
            Y
          </div>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 600 }}>
            <span>Yanıt</span>
            <span style={{ color: '#8B7CFF' }}>.</span>
          </div>
        </div>
        <div style={{ fontSize: 18, color: '#A3A8BC' }}>Yanıt ile hazırlandı</div>
      </div>
      {children}
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const host = new URL(siteUrl()).host;
  let resolved: Awaited<ReturnType<typeof resolveReport>> = { status: 'missing' };
  try {
    resolved = await resolveReport(token);
  } catch {
    resolved = { status: 'missing' };
  }

  if (resolved.status !== 'ok') {
    return new ImageResponse(
      <Frame>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 60, fontWeight: 600, letterSpacing: -1.5 }}>
            {resolved.status === 'gone' ? 'Raporun süresi doldu' : 'Rapor bulunamadı'}
          </div>
          <div style={{ fontSize: 26, color: '#A3A8BC', marginTop: 16 }}>
            Siteyi ücretsiz yeniden tarayın · {host}/arac
          </div>
        </div>
      </Frame>,
      { ...size, headers: HEADERS },
    );
  }

  const r = resolved.report;
  const score = r.waf ? null : r.score;
  const color = score == null ? '#8A90A8' : scoreColor(score);
  const verdict = r.waf ? 'Bot koruması nedeniyle taranamadı' : verdictLine(r.result.findings);
  const radius = 92;
  const c = 2 * Math.PI * radius;
  const offset = score == null ? c : c - (Math.max(0, Math.min(100, score)) / 100) * c;

  return new ImageResponse(
    <Frame>
      <div style={{ display: 'flex', alignItems: 'center', gap: 56, marginTop: 'auto' }}>
        <div style={{ display: 'flex', width: 240, height: 240, position: 'relative' }}>
          <svg width="240" height="240" viewBox="0 0 240 240" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="120" cy="120" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="18" />
            <circle
              cx="120"
              cy="120"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray={`${c}`}
              strokeDashoffset={`${offset}`}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 240,
              height: 240,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: score == null ? 40 : 72, fontWeight: 700, color, lineHeight: 1 }}>
              {score == null ? '—' : score}
            </div>
            <div style={{ fontSize: 20, color: '#8A90A8', marginTop: 6 }}>/100</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div
            style={{ fontSize: 16, letterSpacing: 3, textTransform: 'uppercase', color: '#8A90A8', fontWeight: 500 }}
          >
            {r.toolTitle}
          </div>
          <div
            style={{ fontSize: r.hostname.length > 28 ? 40 : 56, fontWeight: 600, letterSpacing: -1.5, marginTop: 10 }}
          >
            {r.hostname}
          </div>
          <div style={{ fontSize: 28, color: '#D5D8E4', marginTop: 16 }}>{verdict}</div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 44,
          borderTop: '1px solid rgba(255,255,255,0.12)',
          paddingTop: 18,
          fontSize: 18,
          color: '#8A90A8',
        }}
      >
        <div>{host}</div>
        <div style={{ color: '#A78BFA' }}>Deterministik tarama · hazırlık ölçer, AI davranışını değil</div>
      </div>
    </Frame>,
    { ...size, headers: HEADERS },
  );
}
