import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LivePreviewCard, type LivePreviewCardProps } from '@/components/editor/LivePreviewCard';
import { I18nProvider } from '@/lib/i18n';

afterEach(cleanup);

function setup(props: Partial<LivePreviewCardProps> = {}) {
  return render(
    <I18nProvider initialLang="en">
      <LivePreviewCard kind="verse" text="يرعاك {الاسم} دائماً" textFemale="يرعاكِ {الاسم} دائماً" {...props} />
    </I18nProvider>,
  );
}
const surface = () => screen.getByTestId('preview-surface');

describe('LivePreviewCard', () => {
  it('personalizes with the default male name and is locked dir=rtl', () => {
    setup();
    expect(surface().textContent).toBe('يرعاك مينا دائماً');
    expect(surface().getAttribute('dir')).toBe('rtl');
    expect(surface().getAttribute('lang')).toBe('ar');
  });

  it('switches to the female variant and default name', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Female' }));
    expect(surface().textContent).toBe('يرعاكِ سارة دائماً');
  });

  it('falls back to the male text when textFemale is null', () => {
    setup({ textFemale: null });
    fireEvent.click(screen.getByRole('button', { name: 'Female' }));
    expect(surface().textContent).toBe('يرعاك سارة دائماً');
  });

  it('uses a custom test name and keeps it across gender toggles', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Test Name'), { target: { value: 'يوسف' } });
    expect(surface().textContent).toBe('يرعاك يوسف دائماً');
    fireEvent.click(screen.getByRole('button', { name: 'Female' }));
    expect(surface().textContent).toBe('يرعاكِ يوسف دائماً');
  });

  it('clear-for-neutral strips the token and shows the neutral hint', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Clear for neutral' }));
    expect(surface().textContent).toBe('يرعاك دائماً');
    expect(screen.getByText('Neutral preview mode (no name)')).toBeTruthy();
  });

  it('renders verses in Amiri 20px serif', () => {
    setup();
    const p = surface().querySelector('p')!;
    expect(p.className).toContain('font-serif');
    expect(p.className).toContain('text-xl');
    expect(p.className).toContain('leading-[1.8]');
  });

  it('renders the Markdown subset as React elements', () => {
    setup({
      kind: 'name_of_god',
      text: '## عنوان\n\n### فرعي\n\n**عريض** و *مائل* {الاسم}  \nسطر\n\n- بند\n\n> اقتباس',
      textFemale: null,
    });
    const s = surface();
    expect(s.querySelector('h2')?.textContent).toBe('عنوان');
    expect(s.querySelector('h3')?.textContent).toBe('فرعي');
    expect(s.querySelector('strong')?.textContent).toBe('عريض');
    expect(s.querySelector('em')?.textContent).toBe('مائل');
    expect(s.querySelector('br')).not.toBeNull();
    expect(s.querySelector('li')?.textContent).toBe('بند');
    expect(s.querySelector('blockquote')?.textContent).toBe('اقتباس');
  });

  it('never injects raw HTML', () => {
    setup({ kind: 'name_of_god', text: '<img src=x onerror=alert(1)> <b>x</b>', textFemale: null });
    expect(surface().querySelector('img, b, script')).toBeNull();
    expect(surface().textContent).toContain('<img src=x');
  });

  it('shows the blessing verseRef footer only when present', () => {
    const { unmount } = setup({ kind: 'blessing', text: 'بركة', verseRef: 'يوحنا ٣: ١٦' });
    expect(surface().querySelector('footer')?.textContent).toBe('يوحنا ٣: ١٦');
    unmount();
    setup({ kind: 'blessing', text: 'بركة', verseRef: '  ' });
    expect(surface().querySelector('footer')).toBeNull();
    cleanup();
    setup({ kind: 'blessing', text: 'بركة', verseRef: null });
    expect(surface().querySelector('footer')).toBeNull();
  });
});
