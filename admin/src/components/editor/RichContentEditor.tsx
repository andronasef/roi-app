import { useEffect, type ReactNode } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Fragment, Slice } from '@tiptap/pm/model';
import { Bold, Heading2, Heading3, Italic, List, Quote, User } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n';
import {
  parseContentToDoc,
  serializeDocToContent,
  type EditorContentMode,
} from '@/lib/markdown-serializer';
import { cn } from '@/lib/utils';
import { NameTokenNode } from './NameTokenExtension';

export interface RichContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  mode: EditorContentMode;
  ariaLabel?: string;
  className?: string;
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          // Keep the editor selection: don't let the button steal focus on mousedown.
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          className={cn(
            'inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&_svg]:size-4',
            active && 'bg-secondary',
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Toolbar({ editor, mode }: { editor: Editor; mode: EditorContentMode }) {
  const { t } = useI18n();
  const tb = t.editor.toolbar;
  const chain = () => editor.chain().focus();
  return (
    <div role="toolbar" className="flex flex-wrap items-center gap-1 border-b border-border p-1">
      {mode === 'rich' ? (
        <>
          <ToolbarButton label={tb.bold} active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}>
            <Bold aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton label={tb.italic} active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}>
            <Italic aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton label={tb.h2} active={editor.isActive('heading', { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
            <Heading2 aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton label={tb.h3} active={editor.isActive('heading', { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
            <Heading3 aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton label={tb.bulletList} active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()}>
            <List aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton label={tb.blockquote} active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()}>
            <Quote aria-hidden="true" />
          </ToolbarButton>
        </>
      ) : null}
      <ToolbarButton label={tb.insertNameChip} onClick={() => chain().insertContent({ type: 'nameToken' }).run()}>
        <User aria-hidden="true" />
      </ToolbarButton>
    </div>
  );
}

/** Tiptap editor locked to dir="rtl"; `mode` picks plain verse text vs the 6-construct Markdown subset. */
export function RichContentEditor({ value, onChange, mode, ariaLabel, className }: RichContentEditorProps) {
  const rich = mode === 'rich';
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: rich ? { levels: [2, 3] } : false,
          bold: rich ? {} : false,
          italic: rich ? {} : false,
          bulletList: rich ? {} : false,
          blockquote: rich ? {} : false,
          listItem: rich ? {} : false,
          link: false,
          underline: false,
          code: false,
          codeBlock: false,
          strike: false,
          orderedList: false,
          horizontalRule: false,
        }),
        NameTokenNode,
      ],
      content: parseContentToDoc(value, mode),
      shouldRerenderOnTransaction: true, // toolbar active states
      editorProps: {
        attributes: {
          dir: 'rtl',
          lang: 'ar',
          role: 'textbox',
          'aria-multiline': 'true',
          ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
          class:
            'min-h-[140px] max-h-[360px] overflow-y-auto px-3 py-2 text-base leading-7 focus:outline-none [&_h2]:text-xl [&_h2]:font-bold [&_h3]:font-bold [&_ul]:list-disc [&_ul]:ps-6 [&_blockquote]:border-s-4 [&_blockquote]:border-accent/40 [&_blockquote]:ps-3 [&_p]:my-1',
        },
        // Plain-text clipboards (and everything in verse mode) become paragraphs + nameToken chips
        // (so a pasted {الاسم} turns into a chip); external HTML never enters the doc in verse mode.
        handlePaste(view, event) {
          const text = event.clipboardData?.getData('text/plain') ?? '';
          const html = event.clipboardData?.getData('text/html') ?? '';
          if (!text || !(mode === 'verse' || !html)) {
            return false;
          }
          const doc = view.state.schema.nodeFromJSON(parseContentToDoc(text, 'verse'));
          const slice = new Slice(Fragment.from(doc.content), 1, 1);
          view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
          return true;
        },
      },
      onUpdate: ({ editor: e }) => onChange(serializeDocToContent(e.getJSON(), mode)),
    },
    [mode],
  );

  // Sync external value changes, skipping our own echoes (prevents loops and caret/space loss).
  useEffect(() => {
    if (editor && serializeDocToContent(editor.getJSON(), mode) !== value) {
      editor.commands.setContent(parseContentToDoc(value, mode), { emitUpdate: false });
    }
  }, [editor, mode, value]);

  if (!editor) return null;
  return (
    <div className={cn('overflow-hidden rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-accent', className)}>
      <Toolbar editor={editor} mode={mode} />
      <EditorContent editor={editor} />
    </div>
  );
}
