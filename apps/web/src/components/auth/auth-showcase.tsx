'use client';

import { useEffect, useState } from 'react';
import { Search, Sparkles, BarChart3, Activity, Check, ArrowUpRight } from 'lucide-react';

const PHASE_MS = 2900;

const PHASES = [
  { label: 'Araştırılıyor', title: '3 modelde aranıyor', sub: 'ChatGPT, Claude ve Gemini’ye aynı soru soruluyor.', icon: Search },
  { label: 'Bulunuyor', title: 'Markanız tespit edildi', sub: 'Cevaplardaki yeriniz, sıranız ve tonunuz çıkarılıyor.', icon: Sparkles },
  { label: 'Raporlanıyor', title: 'Skora dönüştürülüyor', sub: 'Görünürlük ve Share of Voice hesaplanıyor.', icon: BarChart3 },
  { label: 'Takip ediliyor', title: 'Her gün otomatik', sub: '30 günlük trend; düşüşte anında uyarı.', icon: Activity },
] as const;

export function AuthShowcase() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), PHASE_MS);
    return () => clearInterval(id);
  }, []);

  const active = PHASES[phase] ?? PHASES[0];

  return (
    <div
      className="relative w-full h-full min-h-screen overflow-hidden flex flex-col justify-between px-12 xl:px-16 py-12 text-white"
      style={{ background: 'linear-gradient(150deg, #14110D 0%, #1e1b4b 48%, #312e81 100%)' }}
    >
      {/* glow + grid */}
      <div className="aurora-bg" aria-hidden style={{ opacity: 0.7 }} />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0 47px, rgba(255,255,255,0.04) 47px 48px), repeating-linear-gradient(90deg, transparent 0 47px, rgba(255,255,255,0.04) 47px 48px)',
          maskImage: 'radial-gradient(circle at 60% 40%, #000, transparent 80%)',
        }}
      />

      {/* top: live pill */}
      <div className="relative z-10 flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="auth-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/70">
          Canlı · AI görünürlük motoru
        </span>
      </div>

      {/* middle: headline + stage */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur">
            <active.icon className="w-5 h-5 text-indigo-200" />
          </span>
          <div>
            <div className="text-[12px] font-mono uppercase tracking-[0.16em] text-indigo-300">{active.label}</div>
            <div className="font-display text-[30px] xl:text-[36px] leading-tight tracking-tight">{active.title}</div>
          </div>
        </div>
        <p className="text-[15px] text-white/60 max-w-md leading-relaxed">{active.sub}</p>

        {/* stage canvas */}
        <div className="relative mt-9 h-[340px] w-full max-w-xl">
          <Scene active={phase === 0}><ResearchScene /></Scene>
          <Scene active={phase === 1}><FoundScene /></Scene>
          <Scene active={phase === 2}><ReportScene /></Scene>
          <Scene active={phase === 3}><TrackScene /></Scene>
        </div>
      </div>

      {/* bottom: stepper */}
      <div className="relative z-10">
        <div className="grid grid-cols-4 gap-3">
          {PHASES.map((p, i) => (
            <div key={p.label}>
              <div className="h-[3px] rounded-full bg-white/12 overflow-hidden">
                {i < phase && <div className="h-full w-full bg-indigo-400" />}
                {i === phase && (
                  <div key={phase} className="auth-progress h-full bg-indigo-400" style={{ ['--dur' as string]: `${PHASE_MS}ms` }} />
                )}
              </div>
              <div className={`mt-2.5 text-[11px] font-mono tracking-wide transition-colors ${i === phase ? 'text-white' : 'text-white/40'}`}>
                {String(i + 1).padStart(2, '0')} {p.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Scene({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 transition-all duration-700 ease-out"
      style={{
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.98)',
        pointerEvents: active ? 'auto' : 'none',
      }}
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}

function Glass({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/12 bg-white/[0.06] backdrop-blur-md p-5 ${className}`}
      style={{ boxShadow: '0 20px 60px -25px rgba(0,0,0,0.6)' }}
    >
      {children}
    </div>
  );
}

const MODELS = [
  { name: 'ChatGPT', c: '#10a37f' },
  { name: 'Claude', c: '#d97757' },
  { name: 'Gemini', c: '#4285f4' },
];

function ResearchScene() {
  return (
    <Glass className="auth-floaty relative overflow-hidden">
      <div className="text-[12px] text-white/50 font-mono">SORU</div>
      <div className="text-[15px] text-white mt-1">“En iyi muhasebe yazılımı hangisi?”</div>

      <div className="relative mt-5 space-y-2.5">
        {/* scanning line */}
        <div
          className="auth-scan absolute left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, #a5b4fc, transparent)' }}
        />
        {MODELS.map((m) => (
          <div key={m.name} className="flex items-center gap-3 rounded-lg bg-white/[0.04] border border-white/8 px-3 py-2.5">
            <span className="w-2 h-2 rounded-full" style={{ background: m.c }} />
            <span className="text-[13px] text-white/85 flex-1">{m.name}</span>
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/25 border-t-indigo-300 auth-spin" />
          </div>
        ))}
      </div>
    </Glass>
  );
}

const FOUND = [
  { name: 'Markanız', pos: '1.', own: true },
  { name: 'Rakip A', pos: '2.', own: false },
  { name: 'Rakip B', pos: '4.', own: false },
];

function FoundScene() {
  return (
    <Glass className="auth-floaty">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-white/50 font-mono">TESPİT EDİLEN MARKALAR</div>
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
          <Check className="w-3.5 h-3.5" /> 3 bahsetme
        </span>
      </div>
      <div className="mt-4 space-y-2.5">
        {FOUND.map((f, i) => (
          <div
            key={f.name}
            className="auth-pop flex items-center gap-3 rounded-lg px-3 py-2.5 border"
            style={{
              animationDelay: `${i * 250}ms`,
              background: f.own ? 'rgba(129,140,248,0.18)' : 'rgba(255,255,255,0.04)',
              borderColor: f.own ? 'rgba(165,180,252,0.4)' : 'rgba(255,255,255,0.08)',
            }}
          >
            <span className={`text-[12px] font-mono w-6 ${f.own ? 'text-indigo-200' : 'text-white/40'}`}>{f.pos}</span>
            <span className={`text-[13.5px] flex-1 ${f.own ? 'text-white font-medium' : 'text-white/80'}`}>{f.name}</span>
            {f.own && <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-200">siz</span>}
          </div>
        ))}
      </div>
    </Glass>
  );
}

const BARS = [40, 62, 48, 78, 66, 88];

function ReportScene() {
  return (
    <Glass className="auth-floaty">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[12px] text-white/50 font-mono">GÖRÜNÜRLÜK SKORU</div>
          <div className="font-display text-[44px] leading-none mt-1 text-white tabular">87</div>
          <div className="inline-flex items-center gap-1 text-[12px] text-emerald-300 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5" /> +14 bu hafta
          </div>
        </div>
        {/* score ring */}
        <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
          <circle
            cx="40" cy="40" r="34" fill="none" stroke="#818cf8" strokeWidth="7" strokeLinecap="round"
            className="auth-draw" style={{ ['--len' as string]: '214', strokeDashoffset: 28 }}
          />
        </svg>
      </div>

      <div className="mt-5 flex items-end gap-2.5 h-20">
        {BARS.map((h, i) => (
          <div
            key={i}
            className="auth-bar flex-1 rounded-t-md"
            style={{
              height: `${h}%`,
              animationDelay: `${i * 90}ms`,
              background: 'linear-gradient(180deg, #a5b4fc, #6366f1)',
            }}
          />
        ))}
      </div>
    </Glass>
  );
}

function TrackScene() {
  // 30 günlük yukarı trend
  const pts = [6, 18, 12, 30, 24, 40, 34, 52, 60, 78];
  const last = pts[pts.length - 1] ?? 0;
  const w = 460, h = 120;
  const path = pts
    .map((p, i) => `${(i / (pts.length - 1)) * w},${h - (p / 90) * h}`)
    .map((c, i) => (i === 0 ? `M ${c}` : `L ${c}`))
    .join(' ');

  return (
    <Glass className="auth-floaty">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-white/50 font-mono">30 GÜNLÜK TREND</div>
        <span className="text-[11px] font-mono text-indigo-200 border border-indigo-300/30 rounded-full px-2.5 py-1">
          her gece 02:00 · otomatik
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[120px] mt-4 overflow-visible">
        <defs>
          <linearGradient id="authTrend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(129,140,248,0.35)" />
            <stop offset="100%" stopColor="rgba(129,140,248,0)" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${w},${h} L 0,${h} Z`} fill="url(#authTrend)" opacity="0.7" />
        <path d={path} fill="none" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="auth-draw" style={{ ['--len' as string]: '620' }} />
        <circle cx={w} cy={h - (last / 90) * h} r="4" fill="#fff" />
      </svg>
      <div className="flex items-center justify-between text-[11px] text-white/40 font-mono mt-1">
        <span>1 Haz</span><span>15 Haz</span><span>Bugün</span>
      </div>
    </Glass>
  );
}
