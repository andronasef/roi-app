import { describe, expect, it } from 'vitest';
import { parseContentToDoc, serializeDocToContent } from '@/lib/markdown-serializer';

const rich = (s: string) => serializeDocToContent(parseContentToDoc(s, 'rich'), 'rich');
const verse = (s: string) => serializeDocToContent(parseContentToDoc(s, 'verse'), 'verse');

describe('rich Markdown subset round-trip', () => {
  const canonical = [
    '**عريض** و *مائل* و ***كلاهما***',
    '## عنوان\n\nيرعاك الرب يا {الاسم} في كل خطوة.',
    '### فرعي\n\n- أول\n- ثاني **مهم**\n- {الاسم}',
    '> اقتباس أول\n>\n> اقتباس ثان',
    'سطر  \nآخر',
    '***a*b**',
    'حرفي \\* و # و \\\\',
    '\\## ليس عنواناً\n\n\\- ليس قائمة\n\n\\> ليس اقتباساً',
    '**{الاسم}**',
    'اللَّهُمَّ بَارِكْ {الاسم}، وَاحْفَظْهُ.',
  ];
  it.each(canonical)('round-trips %j', (s) => {
    expect(rich(s)).toBe(s);
  });

  it('normalizes edge whitespace idempotently', () => {
    expect(rich('*a **b***')).toBe('*a* ***b***');
    expect(rich(rich('*a **b***'))).toBe('*a* ***b***');
  });

  it('collapses consecutive blank lines and empty paragraphs', () => {
    expect(rich('a\n\n\n\n\nb\n\n')).toBe('a\n\nb');
    const doc = { type: 'doc', content: [{ type: 'paragraph' }, { type: 'paragraph', content: [{ type: 'text', text: 'a' }] }, { type: 'paragraph' }] };
    expect(serializeDocToContent(doc, 'rich')).toBe('a');
  });

  it('parses nodes: heading level, name token, marks', () => {
    const doc = parseContentToDoc('### x\n\n**b** {الاسم}', 'rich');
    expect(doc.content![0]).toMatchObject({ type: 'heading', attrs: { level: 3 } });
    const inline = doc.content![1]!.content!;
    expect(inline[0]).toMatchObject({ type: 'text', text: 'b', marks: [{ type: 'bold' }] });
    expect(inline[2]).toEqual({ type: 'nameToken' });
  });

  it('keeps edge whitespace outside marks so CommonMark still bolds', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: ' bold ', marks: [{ type: 'bold' }] }, { type: 'text', text: 'x' }] }],
    };
    expect(serializeDocToContent(doc, 'rich')).toBe('**bold** x');
  });

  it('never emits nbsp or HTML entities', () => {
    const out = rich('a\n\n\n\nb  \n\n## h');
    expect(out).not.toMatch(/&nbsp;|&[a-z]+;|<| /);
  });

  it('empty input yields an empty paragraph doc and empty string', () => {
    expect(parseContentToDoc('', 'rich')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
    expect(rich('')).toBe('');
  });
});

describe('verse plain-text mode', () => {
  it('round-trips lines, blank lines and name chips', () => {
    expect(verse('يرعاك {الاسم}\nسطر ثان\n\nسطر أخير')).toBe('يرعاك {الاسم}\nسطر ثان\n\nسطر أخير');
  });

  it('emits zero Markdown syntax and does not interpret it', () => {
    const doc = parseContentToDoc('## a *b* **c** - d > e', 'verse');
    expect(doc.content![0]!.content).toEqual([{ type: 'text', text: '## a *b* **c** - d > e' }]);
    expect(verse('## a *b* **c**')).toBe('## a *b* **c**');
  });

  it('strips marks, headings and lists from rich docs', () => {
    const doc = parseContentToDoc('## h\n\n**b** *i*', 'rich');
    expect(serializeDocToContent(doc, 'verse')).toBe('h\nb i');
  });

  it('splits {الاسم} into a nameToken node and trims trailing blank paragraphs', () => {
    const doc = parseContentToDoc('أ {الاسم} ب\n\n', 'verse');
    expect(doc.content![0]!.content).toEqual([
      { type: 'text', text: 'أ ' },
      { type: 'nameToken' },
      { type: 'text', text: ' ب' },
    ]);
    expect(serializeDocToContent(doc, 'verse')).toBe('أ {الاسم} ب');
  });
});
