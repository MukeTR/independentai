'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, ShieldAlert, ShieldCheck, ScanSearch } from 'lucide-react';

type Fact = { id: string; fact: string };
type Hallucination = { modelRunId: string; provider: string; claim: string; correction: string; severity: 'Yüksek' | 'Orta' | 'Düşük' };
type Scan = { needsFacts: boolean; needsLLM: boolean; checked: number; hallucinations: Hallucination[] };

const PROVIDER_LABEL: Record<string, string> = { OPENAI: 'ChatGPT', ANTHROPIC: 'Claude', GOOGLE: 'Gemini' };

export function HallucinationTool() {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [newFact, setNewFact] = useState('');
  const [scan, setScan] = useState<Scan | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetch('/api/brand-facts')
      .then((r) => r.json())
      .then((d) => setFacts(Array.isArray(d) ? d : []))
      .catch(() => setFacts([]));
  }, []);

  async function addFact(e: React.FormEvent) {
    e.preventDefault();
    if (newFact.trim().length < 3) return;
    const res = await fetch('/api/brand-facts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fact: newFact }),
    });
    if (res.ok) {
      setFacts([...facts, await res.json()]);
      setNewFact('');
    }
  }

  async function delFact(id: string) {
    await fetch(`/api/brand-facts?id=${id}`, { method: 'DELETE' });
    setFacts(facts.filter((f) => f.id !== id));
  }

  async function runScan() {
    setScanning(true);
    setScan(null);
    try {
      const res = await fetch('/api/tools/hallucination', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setScan(data);
      } else {
        setScan({ needsFacts: false, needsLLM: false, checked: 0, hallucinations: [] });
      }
    } catch {
      setScan({ needsFacts: false, needsLLM: false, checked: 0, hallucinations: [] });
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Marka gerçekleri */}
      <div className="card p-6">
        <h3 className="font-display text-[16px]">Doğrulanmış Marka Gerçekleri</h3>
        <p className="text-[12.5px] text-ink-muted mt-1">
          AI'ın doğru bilmesi gereken kesin bilgiler — kuruluş yılı, fiyat, özellikler, konum. Bunlarla çelişen cevapları yakalarız.
        </p>
        <form onSubmit={addFact} className="flex gap-2 mt-4">
          <input value={newFact} onChange={(e) => setNewFact(e.target.value)} placeholder='Örn. "2019 yılında İstanbul’da kuruldu"' className="input flex-1" />
          <button type="submit" className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap"><Plus className="w-4 h-4" /> Ekle</button>
        </form>
        <div className="mt-4 space-y-2">
          {facts.length === 0 && <div className="text-[13px] text-ink-faint">Henüz gerçek eklenmedi.</div>}
          {facts.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3.5 py-2.5">
              <span className="text-[13.5px]">{f.fact}</span>
              <button onClick={() => delFact(f.id)} className="text-ink-faint hover:text-danger shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Tarama */}
      <div>
        <button onClick={runScan} disabled={scanning || facts.length === 0} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
          {scanning ? 'Cevaplar taranıyor…' : 'Halüsinasyon taraması başlat'}
        </button>
        {facts.length === 0 && <p className="text-[12px] text-ink-faint mt-2">Önce en az bir marka gerçeği ekleyin.</p>}
      </div>

      {scan && (
        <div>
          {scan.needsLLM ? (
            <Notice tone="warn">Tarama için bir AI sağlayıcı anahtarı (OpenAI/Anthropic/Google) gerekli. Süper admin panelinden ekleyin.</Notice>
          ) : scan.hallucinations.length === 0 ? (
            <div className="card p-6 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-positive shrink-0" />
              <div>
                <div className="font-display text-[15px]">Yanlış bilgi tespit edilmedi</div>
                <p className="text-[13px] text-ink-muted mt-1">{scan.checked} cevap tarandı; markanız hakkında çelişki bulunamadı.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[13px] text-ink-muted">{scan.checked} cevap tarandı · {scan.hallucinations.length} olası yanlış</div>
              {scan.hallucinations.map((h, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-4 h-4 text-danger" />
                    <span className={`text-[10.5px] rounded px-1.5 py-0.5 ${h.severity === 'Yüksek' ? 'bg-danger/10 text-danger' : h.severity === 'Orta' ? 'bg-warning/10 text-warning' : 'bg-paper-3 text-ink-muted'}`}>{h.severity}</span>
                    <span className="text-[11.5px] text-ink-faint">{PROVIDER_LABEL[h.provider] ?? h.provider}</span>
                  </div>
                  <div className="text-[13.5px] text-ink"><span className="text-danger">Yanlış:</span> {h.claim}</div>
                  {h.correction && <div className="text-[13px] text-positive mt-1"><span className="font-medium">Doğrusu:</span> {h.correction}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Notice({ tone, children }: { tone: 'warn'; children: React.ReactNode }) {
  void tone;
  return <div className="text-[13px] text-warning bg-warning/5 border border-warning/20 rounded-lg p-4">{children}</div>;
}
