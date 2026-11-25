import { Fragment, useState, type ReactNode } from 'react';
import type { JSONContent } from '@tiptap/core';
import { personalize, type ContentKind } from '@roi/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';
import { parseContentToDoc } from '@/lib/markdown-serializer';
import { cn } from '@/lib/utils';

export interface LivePreviewCardProps {
  kind: ContentKind;
  text: string;
  /** Female variant; null/empty means "same for both". */
  textFemale?: string | null;
  verseRef?: string | null;
  className?: string;
}

type Gender = 'male' | 'female';

/** Render the Markdown-subset doc as plain React elements (no HTML injection). */
function renderNodes(nodes: JSONContent[] | undefined): ReactNode {
  return (nodes ?? []).map((n, i): ReactNode => {
    switch (n.type) {
      case 'heading':
        return n.attrs?.level === 3 ? (
          <h3 key={i} className="my-1 text-base font-bold">{renderNodes(n.content)}</h3>
        ) : (
          <h2 key={i} className="my-1 text-xl font-bold">{renderNodes(n.content)}</h2>
        );
      case 'bulletList':
        return <ul key={i} className="my-1 list-disc ps-6">{renderNodes(n.content)}</ul>;
      case 'listItem':
        return <li key={i}>{renderNodes(n.content)}</li>;
      case 'blockquote':
        return (
          <blockquote key={i} className="my-1 border-s-4 border-accent/40 ps-3 text-muted-foreground">
            {renderNodes(n.content)}
          </blockquote>
        );
      case 'paragraph':
        return <p key={i} className="my-1">{renderNodes(n.content)}</p>;
      case 'hardBreak':
        return <br key={i} />;
      case 'text': {
        let out: ReactNode = n.text;
        for (const m of n.marks ?? []) {
          out = m.type === 'bold' ? <strong>{out}</strong> : m.type === 'italic' ? <em>{out}</em> : out;
        }
        return <Fragment key={i}>{out}</Fragment>;
      }
      default:
        return null;
    }
  });
}

export function LivePreviewCard({ kind, text, textFemale, verseRef, className }: LivePreviewCardProps) {
  const { t } = useI18n();
  const p = t.editor.preview;
  const [gender, setGender] = useState<Gender>('male');
  const [name, setName] = useState(p.defaultMaleName);

  const pickGender = (next: Gender) => {
    setGender(next);
    // Swap the default test name unless the admin typed their own (or cleared it for neutral).
    const defaults = [p.defaultMaleName, p.defaultFemaleName];
    if (defaults.includes(name)) setName(next === 'male' ? p.defaultMaleName : p.defaultFemaleName);
  };

  // Test name + gender only apply to verses; names of God and blessings render title + single text.
  const personalized = kind === 'verse';
  const output = personalized ? personalize({ text, textFemale }, { name, gender }) : text;
  const isNeutral = name.trim() === '';

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <CardTitle>{p.heading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {personalized ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1">
            <Label htmlFor="preview-test-name">{p.testNameLabel}</Label>
            <div className="flex gap-2">
              <Input
                id="preview-test-name"
                dir="rtl"
                lang="ar"
                value={name}
                placeholder={p.testNamePlaceholder}
                onChange={(e) => setName(e.target.value)}
              />
              <Button type="button" variant="outline" disabled={isNeutral} onClick={() => setName('')}>
                {t.cta.clearNeutral}
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <span className="block text-sm font-bold">{p.genderLabel}</span>
            <div role="group" aria-label={p.genderLabel} className="flex gap-1">
              {(['male', 'female'] as const).map((g) => (
                <Button
                  key={g}
                  type="button"
                  size="sm"
                  variant={gender === g ? 'default' : 'outline'}
                  aria-pressed={gender === g}
                  onClick={() => pickGender(g)}
                >
                  {g === 'male' ? p.maleOption : p.femaleOption}
                </Button>
              ))}
            </div>
          </div>
        </div>
        ) : null}
        {personalized && isNeutral ? <p className="text-sm text-muted-foreground">{p.neutralHint}</p> : null}

        <div
          dir="rtl"
          lang="ar"
          data-testid="preview-surface"
          className="max-h-[360px] overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-sm"
        >
          {kind === 'verse' ? (
            <p className="whitespace-pre-line font-serif text-xl leading-[1.8]">{output}</p>
          ) : (
            <div className="text-base leading-6">{renderNodes(parseContentToDoc(output, 'rich').content)}</div>
          )}
          {kind === 'blessing' && verseRef?.trim() ? (
            <footer className="mt-4 border-t border-border pt-2 text-sm text-muted-foreground">
              {verseRef.trim()}
            </footer>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
