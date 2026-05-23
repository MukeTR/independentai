import React from 'react';

/**
 * Lightweight markdown renderer for AI responses.
 *
 * Desteklenen syntax:
 *   # ## ### #### headings
 *   **bold** ve *italic* (inline)
 *   `inline code`
 *   - / * list items (nested değil)
 *   1. / 2. ordered list
 *   > blockquote
 *   ```code blocks```
 *   --- horizontal rule
 *   Paragraflar (boş satırla ayrılır)
 *
 * Her text segment için brand mention highlight uygulanır.
 */

export type Mention = {
  mentionName: string;
  isOwnBrand: boolean;
  isCompetitor: boolean;
};

type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string }
  | { type: 'hr' };

function parse(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    // Boş satır
    if (trimmed === '') {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(---|\*\*\*|___)\s*$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Code block (fenced)
    const codeFence = trimmed.match(/^```/);
    if (codeFence) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        codeLines.push(lines[i] ?? '');
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: 'code', text: codeLines.join('\n') });
      continue;
    }

    // Heading
    const heading = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (heading) {
      const level = Math.min(heading[1]!.length, 4) as 1 | 2 | 3 | 4;
      blocks.push({ type: 'heading', level, text: heading[2]! });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('>')) {
        quoteLines.push((lines[i] ?? '').replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    // Paragraph — collect until blank line or block start
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i] ?? '';
      const nextTrim = next.trim();
      if (nextTrim === '') break;
      if (/^#{1,4}\s+/.test(nextTrim)) break;
      if (/^[-*]\s+/.test(nextTrim)) break;
      if (/^\d+\.\s+/.test(nextTrim)) break;
      if (nextTrim.startsWith('>')) break;
      if (nextTrim.startsWith('```')) break;
      paraLines.push(next);
      i++;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
  }

  return blocks;
}

/** Inline parse: **bold**, *italic*, `code`, sonra mention highlight. */
function renderInline(text: string, mentions: Mention[]): React.ReactNode {
  // Önce inline kod, sonra bold, sonra italic, sonra mention.
  // Splitleri sırayla uygulayalım, sonunda mention highlight.
  type Segment = { type: 'text' | 'code' | 'bold' | 'italic'; content: string };

  // Step 1: extract inline code spans
  const codeParts: Segment[] = [];
  let remaining = text;
  const codeRegex = /`([^`]+)`/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = codeRegex.exec(text)) !== null) {
    if (m.index > lastIdx) codeParts.push({ type: 'text', content: text.slice(lastIdx, m.index) });
    codeParts.push({ type: 'code', content: m[1]! });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) codeParts.push({ type: 'text', content: text.slice(lastIdx) });

  // Step 2: for each text segment, parse bold/italic
  const segments: Segment[] = [];
  for (const part of codeParts) {
    if (part.type !== 'text') {
      segments.push(part);
      continue;
    }
    // Split by **bold** first, then *italic*
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let bLast = 0;
    let bm: RegExpExecArray | null;
    while ((bm = boldRegex.exec(part.content)) !== null) {
      if (bm.index > bLast) segments.push(...splitItalic(part.content.slice(bLast, bm.index)));
      segments.push({ type: 'bold', content: bm[1]! });
      bLast = bm.index + bm[0].length;
    }
    if (bLast < part.content.length) segments.push(...splitItalic(part.content.slice(bLast)));
  }

  // Step 3: render with mention highlight on text segments
  return segments.map((seg, idx) => {
    if (seg.type === 'code') return <code key={idx} className="font-mono text-[12.5px] bg-paper-4 px-1.5 py-0.5 rounded">{seg.content}</code>;
    if (seg.type === 'bold') return <strong key={idx} className="font-semibold text-ink">{highlightInText(seg.content, mentions)}</strong>;
    if (seg.type === 'italic') return <em key={idx} className="not-italic text-ink-muted">{highlightInText(seg.content, mentions)}</em>;
    return <React.Fragment key={idx}>{highlightInText(seg.content, mentions)}</React.Fragment>;
  });
}

function splitItalic(text: string): { type: 'text' | 'italic'; content: string }[] {
  const out: { type: 'text' | 'italic'; content: string }[] = [];
  const re = /(?<!\*)\*([^*]+)\*(?!\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', content: text.slice(last, m.index) });
    out.push({ type: 'italic', content: m[1]! });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', content: text.slice(last) });
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightInText(text: string, mentions: Mention[]): React.ReactNode {
  if (!mentions.length) return text;
  const tokens = mentions.map((m) => ({ name: m.mentionName, isOwn: m.isOwnBrand }));
  const pattern = new RegExp(`(${tokens.map((t) => escapeRegex(t.name)).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return parts.map((part, i) => {
    const t = tokens.find((x) => x.name.toLowerCase() === part.toLowerCase());
    if (!t) return <React.Fragment key={i}>{part}</React.Fragment>;
    return (
      <mark
        key={i}
        className={t.isOwn
          ? 'bg-brand/15 text-brand-deep px-1 rounded font-medium'
          : 'bg-paper-4 text-ink px-1 rounded'}
      >
        {part}
      </mark>
    );
  });
}

export function MarkdownResponse({ text, mentions }: { text: string; mentions: Mention[] }) {
  const blocks = React.useMemo(() => parse(text), [text]);

  return (
    <div className="space-y-3 text-[14.5px] leading-[1.65] text-ink">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading': {
            const sizes = {
              1: 'text-[22px] font-display tracking-tight mt-5 mb-1',
              2: 'text-[18px] font-display tracking-tight mt-5 mb-1',
              3: 'text-[15px] font-semibold mt-4 mb-1',
              4: 'text-[13.5px] font-semibold text-ink-muted uppercase tracking-wider mt-3 mb-0.5',
            };
            const Tag = (`h${block.level + 1}` as 'h2' | 'h3' | 'h4' | 'h5');
            return (
              <Tag key={i} className={sizes[block.level]}>
                {renderInline(block.text, mentions)}
              </Tag>
            );
          }
          case 'paragraph':
            return (
              <p key={i} className="text-ink-muted">
                {renderInline(block.text, mentions)}
              </p>
            );
          case 'list':
            return block.ordered ? (
              <ol key={i} className="list-decimal pl-6 space-y-1.5 text-ink-muted">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item, mentions)}</li>
                ))}
              </ol>
            ) : (
              <ul key={i} className="space-y-1.5">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-ink-muted">
                    <span className="text-brand mt-1.5 shrink-0 w-1 h-1 rounded-full bg-brand" />
                    <span className="flex-1">{renderInline(item, mentions)}</span>
                  </li>
                ))}
              </ul>
            );
          case 'quote':
            return (
              <blockquote key={i} className="border-l-2 border-brand/40 pl-4 py-1 text-ink-muted">
                {renderInline(block.text, mentions)}
              </blockquote>
            );
          case 'code':
            return (
              <pre key={i} className="bg-paper-4 p-3 rounded text-[12px] font-mono overflow-x-auto whitespace-pre">
                <code>{block.text}</code>
              </pre>
            );
          case 'hr':
            return <hr key={i} className="border-t border-hairline my-4" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
