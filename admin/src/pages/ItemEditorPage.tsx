import { useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import type { ContentKind } from '@roi/shared';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toaster';
import { LivePreviewCard } from '@/components/editor/LivePreviewCard';
import { RichContentEditor } from '@/components/editor/RichContentEditor';
import { useI18n } from '@/lib/i18n';
import {
  createContentFormSchema,
  hasOneSidedNameToken,
  normalizeOptionalVerseRef,
  type ContentFormValues,
} from '@/lib/validation';

/** What the page hands to the caller on Save (already normalized for the GraphQL mutation). */
export interface ContentPayload {
  kind: ContentKind;
  /** `ref` for verses, `title` for names of God / blessings. */
  refOrTitle: string;
  verseRef: string | null;
  text: string;
  textFemale: string | null;
}

export interface ItemEditorPageProps {
  kind: ContentKind;
  /** Existing item (edit) or a suggestion payload (promotion); omit for create. */
  initialValues?: Partial<Omit<ContentPayload, 'kind'>>;
  onSubmitPayload: (payload: ContentPayload) => Promise<void>;
  submitLabel?: string;
  /** Slot above the form, e.g. the Submitter Context card in suggestion review. */
  header?: ReactNode;
  /** Back navigation; guarded by an unsaved-changes dialog when the form is dirty. */
  onBack?: () => void;
  /** Blocks Save, e.g. when the suggestion was already moderated or a sibling mutation is in flight. */
  submitDisabled?: boolean;
}

export function ItemEditorPage({
  kind,
  initialValues,
  onSubmitPayload,
  submitLabel,
  header,
  onBack,
  submitDisabled,
}: ItemEditorPageProps) {
  const { t } = useI18n();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const schema = useMemo(() => createContentFormSchema(kind), [kind]);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ContentFormValues>({
    // Schema input has `verseRef: unknown` (preprocess); the form itself always holds strings.
    resolver: zodResolver(schema) as unknown as Resolver<ContentFormValues>,
    defaultValues: {
      kind,
      refOrTitle: initialValues?.refOrTitle ?? '',
      verseRef: initialValues?.verseRef ?? '',
      sameForBoth: !initialValues?.textFemale,
      text: initialValues?.text ?? '',
      textFemale: initialValues?.textFemale ?? '',
    },
  });

  const [sameForBoth, text, textFemale, verseRef] = watch(['sameForBoth', 'text', 'textFemale', 'verseRef']);
  const mode = kind === 'verse' ? 'verse' : 'rich';
  const oneSided = hasOneSidedNameToken(sameForBoth, text, textFemale);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmitPayload({
        kind,
        refOrTitle: values.refOrTitle.trim(),
        verseRef: kind === 'blessing' ? normalizeOptionalVerseRef(values.verseRef) : null,
        text: values.text,
        // Hidden female draft stays in form state while "same" is ON; it is only dropped here.
        textFemale: values.sameForBoth ? null : values.textFemale,
      });
      toast.success(t.toast.saved);
    } catch (error) {
      // Form + editor state stay mounted so the admin can retry (or re-auth) without losing work.
      toast.error(error instanceof Error ? error.message : t.errors.networkFailure);
    }
  });

  const refLabel = kind === 'verse' ? t.editor.refLabel : t.editor.titleLabel;
  const refPlaceholder = kind === 'verse' ? t.editor.refPlaceholder : t.editor.titlePlaceholder;
  const error = (msg?: string) =>
    msg ? (
      <p role="alert" className="text-sm font-bold text-destructive">
        {msg}
      </p>
    ) : null;

  const textEditor = (name: 'text' | 'textFemale', label: string) => (
    <div className="space-y-1">
      <span className="block text-sm font-bold">{label}</span>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <RichContentEditor value={field.value} onChange={field.onChange} mode={mode} ariaLabel={label} />
        )}
      />
      {error(errors[name]?.message)}
    </div>
  );

  return (
    <div className="space-y-4">
      {header}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="item-ref-or-title">{refLabel}</Label>
            <Input id="item-ref-or-title" dir="rtl" lang="ar" placeholder={refPlaceholder} {...register('refOrTitle')} />
            {error(errors.refOrTitle?.message)}
          </div>

          {kind === 'blessing' ? (
            <div className="space-y-1">
              <Label htmlFor="item-verse-ref">{t.editor.verseRefLabel}</Label>
              <Input id="item-verse-ref" dir="rtl" lang="ar" placeholder={t.editor.verseRefPlaceholder} {...register('verseRef')} />
              {error(errors.verseRef?.message as string | undefined)}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Switch
              id="item-same-for-both"
              checked={sameForBoth}
              aria-label={t.editor.sameForBothLabel}
              onCheckedChange={(next) => setValue('sameForBoth', next, { shouldDirty: true })}
            />
            <Label htmlFor="item-same-for-both">{t.editor.sameForBothLabel}</Label>
          </div>

          {sameForBoth ? (
            textEditor('text', t.editor.singleTextLabel)
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {textEditor('text', t.editor.maleTextLabel)}
              {textEditor('textFemale', t.editor.femaleTextLabel)}
            </div>
          )}

          {oneSided ? (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning p-3 text-sm font-bold text-warning-foreground"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{t.warnings.oneSidedNameD06}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={isSubmitting} disabled={submitDisabled}>
              {submitLabel ?? t.cta.saveChanges}
            </Button>
            {onBack ? (
              <Button type="button" variant="outline" onClick={() => (isDirty ? setConfirmLeave(true) : onBack())}>
                {t.cta.backToCatalog}
              </Button>
            ) : null}
          </div>
        </form>

        <LivePreviewCard
          kind={kind}
          text={text}
          textFemale={sameForBoth ? null : textFemale}
          verseRef={kind === 'blessing' ? verseRef : null}
          className="self-start xl:sticky xl:top-6"
        />
      </div>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmations.unsavedChanges.title}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmations.unsavedChanges.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.confirmations.unsavedChanges.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => onBack?.()}>{t.confirmations.unsavedChanges.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const ItemEditorWorkspace = ItemEditorPage;
