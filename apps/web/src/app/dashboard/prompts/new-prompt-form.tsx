'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export function NewPromptForm() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/proxy/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), language: 'tr' }),
      });
      setText('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 flex gap-3">
      <input
        className="input"
        placeholder='Örn: "Türkiye\'de en iyi muhasebe yazılımı hangisi?"'
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" disabled={saving || !text.trim()} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
        <Plus className="w-4 h-4" />
        Ekle
      </button>
    </form>
  );
}
