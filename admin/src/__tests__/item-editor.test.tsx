import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ItemEditorPage, type ContentPayload, type ItemEditorPageProps } from '@/pages/ItemEditorPage';
import { I18nProvider } from '@/lib/i18n';

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) };
  Range.prototype.getBoundingClientRect = () => rect as DOMRect;
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  document.elementFromPoint = () => null;
});

afterEach(cleanup);

function setup(props: Partial<ItemEditorPageProps> & Pick<ItemEditorPageProps, 'kind'>) {
  const onSubmitPayload = vi.fn<(p: ContentPayload) => Promise<void>>().mockResolvedValue(undefined);
  render(
    <I18nProvider initialLang="en">
      <ItemEditorPage onSubmitPayload={onSubmitPayload} {...props} />
    </I18nProvider>,
  );
  return onSubmitPayload;
}

const paste = (label: string, text: string) =>
  fireEvent.paste(screen.getByRole('textbox', { name: label }), {
    clipboardData: { getData: (type: string) => (type === 'text/plain' ? text : '') },
  });
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
const toggle = () => fireEvent.click(screen.getByRole('switch', { name: 'Same text for male & female' }));
const editor = (label: string) => screen.getByRole('textbox', { name: label });

describe('ItemEditorPage minimal fields (D-08)', () => {
  it('verse: ref only, no verseRef/tags/sortOrder', async () => {
    const submit = setup({ kind: 'verse' });
    await waitFor(() => expect(editor('Content Text')).toBeTruthy());
    expect(screen.getByLabelText('Reference')).toBeTruthy();
    expect(screen.queryByLabelText(/Supporting Verse/)).toBeNull();
    expect(screen.queryByLabelText(/tags|sort/i)).toBeNull();
    type('Reference', ' مزمور ٢٣: ١ ');
    paste('Content Text', 'الرب راعيّ');
    save();
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit).toHaveBeenCalledWith({
      kind: 'verse',
      refOrTitle: 'مزمور ٢٣: ١',
      verseRef: null,
      text: 'الرب راعيّ',
      textFemale: null,
    });
  });

  it('blessing: title + optional verseRef; blank verseRef submits null, filled is trimmed', async () => {
    const submit = setup({ kind: 'blessing' });
    await waitFor(() => expect(editor('Content Text')).toBeTruthy());
    type('Title', 'بركة الصباح');
    type('Supporting Verse (Optional)', '   ');
    paste('Content Text', 'يباركك {الاسم}');
    save();
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit.mock.calls[0]![0]).toMatchObject({ kind: 'blessing', verseRef: null, text: 'يباركك {الاسم}' });

    type('Supporting Verse (Optional)', ' يوحنا ٣: ١٦ ');
    save();
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    expect(submit.mock.calls[1]![0].verseRef).toBe('يوحنا ٣: ١٦');
  });

  it('shows the live preview with the personalized text', async () => {
    setup({ kind: 'name_of_god' });
    await waitFor(() => expect(editor('Content Text')).toBeTruthy());
    paste('Content Text', 'يرعاك {الاسم}');
    await waitFor(() => expect(screen.getByTestId('preview-surface').textContent).toBe('يرعاك مينا'));
  });
});

describe('male/female switch (D-05)', () => {
  it('requires female text when OFF and preserves the draft non-destructively', async () => {
    const submit = setup({ kind: 'verse', initialValues: { refOrTitle: 'مز ١', text: 'ذكر' } });
    await waitFor(() => expect(editor('Content Text')).toBeTruthy());

    toggle(); // OFF -> side-by-side
    await waitFor(() => expect(editor('Female Variant')).toBeTruthy());
    expect(editor('Male Variant').textContent).toBe('ذكر');

    save(); // female empty -> blocked
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(submit).not.toHaveBeenCalled();

    paste('Female Variant', 'أنثى');
    await waitFor(() => expect(editor('Female Variant').textContent).toBe('أنثى'));

    toggle(); // ON: female hidden
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Female Variant' })).toBeNull());
    toggle(); // OFF again: draft restored
    await waitFor(() => expect(editor('Female Variant').textContent).toBe('أنثى'));

    save();
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit.mock.calls[0]![0]).toMatchObject({ text: 'ذكر', textFemale: 'أنثى' });

    toggle(); // ON -> textFemale null on Save, even though a draft exists
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Female Variant' })).toBeNull());
    save();
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    expect(submit.mock.calls[1]![0].textFemale).toBeNull();
  });

  it('starts with two editors when the item already has a female variant', async () => {
    setup({ kind: 'verse', initialValues: { refOrTitle: 'x', text: 'م', textFemale: 'ف' } });
    await waitFor(() => expect(editor('Female Variant').textContent).toBe('ف'));
  });
});

describe('brace rule and one-sided warning (D-06)', () => {
  it('rejects other brace tokens with the Arabic error', async () => {
    const submit = setup({ kind: 'name_of_god' });
    await waitFor(() => expect(editor('Content Text')).toBeTruthy());
    type('Title', 'اسم');
    paste('Content Text', 'مرحبا {other}');
    save();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('{الاسم}'));
    expect(submit).not.toHaveBeenCalled();
  });

  it('warns (non-blocking) when only one variant has {الاسم} and still saves', async () => {
    const submit = setup({ kind: 'verse', initialValues: { refOrTitle: 'x', text: 'يا {الاسم}', textFemale: 'يا حبيبتي' } });
    await waitFor(() => expect(editor('Female Variant')).toBeTruthy());
    expect(screen.getByRole('status').textContent).toContain('only one');
    save();
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  });

  it('shows no warning when both or neither variant has the chip', async () => {
    setup({ kind: 'verse', initialValues: { refOrTitle: 'x', text: 'يا {الاسم}', textFemale: 'يا {الاسم} حبيبتي' } });
    await waitFor(() => expect(editor('Female Variant')).toBeTruthy());
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('failure handling and back guard', () => {
  it('keeps the form after a rejected mutation so the admin can retry', async () => {
    const onSubmitPayload = vi.fn<(p: ContentPayload) => Promise<void>>().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    render(
      <I18nProvider initialLang="en">
        <ItemEditorPage kind="verse" initialValues={{ refOrTitle: 'x', text: 'نص' }} onSubmitPayload={onSubmitPayload} />
      </I18nProvider>,
    );
    await waitFor(() => expect(editor('Content Text')).toBeTruthy());
    save();
    await waitFor(() => expect(onSubmitPayload).toHaveBeenCalledTimes(1));
    expect(editor('Content Text').textContent).toBe('نص');
    save();
    await waitFor(() => expect(onSubmitPayload).toHaveBeenCalledTimes(2));
  });

  it('asks before leaving with unsaved changes', async () => {
    const onBack = vi.fn();
    setup({ kind: 'verse', onBack });
    await waitFor(() => expect(editor('Content Text')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Back to Catalog' })); // pristine: leaves directly
    expect(onBack).toHaveBeenCalledTimes(1);
    type('Reference', 'تعديل');
    fireEvent.click(screen.getByRole('button', { name: 'Back to Catalog' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    fireEvent.click(await screen.findByRole('button', { name: 'Leave Page' }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });
});
