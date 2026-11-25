import {
  NAME_TOKEN,
  personalize,
  type PersonalizeProfile,
} from '@roi/shared';

/** Strip Markdown subset syntax cleanly for plain-text clipboard sharing (ME-07). */
export function stripMarkdownForCopy(md: string): string {
  return md
    .replace(/\r\n/g, '\n')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/```[^\n]*\n?([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]{0,3}(?:>[ \t]?)+/gm, '')
    .replace(/^[ \t]*[-*+][ \t]+/gm, '')
    .replace(/^[ \t]*\d+[.)][ \t]+/gm, '')
    .replace(/^[ \t]*([-*_])\1{2,}[ \t]*$/gm, '')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\*\*\*([\s\S]+?)\*\*\*/g, '$1')
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/__([\s\S]+?)__/g, '$1')
    .replace(/\*([^*\n]+?)\*/g, '$1')
    .replace(/(^|[^\w\u0600-\u06FF])_([^_\n]+?)_(?=[^\w\u0600-\u06FF]|$)/g, '$1$2')
    .replace(/\\([*_#`>~\-])/g, '$1')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Return true when a verse supports recipient personalization ({الاسم} or female variant). */
export function needsRecipientPrompt(item: {
  text: string;
  textFemale?: string | null;
}): boolean {
  return item.text.includes(NAME_TOKEN) || Boolean(item.textFemale?.trim());
}

/** Render a personalized verse with its reference for clipboard copy. */
export function formatVerseForCopy(
  verse: { ref: string; text: string; textFemale?: string | null },
  profile: PersonalizeProfile,
): string {
  const body = personalize(
    { text: verse.text, textFemale: verse.textFemale },
    profile,
  );
  const ref = verse.ref.trim();
  if (!body) {
    return ref ? `— ${ref}` : '';
  }
  return ref ? `${body}\n— ${ref}` : body;
}

/**
 * Render a Name of God or Blessing with Markdown stripped and optional verseRef appended.
 * Pass `plain: true` for personal items: their text is user-typed plain text, so it is copied
 * verbatim (no Markdown stripping, no personalization).
 */
export function formatArticleForCopy(
  item: {
    title: string;
    text: string;
    textFemale?: string | null;
    verseRef?: string | null;
  },
  profile: PersonalizeProfile,
  options: { plain?: boolean } = {},
): string {
  const body = options.plain
    ? item.text.trim()
    : stripMarkdownForCopy(
        personalize({ text: item.text, textFemale: item.textFemale }, profile),
      );
  const parts: string[] = [];
  const title = item.title.trim();
  if (title) {
    parts.push(title);
  }
  if (body) {
    parts.push(body);
  }
  const verseRef = item.verseRef?.trim();
  if (verseRef) {
    parts.push(`— ${verseRef}`);
  }
  return parts.join('\n\n');
}
