import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { matches } from '@roi/shared';
import { AuditLogPage } from '@/pages/AuditLogPage';
import { CatalogPage, ItemEditorRoute } from '@/pages/CatalogPage';
import { mockGraphQL, ok, renderAt, stubProseMirrorLayout } from './graphql-mock';

beforeAll(stubProseMirrorLayout);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const verse = (id: string, ref: string, text: string, deletedAt: number | null = null) => ({
  id, ref, text, textFemale: null, version: 3, updatedAt: 1_700_000_000_000, deletedAt,
});
const V1 = verse('v1', 'مزمور ٢٣: ١', 'لأَنِّي أَنَا الرَّبُّ إِلهُكَ');
const V2 = verse('v2', 'يوحنا ٣: ١٦', 'هكذا أحب الله العالم');
const V3 = verse('v3', 'أمثال ١: ١', 'محذوفة', 1_700_000_100_000);

describe('shared matches()', () => {
  it('ignores tashkeel and hamza variants', () => {
    expect(matches('لأَنِّي إِلهُكَ', 'لاني')).toBe(true);
  });
});

describe('CatalogPage', () => {
  it('filters rows with diacritic/hamza-insensitive search and shows the search empty state', async () => {
    mockGraphQL({ adminVerses: () => ok({ adminVerses: [V1, V2, V3] }) });
    renderAt(<CatalogPage kind="verse" />, '/verses');
    await waitFor(() => expect(screen.getAllByTestId('catalog-row')).toHaveLength(2));
    expect(screen.getByTestId('item-count').textContent).toContain('2');

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'لاني' } });
    expect(screen.getAllByTestId('catalog-row')).toHaveLength(1);
    expect(screen.getByText('مزمور ٢٣: ١')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'zzzz' } });
    expect(screen.getByText('No items match your search')).toBeTruthy();
  });

  it('shows the catalog empty state and Arabic-Indic counts in ar', async () => {
    mockGraphQL({ adminVerses: () => ok({ adminVerses: [] }) });
    renderAt(<CatalogPage kind="verse" />, '/verses', '*', 'ar');
    await screen.findByText('لا توجد عناصر في هذا القسم بعد');
    expect(screen.getByTestId('item-count').textContent).toContain('٠');
  });

  it('soft-deletes only after confirmation, and restores from the Deleted tab in one click', async () => {
    const requests = mockGraphQL({
      adminVerses: () => ok({ adminVerses: [V1, V3] }),
      softDeleteContent: () => ok({ softDeleteContent: true }),
      restoreContent: () => ok({ restoreContent: true }),
    });
    renderAt(<CatalogPage kind="verse" />, '/verses');
    await screen.findByLabelText('Soft Delete Item');

    fireEvent.click(screen.getByLabelText('Soft Delete Item'));
    expect(requests.some((r) => r.query.includes('softDeleteContent'))).toBe(false);
    fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Confirm Soft Delete'));
    await waitFor(() =>
      expect(requests.find((r) => r.query.includes('softDeleteContent'))?.variables).toEqual({ kind: 'verse', id: 'v1' }),
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Deleted' }));
    expect(screen.getAllByTestId('catalog-row')).toHaveLength(1);
    fireEvent.click(screen.getByLabelText('Restore Item'));
    await waitFor(() =>
      expect(requests.find((r) => r.query.includes('restoreContent'))?.variables).toEqual({ kind: 'verse', id: 'v3' }),
    );
  });

  it('shows a retry banner when the catalog request fails', async () => {
    mockGraphQL({ adminVerses: () => ({ errors: [{ message: 'boom' }] }) });
    renderAt(<CatalogPage kind="verse" />, '/verses');
    await screen.findByRole('alert');
    expect(screen.getByText('Retry Request')).toBeTruthy();
  });
});

describe('ItemEditorRoute', () => {
  it('edit: loads the item by id and saves through updateVerse, then returns to the catalog', async () => {
    const requests = mockGraphQL({
      adminVerses: () => ok({ adminVerses: [V1, V2] }),
      updateVerse: () => ok({ updateVerse: { id: 'v1' } }),
    });
    renderAt(<ItemEditorRoute kind="verse" />, '/verses/v1', '/verses/:id');
    await waitFor(() => expect((screen.getByLabelText('Reference') as HTMLInputElement).value).toBe('مزمور ٢٣: ١'));
    fireEvent.change(screen.getByLabelText('Reference'), { target: { value: 'مزمور ٢٣: ٢' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(screen.getByTestId('elsewhere')).toBeTruthy());
    const save = requests.find((r) => r.query.includes('updateVerse'))!;
    expect(save.variables?.id).toBe('v1');
    expect(save.variables?.input).toMatchObject({ ref: 'مزمور ٢٣: ٢', text: V1.text, textFemale: null });
    expect(save.query).toContain('UpdateVerseInput');
  });

  it('create: blessing sends title + verseRef through createBlessing', async () => {
    const requests = mockGraphQL({
      adminBlessings: () => ok({ adminBlessings: [] }),
      createBlessing: () => ok({ createBlessing: { id: 'b1' } }),
    });
    renderAt(<ItemEditorRoute kind="blessing" />, '/blessings/new', '/blessings/new');
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'بركة' } });
    fireEvent.paste(screen.getByRole('textbox', { name: 'Content Text' }), {
      clipboardData: { getData: (type: string) => (type === 'text/plain' ? 'يباركك {الاسم}' : '') },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publish Content Item' }));
    await waitFor(() => expect(requests.some((r) => r.query.includes('createBlessing'))).toBe(true));
    const save = requests.find((r) => r.query.includes('createBlessing'))!;
    expect(save.query).toContain('CreateBlessingInput');
    expect(save.variables?.input).toMatchObject({ title: 'بركة', verseRef: null, text: 'يباركك {الاسم}' });
  });
});

const LOG = {
  id: 'a1', actorEmail: 'admin@example.com', action: 'soft_delete', entityType: 'verse', entityId: 'v1',
  contentVersion: 7, summaryJson: '{"note":"<img src=x onerror=alert(1)>"}', createdAt: 1_700_000_000_000,
};

describe('AuditLogPage', () => {
  it('renders rows, expands summaryJson as escaped text, and filters by action', async () => {
    const requests = mockGraphQL({ adminAuditLogs: () => ok({ adminAuditLogs: [LOG] }) });
    renderAt(<AuditLogPage />, '/audit-log');
    await screen.findByText('admin@example.com');
    expect(screen.getByText('soft_delete')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();

    fireEvent.click(screen.getByText('Show Details'));
    const pre = screen.getByTestId('audit-summary');
    expect(pre.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(pre.querySelector('img')).toBeNull();

    fireEvent.click(screen.getByRole('combobox', { name: 'Action' }));
    fireEvent.click(screen.getByRole('option', { name: 'restore' }));
    await waitFor(() => expect(requests.at(-1)?.variables).toEqual({ action: 'restore', entityType: null }));
  });

  it('shows the documented empty state', async () => {
    mockGraphQL({ adminAuditLogs: () => ok({ adminAuditLogs: [] }) });
    renderAt(<AuditLogPage />, '/audit-log');
    await screen.findByText('No audit entries recorded yet');
  });
});
