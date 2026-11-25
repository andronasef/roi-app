import type { JSONContent } from '@tiptap/core';
import { NAME_TOKEN } from '@roi/shared';

/**
 * Pure ProseMirror-JSON <-> stored-string serializers (no DOM, no @tiptap/markdown).
 *
 * - 'verse': plain text. One paragraph per line, zero Markdown syntax.
 * - 'rich' : the Markdown subset mobile renders: **bold**, *italic*, ## / ### headings,
 *            "- " bullet lists, "> " blockquotes, "\n\n" paragraphs, "  \n" hard breaks.
 *
 * Inline marks use toggle semantics: a run of N asterisks toggles bold (2) and/or italic (1),
 * so "***x***" is bold+italic and adjacent transitions never become ambiguous.
 */
export type EditorContentMode = 'verse' | 'rich';

const ESCAPABLE = new Set(['\\', '*', '#', '>', '-']);

type Mark = { type: string };

function node(type: string, content: JSONContent[], attrs?: Record<string, unknown>): JSONContent {
  return {
    type,
    ...(attrs ? { attrs } : {}),
    ...(content.length > 0 ? { content } : {}),
  };
}

// ---------------------------------------------------------------- parse

function parseInline(text: string, rich: boolean): JSONContent[] {
  const out: JSONContent[] = [];
  let bold = false;
  let italic = false;
  let buf = '';
  const marks = (): { marks?: Mark[] } => {
    const m: Mark[] = [];
    if (bold) m.push({ type: 'bold' });
    if (italic) m.push({ type: 'italic' });
    return m.length > 0 ? { marks: m } : {};
  };
  const flush = () => {
    if (buf) {
      out.push({ type: 'text', text: buf, ...marks() });
      buf = '';
    }
  };

  let i = 0;
  while (i < text.length) {
    if (text.startsWith(NAME_TOKEN, i)) {
      flush();
      out.push({ type: 'nameToken', ...marks() });
      i += NAME_TOKEN.length;
      continue;
    }
    const ch = text[i]!;
    if (rich && ch === '\\' && i + 1 < text.length && ESCAPABLE.has(text[i + 1]!)) {
      buf += text[i + 1];
      i += 2;
      continue;
    }
    if (rich && ch === '*') {
      let run = 0;
      while (text[i + run] === '*' && run < 3) run += 1;
      flush();
      if (run >= 2) bold = !bold;
      if (run === 1 || run === 3) italic = !italic;
      i += run;
      continue;
    }
    if (rich && ch === '\n') {
      if (/ {2,}$/.test(buf)) {
        buf = buf.replace(/ +$/, '');
        flush();
        out.push({ type: 'hardBreak' });
      } else {
        buf += ' ';
      }
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  flush();
  return out;
}

function parseBlocks(text: string): JSONContent[] {
  const lines = text.split('\n');
  const blocks: JSONContent[] = [];
  const isHeading = (l: string) => /^#{2,3} /.test(l);
  const isSpecial = (l: string) => isHeading(l) || l.startsWith('- ') || l.startsWith('>');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === '') {
      i += 1;
    } else if (isHeading(line)) {
      const level = line.startsWith('###') ? 3 : 2;
      blocks.push(node('heading', parseInline(line.slice(level + 1).trim(), true), { level }));
      i += 1;
    } else if (line.startsWith('- ')) {
      const items: JSONContent[] = [];
      while (i < lines.length && lines[i]!.startsWith('- ')) {
        let item = lines[i]!.slice(2);
        i += 1;
        while (i < lines.length && lines[i]!.startsWith('  ') && lines[i]!.trim() !== '') {
          item += `\n${lines[i]!.slice(2)}`;
          i += 1;
        }
        items.push(node('listItem', [node('paragraph', parseInline(item.trim(), true))]));
      }
      blocks.push(node('bulletList', items));
    } else if (line.startsWith('>')) {
      const inner: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('>')) {
        inner.push(lines[i]!.replace(/^> ?/, ''));
        i += 1;
      }
      blocks.push(node('blockquote', parseBlocks(inner.join('\n'))));
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i]!.trim() !== '' && (para.length === 0 || !isSpecial(lines[i]!))) {
        para.push(lines[i]!);
        i += 1;
      }
      blocks.push(node('paragraph', parseInline(para.join('\n').trim(), true)));
    }
  }
  return blocks;
}

export function parseContentToDoc(raw: string, mode: EditorContentMode): JSONContent {
  const text = (raw ?? '').replace(/\r\n?/g, '\n');
  const content =
    mode === 'verse'
      ? text.split('\n').map((line) => node('paragraph', parseInline(line, false)))
      : parseBlocks(text);
  return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] };
}

// ------------------------------------------------------------ serialize

function serializeInline(nodes: JSONContent[] | undefined, rich: boolean): string {
  let out = '';
  let bold = false;
  let italic = false;
  const setMarks = (b: boolean, i: boolean) => {
    out += '*'.repeat((bold !== b ? 2 : 0) + (italic !== i ? 1 : 0));
    bold = b;
    italic = i;
  };

  for (const child of nodes ?? []) {
    const names = new Set((child.marks ?? []).map((m) => m.type));
    const b = rich && names.has('bold');
    const it = rich && names.has('italic');
    if (child.type === 'hardBreak') {
      setMarks(false, false);
      out += rich ? '  \n' : '\n';
    } else if (child.type === 'nameToken') {
      setMarks(b, it);
      out += NAME_TOKEN;
    } else if (child.type === 'text' && child.text) {
      const escaped = rich ? child.text.replace(/[\\*]/g, '\\$&') : child.text;
      // CommonMark: delimiters cannot touch whitespace, so keep edge whitespace outside the marks.
      const [, lead = '', core = '', trail = ''] = /^(\s*)([\s\S]*?)(\s*)$/.exec(escaped) ?? [];
      if (lead) (setMarks(false, false), (out += lead));
      if (core) (setMarks(b, it), (out += core));
      if (trail) (setMarks(false, false), (out += trail));
    }
  }
  setMarks(false, false);
  return (rich ? out.trimStart() : out).replace(/\s+$/, '');
}

function serializeParagraph(n: JSONContent): string {
  // Escape block-start syntax so literal "# x" / "> x" / "- x" text round-trips as a paragraph.
  return serializeInline(n.content, true).replace(/^(?=#|>|- )/gm, '\\');
}

function serializeBlocks(blocks: JSONContent[] | undefined): string {
  const parts: string[] = [];
  for (const block of blocks ?? []) {
    let text = '';
    if (block.type === 'heading') {
      const level = Number(block.attrs?.level) === 3 ? 3 : 2;
      const inline = serializeInline(block.content, true);
      text = inline ? `${'#'.repeat(level)} ${inline}` : '';
    } else if (block.type === 'bulletList') {
      text = (block.content ?? [])
        .map((item) => {
          const body = (item.content ?? [])
            .map((p) => serializeInline(p.content, true))
            .filter(Boolean)
            .join('  \n');
          return body ? `- ${body.replace(/\n/g, '\n  ')}` : '';
        })
        .filter(Boolean)
        .join('\n');
    } else if (block.type === 'blockquote') {
      text = serializeBlocks(block.content)
        .split('\n')
        .map((l) => (l ? `> ${l}` : '>'))
        .join('\n');
      if (text === '>') text = '';
    } else {
      text = serializeParagraph(block);
    }
    if (text) parts.push(text);
  }
  return parts.join('\n\n');
}

export function serializeDocToContent(doc: JSONContent, mode: EditorContentMode): string {
  if (mode === 'verse') {
    return (doc.content ?? [])
      .map((p) => serializeInline(p.content, false))
      .join('\n')
      .replace(/^\n+|\n+$/g, '');
  }
  return serializeBlocks(doc.content);
}
