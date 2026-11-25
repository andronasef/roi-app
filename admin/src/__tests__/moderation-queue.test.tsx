import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ModerationQueuePage } from '@/pages/ModerationQueuePage';
import { SuggestionReviewPage } from '@/pages/SuggestionReviewPage';
import { mockGraphQL, ok, renderAt, stubProseMirrorLayout } from './graphql-mock';

beforeAll(stubProseMirrorLayout);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const suggestion = (over: Record<string, unknown> = {}) => ({
  id: 's1', kind: 'verse', title: 'مزمور ٢٣: ١', text: 'الرب راعيّ', textFemale: null, verseRef: null,
  status: 'pending', moderationNote: null, email: 'user@example.com', createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000, submitterStats: { pendingCount: 1, acceptedCount: 4, rejectedCount: 2 },
  ...over,
});

const byStatus = (lists: Record<string, unknown[]>) => (vars?: Record<string, any>) =>
  ok({ adminSuggestions: lists[vars?.status as string] ?? [] });

describe('ModerationQueuePage', () => {
  it('switches Pending / Accepted / Rejected, shows rejected notes, and a calm zero pending count', async () => {
    mockGraphQL({
      adminSuggestions: byStatus({
        pending: [],
        accepted: [suggestion({ id: 's2', status: 'accepted' })],
        rejected: [suggestion({ id: 's3', status: 'rejected', moderationNote: 'مكرر' })],
      }),
    });
    renderAt(<ModerationQueuePage />, '/suggestions', '*', 'ar');
    await screen.findByText('لا توجد اقتراحات بانتظار المراجعة');
    expect(screen.getByTestId('queue-pending-count').textContent).toBe('٠');

    fireEvent.click(screen.getByRole('tab', { name: /المقبولة/ }));
    await screen.findByText('user@example.com');
    expect(screen.queryByText('رفض الاقتراح')).toBeNull(); // no reject on moderated rows

    fireEvent.click(screen.getByRole('tab', { name: /المرفوضة/ }));
    await screen.findByText('مكرر');
  });

  it('one-click reject confirms with an optional note and calls rejectSuggestion', async () => {
    const requests = mockGraphQL({
      adminSuggestions: byStatus({ pending: [suggestion()] }),
      rejectSuggestion: () => ok({ rejectSuggestion: { id: 's1', status: 'rejected' } }),
    });
    renderAt(<ModerationQueuePage />, '/suggestions');
    fireEvent.click(await screen.findByRole('button', { name: 'Reject Suggestion' }));
    fireEvent.change(screen.getByLabelText('Internal Note (Optional)'), { target: { value: ' duplicate ' } });
    fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Confirm Reject Suggestion'));
    await waitFor(() =>
      expect(requests.find((r) => r.query.includes('rejectSuggestion'))?.variables).toEqual({ id: 's1', note: 'duplicate' }),
    );
  });

  it('surfaces a 409 from reject as the conflict banner', async () => {
    mockGraphQL({
      adminSuggestions: byStatus({ pending: [suggestion()] }),
      rejectSuggestion: () => ({
        errors: [{ message: 'SUGGESTION_ALREADY_MODERATED', extensions: { code: 'CONFLICT' } }],
      }),
    });
    renderAt(<ModerationQueuePage />, '/suggestions');
    fireEvent.click(await screen.findByRole('button', { name: 'Reject Suggestion' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Confirm Reject Suggestion'));
    const banner = await screen.findByTestId('conflict-banner');
    expect(banner.textContent).toContain('already moderated by another admin');
    expect(within(banner).getByText('Refresh Queue')).toBeTruthy();
  });
});

describe('SuggestionReviewPage', () => {
  const page = () => renderAt(<SuggestionReviewPage />, '/suggestions/s1', '/suggestions/:id');

  it('shows submitter context, edits in the full editor, and accepts with the edited payload', async () => {
    const requests = mockGraphQL({
      adminSuggestion: () => ok({ adminSuggestion: suggestion() }),
      acceptSuggestion: () => ok({ acceptSuggestion: { id: 's1', status: 'accepted' } }),
    });
    page();
    const ctx = await screen.findByTestId('submitter-context');
    expect(ctx.textContent).toContain('user@example.com');
    expect(ctx.textContent).toContain('Accepted 4');
    expect(ctx.textContent).toContain('Rejected 2');
    expect(ctx.textContent).toContain('Pending 1');

    fireEvent.change(screen.getByLabelText('Reference'), { target: { value: 'مزمور ٢٣: ٢' } });
    fireEvent.paste(screen.getByRole('textbox', { name: 'Content Text' }), {
      clipboardData: { getData: (type: string) => (type === 'text/plain' ? 'يرعاني' : '') },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Accept & Publish Suggestion' }));
    await waitFor(() => expect(screen.getByTestId('elsewhere')).toBeTruthy());
    const accept = requests.find((r) => r.query.includes('acceptSuggestion'))!;
    expect(accept.variables?.id).toBe('s1');
    expect(accept.variables?.input).toMatchObject({ kind: 'verse', title: 'مزمور ٢٣: ٢', textFemale: null });
    expect(accept.variables?.input.text).toContain('يرعاني');
  });

  it('shows the concurrent-moderation banner on SUGGESTION_ALREADY_MODERATED and locks the actions', async () => {
    let status = 'pending';
    const requests = mockGraphQL({
      adminSuggestion: () => ok({ adminSuggestion: suggestion({ status }) }),
      acceptSuggestion: () => {
        status = 'rejected';
        return { errors: [{ message: 'SUGGESTION_ALREADY_MODERATED', extensions: { code: 'CONFLICT' } }] };
      },
    });
    page();
    fireEvent.click(await screen.findByRole('button', { name: 'Accept & Publish Suggestion' }));
    const banner = await screen.findByTestId('conflict-banner');
    expect(banner.textContent).toContain('already moderated by another admin');
    await waitFor(() => expect((screen.getByRole('button', { name: 'Reject Suggestion' }) as HTMLButtonElement).disabled).toBe(true));
    expect((screen.getByRole('button', { name: 'Accept & Publish Suggestion' }) as HTMLButtonElement).disabled).toBe(true);
    expect(requests.filter((r) => r.query.includes('acceptSuggestion'))).toHaveLength(1);
  });

  it('rejects with a note and leaves for the queue; moderated suggestions cannot be actioned', async () => {
    const requests = mockGraphQL({
      adminSuggestion: () => ok({ adminSuggestion: suggestion() }),
      rejectSuggestion: () => ok({ rejectSuggestion: { id: 's1', status: 'rejected' } }),
    });
    page();
    fireEvent.click(await screen.findByRole('button', { name: 'Reject Suggestion' }));
    fireEvent.change(screen.getByLabelText('Internal Note (Optional)'), { target: { value: 'off topic' } });
    fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Confirm Reject Suggestion'));
    await waitFor(() => expect(screen.getByTestId('elsewhere')).toBeTruthy());
    expect(requests.find((r) => r.query.includes('rejectSuggestion'))?.variables).toEqual({ id: 's1', note: 'off topic' });
  });

  it('disables Accept and Reject when the suggestion is already moderated', async () => {
    mockGraphQL({ adminSuggestion: () => ok({ adminSuggestion: suggestion({ status: 'accepted' }) }) });
    page();
    const reject = (await screen.findByRole('button', { name: 'Reject Suggestion' })) as HTMLButtonElement;
    expect(reject.disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Accept & Publish Suggestion' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
