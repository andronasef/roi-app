import { NodeViewWrapper } from '@tiptap/react';
import { User } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

/** Atomic {الاسم} pill. Never renders the raw token; no drag handlers (ProseMirror owns drag). */
export function NameChipView() {
  const { t } = useI18n();
  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      data-name-token="true"
      className="inline-flex cursor-grab select-none items-center gap-1 rounded-md border border-accent/40 bg-accent/15 px-2 py-0.5 align-baseline text-sm font-bold text-accent"
    >
      <User className="h-3.5 w-3.5" aria-hidden="true" />
      {t.editor.toolbar.chipDisplayLabel}
    </NodeViewWrapper>
  );
}
