import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { ContentKind } from '@roi/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/toaster';
import {
  isModerationConflict,
  useAcceptSuggestion,
  useAdminSuggestion,
  useRejectSuggestion,
} from '@/lib/admin-api';
import { useI18n } from '@/lib/i18n';
import { ErrorBanner, SkeletonRows } from '@/pages/CatalogPage';
import { ItemEditorWorkspace } from '@/pages/ItemEditorPage';
import { ConflictBanner, RejectDialog } from '@/pages/ModerationQueuePage';

export function SuggestionReviewPage() {
  const { t, formatNumber, formatTimestamp } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams();
  const suggestion = useAdminSuggestion(id);
  const accept = useAcceptSuggestion();
  const reject = useRejectSuggestion();
  const [conflict, setConflict] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const toQueue = () => navigate('/suggestions');

  if (suggestion.isError) {
    return isModerationConflict(suggestion.error) ? (
      <ConflictBanner onRefresh={toQueue} />
    ) : (
      <ErrorBanner onRetry={() => void suggestion.refetch()} />
    );
  }
  if (!suggestion.data) {
    return <SkeletonRows rows={4} />;
  }

  const s = suggestion.data;
  const { acceptedCount, rejectedCount, pendingCount } = s.submitterStats;
  // Both mutations share one lock so Accept and Reject can never race each other (T-03-15).
  const locked = s.status !== 'pending' || accept.isPending || reject.isPending;

  const handleConflict = (error: unknown): boolean => {
    if (!isModerationConflict(error)) {
      return false;
    }
    setConflict(true);
    void suggestion.refetch();
    return true;
  };

  const confirmReject = async (note: string | null) => {
    try {
      await reject.mutateAsync({ id: s.id, note });
      toast.success(t.toast.suggestionRejected);
      toQueue();
    } catch (error) {
      if (!handleConflict(error)) {
        toast.error(error instanceof Error ? error.message : t.errors.networkFailure);
      }
    } finally {
      setRejecting(false);
    }
  };

  const header = (
    <>
      {conflict ? <ConflictBanner onRefresh={toQueue} /> : null}
      <Card data-testid="submitter-context">
        <CardHeader>
          <CardTitle>{t.moderation.submitterContext}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex flex-wrap gap-2">
            <span className="font-bold">{t.moderation.submitterEmail}:</span>
            <span dir="ltr">{s.email}</span>
          </p>
          <p className="flex flex-wrap gap-2">
            <span className="font-bold">{t.moderation.submittedAt}:</span>
            <span>{formatTimestamp(s.createdAt)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{t.moderation.historyCounts}:</span>
            <Badge variant="accent">{t.moderation.acceptedCount} {formatNumber(acceptedCount)}</Badge>
            <Badge variant="secondary">{t.moderation.rejectedCount} {formatNumber(rejectedCount)}</Badge>
            <Badge variant="warning">{t.moderation.pendingCount} {formatNumber(pendingCount)}</Badge>
          </div>
          {s.status === 'rejected' && s.moderationNote ? (
            <p dir="rtl" lang="ar">
              <span className="font-bold">{t.moderation.moderationNote}: </span>
              {s.moderationNote}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="space-y-4">
      <ItemEditorWorkspace
        key={s.id}
        kind={s.kind as ContentKind}
        header={header}
        initialValues={{ refOrTitle: s.title, verseRef: s.verseRef, text: s.text, textFemale: s.textFemale }}
        submitLabel={t.cta.acceptSuggestion}
        submitDisabled={locked}
        onBack={toQueue}
        onSubmitPayload={async (payload) => {
          try {
            await accept.mutateAsync({ id: s.id, payload });
          } catch (error) {
            if (handleConflict(error)) {
              // Already surfaced via the banner; stop the editor from toasting success.
              throw new Error(t.errors.concurrentModeration409);
            }
            throw error;
          }
          toQueue();
        }}
      />
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button variant="destructive" disabled={locked} loading={reject.isPending} onClick={() => setRejecting(true)}>
          {t.cta.rejectSuggestion}
        </Button>
      </div>
      <RejectDialog
        open={rejecting}
        busy={reject.isPending}
        onCancel={() => setRejecting(false)}
        onConfirm={(note) => void confirmReject(note)}
      />
    </div>
  );
}
