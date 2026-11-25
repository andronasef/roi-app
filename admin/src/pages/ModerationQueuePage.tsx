import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toaster';
import {
  isModerationConflict,
  useAdminSuggestions,
  useRejectSuggestion,
  type SuggestionStatus,
} from '@/lib/admin-api';
import { useI18n } from '@/lib/i18n';
import { EmptyState, ErrorBanner, SkeletonRows } from '@/pages/CatalogPage';

/** D-11: another admin moderated this suggestion first. Never swallowed; offers a queue refresh. */
export function ConflictBanner({ onRefresh }: { onRefresh: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" data-testid="conflict-banner" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-border bg-warning p-3 text-sm font-bold text-warning-foreground">
      <p>{t.errors.concurrentModeration409}</p>
      <Button variant="outline" size="sm" onClick={onRefresh}>
        {t.moderation.refreshQueue}
      </Button>
    </div>
  );
}

/** One-click reject (D-10): confirmation with an optional internal note. */
export function RejectDialog({ open, busy, onCancel, onConfirm }: {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (note: string | null) => void;
}) {
  const { t } = useI18n();
  const [note, setNote] = useState('');
  const c = t.confirmations.rejectSuggestion;
  const close = () => {
    setNote('');
    onCancel();
  };
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{c.title}</AlertDialogTitle>
          <AlertDialogDescription>{c.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1">
          <Label htmlFor="reject-note">{c.noteLabel}</Label>
          <Input id="reject-note" dir="rtl" lang="ar" placeholder={c.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{c.cancel}</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={() => {
              const trimmed = note.trim() || null;
              setNote('');
              onConfirm(trimmed);
            }}>
            {c.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ModerationQueuePage() {
  const { t, formatNumber, formatTimestamp } = useI18n();
  const navigate = useNavigate();
  const [status, setStatus] = useState<SuggestionStatus>('pending');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const list = useAdminSuggestions(status);
  const pending = useAdminSuggestions('pending'); // same query as the list while on the Pending tab
  const reject = useRejectSuggestion();

  const confirmReject = async (note: string | null) => {
    const id = rejecting;
    if (!id) {
      return;
    }
    try {
      await reject.mutateAsync({ id, note });
      toast.success(t.toast.suggestionRejected);
    } catch (error) {
      if (isModerationConflict(error)) {
        setConflict(true);
      } else {
        toast.error(error instanceof Error ? error.message : t.errors.networkFailure);
      }
    } finally {
      setRejecting(null);
    }
  };

  const kindLabel = { verse: t.nav.verses, name_of_god: t.nav.names, blessing: t.nav.blessings };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t.nav.suggestions}</h2>
      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v as SuggestionStatus);
          setConflict(false);
        }}
      >
        <TabsList>
          <TabsTrigger value="pending">
            {t.moderation.tabs.pending}
            <Badge variant="accent" data-testid="queue-pending-count">
              {formatNumber(pending.data?.length ?? 0)}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="accepted">{t.moderation.tabs.accepted}</TabsTrigger>
          <TabsTrigger value="rejected">{t.moderation.tabs.rejected}</TabsTrigger>
        </TabsList>
      </Tabs>

      {conflict ? (
        <ConflictBanner
          onRefresh={() => {
            setConflict(false);
            void list.refetch();
            void pending.refetch();
          }}
        />
      ) : null}

      {list.isError ? (
        <ErrorBanner onRetry={() => void list.refetch()} />
      ) : list.isLoading ? (
        <SkeletonRows />
      ) : list.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.moderation.suggestion}</TableHead>
              <TableHead>{t.moderation.submitterEmail}</TableHead>
              <TableHead>{t.moderation.submittedAt}</TableHead>
              <TableHead>{t.catalog.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.map((s) => (
              <TableRow key={s.id} data-testid="suggestion-row">
                <TableCell className="max-w-md">
                  <Badge variant="secondary">{kindLabel[s.kind]}</Badge>
                  <p dir="rtl" lang="ar" className="mt-1 font-bold">{s.title}</p>
                  <p dir="rtl" lang="ar" className="line-clamp-2 text-sm text-muted-foreground">{s.text}</p>
                  {s.status === 'rejected' && s.moderationNote ? (
                    <p dir="rtl" lang="ar" className="mt-1 line-clamp-2 text-sm">
                      <span className="font-bold">{t.moderation.moderationNote}: </span>
                      {s.moderationNote}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell dir="ltr" className="text-sm">{s.email}</TableCell>
                <TableCell className="text-sm">{formatTimestamp(s.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/suggestions/${s.id}`)}>
                      {t.cta.reviewSuggestion}
                    </Button>
                    {s.status === 'pending' ? (
                      <Button variant="ghost" size="sm" disabled={reject.isPending} onClick={() => setRejecting(s.id)}>
                        {t.cta.rejectSuggestion}
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : status === 'pending' ? (
        <EmptyState heading={t.empty.pendingSuggestionsHeading} body={t.empty.pendingSuggestionsBody} />
      ) : (
        <EmptyState heading={t.moderation.emptyOther} body={t.empty.pendingSuggestionsBody} />
      )}

      <RejectDialog
        open={rejecting !== null}
        busy={reject.isPending}
        onCancel={() => setRejecting(null)}
        onConfirm={(note) => void confirmReject(note)}
      />
    </div>
  );
}
