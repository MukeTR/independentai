'use client';

import { useState, useMemo } from 'react';
import { Copy, Download, Sparkles, Check, Bot } from 'lucide-react';

const AI_BOTS = [
  { id: 'gptbot', name: 'GPTBot', desc: 'OpenAI (ChatGPT eğitim)', default: true },
  { id: 'chatgptuser', name: 'ChatGPT-User', desc: 'OpenAI (ChatGPT Browse)', default: true },
  { id: 'oaisearchbot', name: 'OAI-SearchBot', desc: 'OpenAI (SearchGPT)', default: true },
  { id: 'claudebot', name: 'ClaudeBot', desc: 'Anthropic (Claude eğitim)', default: true },
  { id: 'claudeweb', name: 'Claude-Web', desc: 'Anthropic (Claude Browse)', default: true },
  { id: 'perplexity', name: 'PerplexityBot', desc: 'Perplexity AI', default: true },
  { id: 'googleext', name: 'Google-Extended', desc: 'Google (Gemini)', default: true },
  { id: 'bytespider', name: 'Bytespider', desc: 'ByteDance/TikTok AI', default: false },
  { id: 'amazonbot', name: 'Amazonbot', desc: 'Amazon (Alexa+)', default: false },
  { id: 'applebot-extended', name: 'Applebot-Extended', desc: 'Apple Intelligence', default: false },
  { id: 'cohere', name: 'cohere-ai', desc: 'Cohere AI', default: false },
];

const SEARCH_BOTS = [
  { id: 'googlebot', name: 'Googlebot', desc: 'Google arama', default: true },
  { id: 'bingbot', name: 'Bingbot', desc: 'Microsoft Bing', default: true },
  { id: 'yandex', name: 'YandexBot', desc: 'Yandex arama', default: true },
  { id: 'duckduckbot', name: 'DuckDuckBot', desc: 'DuckDuckGo', default: true },
];

const DEFAULT_DISALLOW = ['/admin', '/dashboard', '/api/'];

export function RobotsTxtGenerator() {
  const [aiBotsState, setAiBotsState] = useState<Record<string, boolean>>(
    Object.fromEntries(AI_BOTS.map((b) => [b.id, b.default])),
  );
  const [searchBotsState, setSearchBotsState] = useState<Record<string, boolean>>(
    Object.fromEntries(SEARCH_BOTS.map((b) => [b.id, b.default])),
  );
  const [disallowText, setDisallowText] = useState(DEFAULT_DISALLOW.join('\n'));
  const [sitemapUrl, setSitemapUrl] = useState('https://siteniz.com/sitemap.xml');
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    const lines: string[] = [];

    // Default rule
    lines.push('# robots.txt — Independent AI tarafından üretildi');
    lines.push('# https://independentai.space/blog/llms-txt-rehberi-2026');
    lines.push('');
    lines.push('User-Agent: *');
    lines.push('Allow: /');
    const disallows = disallowText.split('\n').map((s) => s.trim()).filter(Boolean);
    for (const d of disallows) lines.push(`Disallow: ${d}`);
    lines.push('');

    // AI bots
    lines.push('# AI / LLM crawler\'ları');
    for (const bot of AI_BOTS) {
      const allowed = aiBotsState[bot.id];
      lines.push(`User-Agent: ${bot.name}`);
      lines.push(allowed ? 'Allow: /' : 'Disallow: /');
      lines.push('');
    }

    // Search bots — only if any are disabled (default allow)
    const explicitSearch = SEARCH_BOTS.filter((b) => !searchBotsState[b.id]);
    if (explicitSearch.length > 0) {
      lines.push('# Arama motoru bot\'ları (explicit kapalı)');
      for (const bot of explicitSearch) {
        lines.push(`User-Agent: ${bot.name}`);
        lines.push('Disallow: /');
        lines.push('');
      }
    }

    // Sitemap
    if (sitemapUrl.trim()) {
      lines.push(`Sitemap: ${sitemapUrl.trim()}`);
    }

    return lines.join('\n');
  }, [aiBotsState, searchBotsState, disallowText, sitemapUrl]);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function download() {
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robots.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function toggleAll(group: 'ai' | 'search', value: boolean) {
    if (group === 'ai') {
      setAiBotsState(Object.fromEntries(AI_BOTS.map((b) => [b.id, value])));
    } else {
      setSearchBotsState(Object.fromEntries(SEARCH_BOTS.map((b) => [b.id, value])));
    }
  }

  return (
    <div className="not-prose card bg-paper-3 overflow-hidden">
      <div className="px-7 py-5 border-b-hairline border-hairline flex items-center gap-3">
        <Bot className="w-5 h-5 text-brand" />
        <div>
          <div className="font-display text-[18px] tracking-tight">robots.txt Generator</div>
          <div className="text-[11px] text-ink-faint font-mono">AI bot\'ları dahil · GEO uyumlu · sitemap referans\'lı</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-hairline">
        <div className="p-7 space-y-6">
          {/* AI Bots */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="eyebrow">AI / LLM crawler\'ları</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => toggleAll('ai', true)} className="text-[10px] text-brand-deep hover:text-brand font-mono">hepsini aç</button>
                <span className="text-ink-faint">·</span>
                <button type="button" onClick={() => toggleAll('ai', false)} className="text-[10px] text-ink-faint hover:text-ink font-mono">hepsini kapat</button>
              </div>
            </div>
            <div className="space-y-2">
              {AI_BOTS.map((bot) => (
                <label key={bot.id} className="flex items-start gap-3 cursor-pointer hover:bg-paper-2/50 px-2 py-1.5 rounded">
                  <input
                    type="checkbox"
                    checked={aiBotsState[bot.id] ?? false}
                    onChange={(e) => setAiBotsState({ ...aiBotsState, [bot.id]: e.target.checked })}
                    className="mt-1 accent-brand"
                  />
                  <div>
                    <div className="text-[13px] font-mono text-ink">{bot.name}</div>
                    <div className="text-[11px] text-ink-faint">{bot.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Search Bots */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="eyebrow">Arama motoru bot\'ları</label>
              <span className="text-[10px] text-ink-faint font-mono">tikli = izinli</span>
            </div>
            <div className="space-y-2">
              {SEARCH_BOTS.map((bot) => (
                <label key={bot.id} className="flex items-start gap-3 cursor-pointer hover:bg-paper-2/50 px-2 py-1.5 rounded">
                  <input
                    type="checkbox"
                    checked={searchBotsState[bot.id] ?? false}
                    onChange={(e) => setSearchBotsState({ ...searchBotsState, [bot.id]: e.target.checked })}
                    className="mt-1 accent-brand"
                  />
                  <div>
                    <div className="text-[13px] font-mono text-ink">{bot.name}</div>
                    <div className="text-[11px] text-ink-faint">{bot.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Disallow paths */}
          <div>
            <label className="eyebrow block mb-2">Yasaklı yollar (her satırda bir tane)</label>
            <textarea
              rows={4}
              value={disallowText}
              onChange={(e) => setDisallowText(e.target.value)}
              className="input resize-none font-mono text-[12px]"
              placeholder="/admin&#10;/dashboard&#10;/api/"
            />
          </div>

          {/* Sitemap */}
          <div>
            <label className="eyebrow block mb-2">Sitemap URL</label>
            <input
              className="input font-mono text-[12px]"
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
              placeholder="https://siteniz.com/sitemap.xml"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-paper-2/40 flex flex-col">
          <div className="px-7 py-3 border-b-hairline border-hairline flex items-center justify-between">
            <div className="text-[11px] text-ink-faint font-mono">robots.txt · canlı önizleme</div>
            <div className="text-[10px] text-ink-faint">{output.length} karakter</div>
          </div>
          <pre className="flex-1 p-7 text-[12px] font-mono leading-[1.6] text-ink overflow-x-auto whitespace-pre-wrap break-words">
            {output}
          </pre>
          <div className="px-7 py-4 border-t-hairline border-hairline flex items-center gap-3 flex-wrap">
            <button onClick={copyToClipboard} className="btn-primary !py-2 !px-4 inline-flex items-center gap-2 text-[13px]">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Kopyalandı!' : 'Kopyala'}
            </button>
            <button onClick={download} className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2 text-[13px]">
              <Download className="w-3.5 h-3.5" />
              robots.txt indir
            </button>
          </div>
        </div>
      </div>

      <div className="bg-paper-2 px-7 py-5 border-t-hairline border-hairline">
        <div className="flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-brand mt-0.5 shrink-0" />
          <div className="text-[12.5px] text-ink-muted leading-relaxed">
            Dosyayı sitenizin köküne yükleyin: <code className="font-mono text-[11px] bg-paper-4 px-1.5 py-0.5 rounded">https://siteniz.com/robots.txt</code>
            {' '}— GPTBot, ClaudeBot, PerplexityBot gibi AI crawler\'ları explicit allow ederek
            GEO görünürlüğünüzü maksimuma çıkarın.
          </div>
        </div>
      </div>
    </div>
  );
}
