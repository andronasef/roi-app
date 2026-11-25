import { Fragment, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminAuditLogs } from '@/lib/admin-api';
import { useI18n } from '@/lib/i18n';
import { EmptyState, ErrorBanner, SkeletonRows } from '@/pages/CatalogPage';

const ALL = 'all';
const ACTIONS = [
  'create_verse', 'update_verse', 'create_name_of_god', 'update_name_of_god', 'create_blessing',
  'update_blessing', 'soft_delete', 'restore', 'accept_suggestion', 'reject_suggestion',
];
const ENTITY_TYPES = ['verse', 'name_of_god', 'blessing', 'suggestion'];

const actionVariant = (action: string) =>
  action === 'soft_delete' || action === 'reject_suggestion'
    ? 'warning'
    : action.startsWith('create') || action === 'accept_suggestion'
      ? 'accent'
      : 'secondary';

/** Pretty-print when valid JSON, otherwise show the raw string; rendered only as escaped React text (T-03-16). */
function prettySummary(summaryJson: string): string {
  try {
    return JSON.stringify(JSON.parse(summaryJson), null, 2);
  } catch {
    return summaryJson;
  }
}

function Filter({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const { t } = useI18n();
  return (
    <div className="w-56 space-y-1">
      <span className="block text-sm font-bold">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t.audit.allOption}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AuditLogPage() {
  const { t, formatNumber, formatTimestamp } = useI18n();
  const [action, setAction] = useState(ALL);
  const [entityType, setEntityType] = useState(ALL);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const logs = useAdminAuditLogs({
    action: action === ALL ? null : action,
    entityType: entityType === ALL ? null : entityType,
  });

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t.nav.auditLog}</h2>
      <div className="flex flex-wrap items-end gap-3">
        <Filter label={t.audit.actionFilter} value={action} onChange={setAction} options={ACTIONS} />
        <Filter label={t.audit.entityFilter} value={entityType} onChange={setEntityType} options={ENTITY_TYPES} />
      </div>

      {logs.isError ? (
        <ErrorBanner onRetry={() => void logs.refetch()} />
      ) : logs.isLoading ? (
        <SkeletonRows />
      ) : logs.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.audit.timestamp}</TableHead>
              <TableHead>{t.audit.actor}</TableHead>
              <TableHead>{t.audit.action}</TableHead>
              <TableHead>{t.audit.entityType}</TableHead>
              <TableHead>{t.audit.entityId}</TableHead>
              <TableHead>{t.audit.contentVersion}</TableHead>
              <TableHead>{t.audit.summary}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.data.map((log) => {
              const open = expanded.has(log.id);
              return (
                <Fragment key={log.id}>
                  <TableRow data-testid="audit-row">
                    <TableCell className="text-sm">{formatTimestamp(log.createdAt)}</TableCell>
                    <TableCell dir="ltr" className="text-sm">{log.actorEmail}</TableCell>
                    <TableCell>
                      <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.entityType}</TableCell>
                    <TableCell dir="ltr" className="font-mono text-sm">{log.entityId}</TableCell>
                    <TableCell>{formatNumber(log.contentVersion)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => toggle(log.id)}>
                        {open ? t.audit.collapseSummary : t.audit.expandSummary}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {open ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <pre dir="ltr" data-testid="audit-summary" className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-start text-sm">
                          {prettySummary(log.summaryJson)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <EmptyState heading={t.empty.auditLogHeading} body={t.empty.auditLogBody} />
      )}
    </div>
  );
}
