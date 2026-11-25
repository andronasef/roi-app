import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RichContentEditor } from '@/components/editor/RichContentEditor';
import { I18nProvider, type AdminLang } from '@/lib/i18n';
import type { EditorContentMode } from '@/lib/markdown-serializer';

// jsdom lacks layout APIs ProseMirror calls when scrolling/selecting.
beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) };
  Range.prototype.getBoundingClientRect = () => rect as DOMRect;
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  document.elementFromPoint = () => null;
});

let latest = '';
afterEach(() => {
  cleanup();
  latest = '';
});
function Harness({ initial, mode, lang = 'ar' }: { initial: string; mode: EditorContentMode; lang?: AdminLang }) {
  const [value, setValue] = useState(initial);
  return (
    <I18nProvider initialLang={lang}>
      <RichContentEditor
        value={value}
        mode={mode}
        ariaLabel="editor"
        onChange={(v) => {
          latest = v;
          setValue(v);
        }}
      />
    </I18nProvider>
  );
}

const surface = () => screen.getByRole('textbox', { name: 'editor' });

describe('RichContentEditor chip', () => {
  it('renders {الاسم} as a pill and never leaks the raw token into the DOM', async () => {
    render(<Harness initial="يرعاك {الاسم} دائماً" mode="verse" />);
    await waitFor(() => expect(surface().querySelector('[data-name-token="true"]')).not.toBeNull());
    expect(surface().textContent).not.toContain('{');
    expect(surface().textContent).toContain('الاسم');
    const chip = surface().querySelector('[data-name-token="true"]')!;
    expect(chip.closest('[draggable="true"]')).not.toBeNull();
  });

  it('locks dir=rtl and lang=ar even under the English UI', async () => {
    render(<Harness initial="x" mode="rich" lang="en" />);
    await waitFor(() => expect(surface()).toBeTruthy());
    expect(surface().getAttribute('dir')).toBe('rtl');
    expect(surface().getAttribute('lang')).toBe('ar');
    expect(screen.getByRole('button', { name: 'Insert Name Chip' }).className).toContain('min-h-[44px]');
  });

  it('toolbar insertion emits {الاسم} through onChange', async () => {
    render(<Harness initial="" mode="verse" lang="en" />);
    await waitFor(() => expect(surface()).toBeTruthy());
    act(() => screen.getByRole('button', { name: 'Insert Name Chip' }).click());
    await waitFor(() => expect(latest).toBe('{الاسم}'));
    expect(surface().textContent).not.toContain('{');
  });

  it('pasting plain text containing {الاسم} converts it into chips', async () => {
    render(<Harness initial="" mode="verse" />);
    await waitFor(() => expect(surface()).toBeTruthy());
    fireEvent.paste(surface(), {
      clipboardData: { getData: (type: string) => (type === 'text/plain' ? 'يا {الاسم} سلام\nسطر ثان' : '') },
    });
    await waitFor(() => expect(latest).toBe('يا {الاسم} سلام\nسطر ثان'));
    expect(surface().querySelectorAll('[data-name-token="true"]')).toHaveLength(1);
    expect(surface().textContent).not.toContain('{');
  });

  it('verse mode strips pasted HTML formatting', async () => {
    render(<Harness initial="" mode="verse" />);
    await waitFor(() => expect(surface()).toBeTruthy());
    fireEvent.paste(surface(), {
      clipboardData: {
        getData: (type: string) => (type === 'text/html' ? '<h2><b>عنوان</b></h2>' : 'عنوان'),
      },
    });
    await waitFor(() => expect(latest).toBe('عنوان'));
    expect(surface().querySelector('h2, strong, b')).toBeNull();
  });

  it('backspace removes the selected chip atomically', async () => {
    render(<Harness initial="أ {الاسم} ب" mode="verse" />);
    await waitFor(() => expect(surface().querySelector('[data-name-token="true"]')).not.toBeNull());
    const chip = surface().querySelector('[data-name-token="true"]')!;
    let node: Element = chip;
    while (node.parentElement && node.parentElement.tagName !== 'P') node = node.parentElement;
    surface().focus();
    const range = document.createRange();
    range.selectNode(node);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(range);
    fireEvent(document, new Event('selectionchange'));
    fireEvent.keyDown(surface(), { key: 'Backspace' });
    await waitFor(() => expect(latest).toBe('أ  ب'));
    expect(surface().querySelector('[data-name-token="true"]')).toBeNull();
  });

  it('rich mode exposes the 6-construct toolbar; verse mode only the chip button', async () => {
    const { unmount } = render(<Harness initial="" mode="rich" lang="en" />);
    await waitFor(() => expect(surface()).toBeTruthy());
    for (const n of ['Bold', 'Italic', 'Heading 2', 'Heading 3', 'Bullet List', 'Blockquote', 'Insert Name Chip']) {
      expect(screen.getByRole('button', { name: n })).toBeTruthy();
    }
    unmount();
    render(<Harness initial="" mode="verse" lang="en" />);
    await waitFor(() => expect(surface()).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Bold' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Insert Name Chip' })).toBeTruthy();
  });

  it('rich toolbar toggles bold and serializes Markdown', async () => {
    render(<Harness initial="" mode="rich" lang="en" />);
    await waitFor(() => expect(surface()).toBeTruthy());
    act(() => screen.getByRole('button', { name: 'Heading 2' }).click());
    act(() => screen.getByRole('button', { name: 'Insert Name Chip' }).click());
    await waitFor(() => expect(latest).toBe('## {الاسم}'));
  });
});
