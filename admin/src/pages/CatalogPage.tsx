import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { matches, NAME_TOKEN, type ContentKind } from '@roi/shared';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toaster';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  KIND_CONFIG,
  isContentConflict,
  useAdminCatalog,
  useRestore,
  useSaveContent,
  useSoftDelete,
  type CatalogItem,
} from '@/lib/admin-api';
import { useI18n } from '@/lib/i18n';
import { ItemEditorPage } from '@/pages/ItemEditorPage';

type Tab = 'active' | 'deleted';

function RowAction({ label, onClick, disabled, children }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} onClick={onClick} disabled={disabled}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-bold text-destructive">
      <p>{t.errors.networkFailure}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t.cta.retryRequest}
      </Button>
    </div>
  );
}

export function EmptyState({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-12 text-center">
      <h3 className="text-lg font-bold">{heading}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div data-testid="skeleton-rows" className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function CatalogPage({ kind }: { kind: ContentKind }) {
  const { t, formatNumber, formatTimestamp } = useI18n();
  const navigate = useNavigate();
  const { route } = KIND_CONFIG[kind];
  const catalog = useAdminCatalog(kind);
  const softDelete = useSoftDelete();
  const restore = useRestore();
  const [tab, setTab] = useState<Tab>('active');
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState<CatalogItem | null>(null);

  const rows = useMemo(
    () =>
      (catalog.data ?? []).filter(
        (item) =>
          (tab === 'deleted') === (item.deletedAt !== null) &&
          matches([item.label, item.verseRef, item.text, item.textFemale].filter(Boolean).join(' '), query),
      ),
    [catalog.data, tab, query],
  );

  const title = { verse: t.nav.verses, name_of_god: t.nav.names, blessing: t.nav.blessings }[kind];
  const addLabel = { verse: t.cta.addVerse, name_of_god: t.cta.addName, blessing: t.cta.addBlessing }[kind];
  const refHeading = kind === 'verse' ? t.editor.refLabel : t.editor.titleLabel;
  const busy = softDelete.isPending || restore.isPending;

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errors.networkFailure);
    }
  };

  const confirmDelete = async () => {
    const item = toDelete;
    setToDelete(null);
    if (item) {
      await run(() => softDelete.mutateAsync({ kind, id: item.id }), t.toast.softDeleted);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <Button onClick={() => navigate(`/${route}/new`)}>
          <Plus aria-hidden="true" />
          {addLabel}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="active">{t.catalog.activeTab}</TabsTrigger>
            <TabsTrigger value="deleted">{t.catalog.deletedTab}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          dir="rtl"
          lang="ar"
          type="search"
          aria-label={t.catalog.searchLabel}
          placeholder={t.catalog.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <Badge variant="secondary" data-testid="item-count">
          {t.catalog.itemCount}: {formatNumber(rows.length)}
        </Badge>
      </div>

      {catalog.isError ? (
        <ErrorBanner onRetry={() => void catalog.refetch()} />
      ) : catalog.isLoading ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        query.trim() ? (
          <EmptyState heading={t.empty.searchHeading} body={t.empty.searchBody} />
        ) : (
          <EmptyState heading={t.empty.catalogHeading} body={t.empty.catalogBody} />
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{refHeading}</TableHead>
              <TableHead>{t.editor.singleTextLabel}</TableHead>
              <TableHead>{t.catalog.updatedAt}</TableHead>
              <TableHead>{t.catalog.version}</TableHead>
              <TableHead>{t.catalog.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id} data-testid="catalog-row">
                <TableCell dir="rtl" lang="ar" className="font-bold">
                  {item.label}
                </TableCell>
                <TableCell className="max-w-md">
                  <p dir="rtl" lang="ar" className="line-clamp-2">
                    {item.text}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.text.includes(NAME_TOKEN) || item.textFemale?.includes(NAME_TOKEN) ? (
                      <Badge variant="accent">{t.catalog.hasNameChip}</Badge>
                    ) : null}
                    {item.textFemale ? <Badge variant="secondary">{t.catalog.dualGender}</Badge> : null}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{formatTimestamp(item.updatedAt)}</TableCell>
                <TableCell>{formatNumber(item.version)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <RowAction label={t.cta.editItem} onClick={() => navigate(`/${route}/${item.id}`)}>
                      <Pencil />
                    </RowAction>
                    {tab === 'active' ? (
                      <RowAction label={t.cta.softDeleteItem} onClick={() => setToDelete(item)} disabled={busy}>
                        <Trash2 />
                      </RowAction>
                    ) : (
                      <RowAction
                        label={t.cta.restoreItem}
                        disabled={busy}
                        onClick={() => void run(() => restore.mutateAsync({ kind, id: item.id }), t.toast.restored)}
                      >
                        <RotateCcw />
                      </RowAction>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmations.softDelete.title}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmations.softDelete.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.confirmations.softDelete.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>{t.confirmations.softDelete.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Create (`/:route/new`) and edit (`/:route/:id`) screens: ItemEditorPage wired to the save mutation. */
export function ItemEditorRoute({ kind }: { kind: ContentKind }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams();
  const { route } = KIND_CONFIG[kind];
  const catalog = useAdminCatalog(kind);
  const save = useSaveContent(kind);
  const back = () => navigate(`/${route}`);
  // Version the next save is based on: set when the form loads, and rebased only after a conflict was shown to the admin.
  const loaded = useRef<{ id: string; version: number } | null>(null);

  if (id && catalog.isError) {
    return <ErrorBanner onRetry={() => void catalog.refetch()} />;
  }
  if (id && catalog.isLoading) {
    return <SkeletonRows rows={3} />;
  }
  const item = id ? catalog.data?.find((i) => i.id === id) : undefined;
  if (id && !item) {
    return <Navigate to={`/${route}`} replace />; // stale or unknown id
  }
  if (id && item && loaded.current?.id !== id) {
    loaded.current = { id, version: item.version };
  }

  return (
    <ItemEditorPage
      key={id ?? 'new'}
      kind={kind}
      initialValues={
        item && {
          refOrTitle: item.label,
          verseRef: item.verseRef,
          text: item.text,
          textFemale: item.textFemale,
        }
      }
      submitLabel={id ? t.cta.saveChanges : t.cta.publishNew}
      onBack={back}
      onSubmitPayload={async (payload) => {
        try {
          await save.mutateAsync({ id, payload, expectedVersion: loaded.current?.version });
        } catch (error) {
          if (isContentConflict(error)) {
            const { data } = await catalog.refetch();
            const latest = data?.find((i) => i.id === id);
            // Rebase so the next explicit save overwrites the other admin's edit instead of conflicting forever.
            if (id && latest) loaded.current = { id, version: latest.version };
            throw new Error(t.errors.contentConflict);
          }
          throw error;
        }
        back();
      }}
    />
  );
}
