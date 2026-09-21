import { ImageResponse } from 'next/og';

// edge runtime'da ImageResponse Vercel'de 0-byte PNG döndürüyordu; nodejs runtime
// next/og için daha güvenilir. force-static ile build'de bir kez üretilir.
export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const alt = 'Yanıt — Yapay zekâ sizi öneriyor mu?';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#FFFFFF',
        backgroundImage: 'radial-gradient(circle at 85% 12%, rgba(37,99,235,0.10), transparent 55%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '64px 72px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#14161C',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            background: '#2563EB',
            color: '#fff',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: -1,
          }}
        >
          Y
        </div>
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>
          <span>Yanıt</span>
          <span style={{ color: '#2563EB' }}>.</span>
        </div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: 3, textTransform: 'uppercase', color: '#798393' }}>
          AI GÖRÜNÜRLÜK · ANALİZ → DÜZELT → ÖLÇ
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            fontSize: 84,
            fontWeight: 600,
            letterSpacing: -2.5,
            lineHeight: 1.02,
            marginTop: 18,
            maxWidth: 1000,
          }}
        >
          <span>Yapay zekâ sizi&nbsp;</span>
          <span style={{ color: '#2563EB' }}>öneriyor mu?</span>
        </div>
        <div style={{ fontSize: 26, color: '#46505F', marginTop: 24, maxWidth: 900, lineHeight: 1.4 }}>
          Neden görünmediğinizi bulun. Düzeltin veya bize bırakın.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 48,
          borderTop: '1px solid #E4E8EE',
          paddingTop: 20,
          fontSize: 18,
          color: '#798393',
        }}
      >
        <div>yanit.io</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <span style={{ color: '#2563EB', fontWeight: 500 }}>Sitenizi ücretsiz analiz edin</span>
        </div>
      </div>
    </div>,
    { ...size },
  );
}
