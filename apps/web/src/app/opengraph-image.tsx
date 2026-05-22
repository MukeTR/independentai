import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Independent AI — Yapay zekaların gözünden markanız';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#F7F5EF',
          backgroundImage:
            'radial-gradient(circle at 80% 20%, rgba(79,70,229,0.18), transparent 50%), radial-gradient(circle at 20% 90%, rgba(79,70,229,0.10), transparent 50%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              background: '#14110D',
              color: '#F7F5EF',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: -1,
            }}
          >
            iA
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, color: '#14110D', letterSpacing: -0.5 }}>
            Independent <span style={{ color: '#4F46E5' }}>AI</span>
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#9A968B',
            }}
          >
            AI BRAND VISIBILITY · GEO
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 600,
              letterSpacing: -2.5,
              lineHeight: 1.02,
              color: '#14110D',
              marginTop: 18,
              maxWidth: 1000,
            }}
          >
            Yapay zekalar markanızdan{' '}
            <span style={{ color: '#4F46E5' }}>bahsediyor mu?</span>
          </div>
          <div
            style={{
              fontSize: 26,
              color: '#5E5A52',
              marginTop: 24,
              maxWidth: 900,
              lineHeight: 1.4,
            }}
          >
            ChatGPT, Claude ve Gemini cevaplarındaki marka görünürlüğünüzü bağımsız bir gözle ölçün.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 48,
            borderTop: '0.5px solid #DDD9CE',
            paddingTop: 20,
            fontSize: 18,
            color: '#9A968B',
          }}
        >
          <div>independentai.space</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <span style={{ color: '#4F46E5', fontWeight: 500 }}>İlk 6 ay ücretsiz</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
