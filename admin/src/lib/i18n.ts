import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { formatArabicDate, toArabicDigits } from '@roi/shared';

export type AdminLang = 'ar' | 'en';

export const ADMIN_LANG_STORAGE_KEY = 'roi_admin_lang';

const AR_COPY = {
  appName: 'روعي — لوحة الإدارة',
  appSubtitle: 'إدارة المحتوى والمراجعة',
  nav: {
    verses: 'الآيات',
    names: 'أسماء الله',
    blessings: 'البركات',
    suggestions: 'الاقتراحات',
    auditLog: 'سجل التعديلات',
    contentVersion: 'إصدار المحتوى',
    signOut: 'تسجيل الخروج',
    switchLanguage: 'English',
  },
  cta: {
    publishNew: 'نشر العنصر الجديد',
    saveChanges: 'حفظ التغييرات',
    addVerse: 'إضافة آية جديدة',
    addName: 'إضافة اسم جديد',
    addBlessing: 'إضافة بركة جديدة',
    acceptSuggestion: 'اعتماد ونشر الاقتراح',
    signInGoogle: 'تسجيل الدخول بحساب جوجل',
    backToCatalog: 'الرجوع إلى القائمة',
    keepItem: 'إبقاء العنصر',
    retryRequest: 'إعادة المحاولة',
    restoreItem: 'استعادة العنصر',
    editItem: 'تعديل العنصر',
    softDeleteItem: 'حذف العنصر مؤقتاً',
    rejectSuggestion: 'رفض الاقتراح',
    openInEditor: 'فتح في المحرر',
    reviewSuggestion: 'مراجعة',
    clearNeutral: 'تفريغ للاختبار المحايد',
    close: 'إغلاق',
  },
  empty: {
    catalogHeading: 'لا توجد عناصر في هذا القسم بعد',
    catalogBody: 'أضف أول عنصر ليصل للمستخدمين في التحديث القادم.',
    searchHeading: 'لا توجد نتائج مطابقة لبحثك',
    searchBody: 'جرّب كلمة أخرى بدون تشكيل أو امسح مربع البحث لعرض كل العناصر.',
    pendingSuggestionsHeading: 'لا توجد اقتراحات بانتظار المراجعة',
    pendingSuggestionsBody:
      'كل اقتراحات المستخدمين تمت مراجعتها. تفقد تبويب المقبولة أو المرفوضة عند الحاجة.',
    auditLogHeading: 'لا توجد تعديلات مسجلة بعد',
    auditLogBody:
      'ستظهر هنا كل عمليات الإضافة والتعديل والحذف والاستعادة والمراجعة تلقائياً.',
  },
  errors: {
    allowlist403:
      'هذا البريد غير مصرح له بالدخول إلى لوحة إدارة روعي. سجّل الدخول بحساب مشرف معتمد أو اطلب إضافتك إلى ADMIN_EMAILS.',
    braceRuleAdm06:
      'الرمز الوحيد المسموح به داخل الأقواس هو {الاسم} — احذف أي أقواس أخرى ثم أعد الحفظ.',
    sessionExpired401:
      'انتهت صلاحية الجلسة — مسودتك محفوظة هنا. سجّل الدخول بحساب جوجل للاستمرار بدون فقدان التعديلات.',
    concurrentModeration409:
      'تمت مراجعة هذا الاقتراح بالفعل بواسطة مشرف آخر. حدّث القائمة لعرض الحالة الحالية.',
    networkFailure:
      'تعذر الاتصال بالخادم حالياً — تأكد من الشبكة واضغط إعادة المحاولة دون إغلاق الصفحة.',
    emptyText: 'النص لا يمكن أن يكون فارغاً',
    requiredField: 'هذا الحقل مطلوب',
    googleNotConfigured: 'معرّف عميل جوجل غير مهيأ على الخادم.',
  },
  warnings: {
    oneSidedNameD06:
      'تنبيه غير مانع: شريحة {الاسم} موجودة في صيغة واحدة فقط. يمكنك الحفظ كما هو إذا كان هذا مقصوداً.',
  },
  confirmations: {
    softDelete: {
      title: 'حذف العنصر مؤقتاً',
      body: 'سيتم إخفاء هذا العنصر من التطبيق في التحديث القادم مع إمكانية استعادته لاحقاً من قائمة المحذوفات.',
      confirm: 'تأكيد الحذف المؤقت',
      cancel: 'إبقاء العنصر',
    },
    rejectSuggestion: {
      title: 'رفض الاقتراح',
      body: 'سيُزال الاقتراح من قائمة الانتظار فوراً ويُسجّل في سجل التعديلات.',
      noteLabel: 'ملاحظة داخلية (اختياري)',
      notePlaceholder: 'سبب الرفض أو ملاحظة للمشرفين...',
      confirm: 'تأكيد رفض الاقتراح',
      cancel: 'إبقاء قيد المراجعة',
    },
    unsavedChanges: {
      title: 'تغييرات غير محفوظة',
      body: 'لديك تعديلات لم تُحفظ بعد. هل تريد المغادرة وفقدان التغييرات؟',
      confirm: 'مغادرة الصفحة',
      cancel: 'متابعة التحرير',
    },
  },
  catalog: {
    searchPlaceholder: 'ابحث بدون تشكيل...',
    searchLabel: 'بحث',
    itemCount: 'عدد العناصر',
    activeTab: 'النشطة',
    deletedTab: 'المحذوفات',
    hasNameChip: 'يحتوي {الاسم}',
    dualGender: 'صيغتان',
    updatedAt: 'آخر تحديث',
    version: 'الإصدار',
    actions: 'إجراءات',
  },
  editor: {
    refLabel: 'المرجع',
    refPlaceholder: 'مثال: مزمور ٢٣: ١',
    titleLabel: 'العنوان',
    titlePlaceholder: 'أدخل العنوان...',
    verseRefLabel: 'الآية الداعمة (اختياري)',
    verseRefPlaceholder: 'مثال: يوحنا ٣: ١٦',
    sameForBothLabel: 'نفس النص للذكر والأنثى',
    maleTextLabel: 'صيغة الذكر',
    femaleTextLabel: 'صيغة الأنثى',
    singleTextLabel: 'النص',
    toolbar: {
      bold: 'عريض',
      italic: 'مائل',
      h2: 'عنوان رئيسي (H2)',
      h3: 'عنوان فرعي (H3)',
      bulletList: 'قائمة نقطية',
      blockquote: 'اقتباس',
      insertNameChip: 'إدراج {الاسم}',
      chipDisplayLabel: 'الاسم',
    },
    preview: {
      heading: 'معاينة الجوال المباشرة',
      testNameLabel: 'اسم التجربة',
      testNamePlaceholder: 'اكتب اسماً للتجربة...',
      defaultMaleName: 'مينا',
      defaultFemaleName: 'سارة',
      genderLabel: 'النوع',
      maleOption: 'ذكر',
      femaleOption: 'أنثى',
      neutralHint: 'وضع المعاينة المحايدة (بدون اسم)',
    },
  },
  moderation: {
    tabs: {
      pending: 'قيد المراجعة',
      accepted: 'المقبولة',
      rejected: 'المرفوضة',
    },
    submitterContext: 'بيانات المرسل',
    submitterEmail: 'البريد الإلكتروني',
    submittedAt: 'تاريخ الإرسال',
    historyCounts: 'السجل التاريخي للمرسل',
    acceptedCount: 'مقبولة',
    rejectedCount: 'مرفوضة',
    pendingCount: 'قيد المراجعة',
    moderationNote: 'ملاحظة المراجعة',
    refreshQueue: 'تحديث القائمة',
    emptyOther: 'لا توجد اقتراحات في هذا التبويب',
    suggestion: 'الاقتراح',
  },
  audit: {
    actionFilter: 'نوع الإجراء',
    entityFilter: 'نوع الكيان',
    allOption: 'الكل',
    timestamp: 'الوقت',
    actor: 'المشرف',
    action: 'الإجراء',
    entityType: 'الكيان',
    entityId: 'المعرف',
    contentVersion: 'الإصدار',
    summary: 'التفاصيل',
    expandSummary: 'عرض التفاصيل',
    collapseSummary: 'إخفاء التفاصيل',
  },
  toast: {
    saved: 'تم حفظ التغييرات بنجاح',
    published: 'تم نشر العنصر بنجاح',
    softDeleted: 'تم حذف العنصر مؤقتاً',
    restored: 'تمت استعادة العنصر بنجاح',
    suggestionAccepted: 'تم اعتماد الاقتراح ونشره',
    suggestionRejected: 'تم رفض الاقتراح',
  },
} as const;

type DeepWiden<T> = T extends string
  ? string
  : { [K in keyof T]: DeepWiden<T[K]> };

export type AdminCopy = DeepWiden<typeof AR_COPY>;

const EN_COPY: AdminCopy = {
  appName: "Ro'i Admin",
  appSubtitle: 'Content & Moderation',
  nav: {
    verses: 'Verses',
    names: 'Names of God',
    blessings: 'Blessings',
    suggestions: 'Suggestions',
    auditLog: 'Audit Log',
    contentVersion: 'Content Version',
    signOut: 'Sign Out',
    switchLanguage: 'العربية',
  },
  cta: {
    publishNew: 'Publish Content Item',
    saveChanges: 'Save Changes',
    addVerse: 'Add New Verse',
    addName: 'Add New Name',
    addBlessing: 'Add New Blessing',
    acceptSuggestion: 'Accept & Publish Suggestion',
    signInGoogle: 'Sign in with Google',
    backToCatalog: 'Back to Catalog',
    keepItem: 'Keep Item',
    retryRequest: 'Retry Request',
    restoreItem: 'Restore Item',
    editItem: 'Edit Item',
    softDeleteItem: 'Soft Delete Item',
    rejectSuggestion: 'Reject Suggestion',
    openInEditor: 'Open in Editor',
    reviewSuggestion: 'Review',
    clearNeutral: 'Clear for neutral',
    close: 'Close',
  },
  empty: {
    catalogHeading: 'No items in this catalog yet',
    catalogBody: 'Create the first item so it reaches mobile users on their next sync.',
    searchHeading: 'No items match your search',
    searchBody: 'Try another keyword or clear the search filter to view all catalog items.',
    pendingSuggestionsHeading: 'No pending suggestions to review',
    pendingSuggestionsBody:
      'All user submissions have been moderated. Switch to Accepted or Rejected to review history.',
    auditLogHeading: 'No audit entries recorded yet',
    auditLogBody:
      'Every content creation, edit, soft-delete, restore, and moderation decision will appear here.',
  },
  errors: {
    allowlist403:
      "This Google account is not on the Ro'i admin allowlist. Sign in with an authorized account or ask the owner to add it to ADMIN_EMAILS.",
    braceRuleAdm06:
      'Only the {الاسم} name chip is permitted inside curly braces — remove other {…} braces and try again.',
    sessionExpired401:
      'Your admin session expired — your unsaved edits are preserved. Sign in with Google below to continue saving.',
    concurrentModeration409:
      'This suggestion was already moderated by another admin. Refresh the queue to see its latest status.',
    networkFailure:
      'Could not reach the backend server — check your connection and select Retry Request without leaving this page.',
    emptyText: 'Text cannot be empty',
    requiredField: 'This field is required',
    googleNotConfigured: 'Google OAuth Client ID is not configured on the server.',
  },
  warnings: {
    oneSidedNameD06:
      'Non-blocking warning: The {الاسم} chip appears in only one gender variant. You may still save if intentional.',
  },
  confirmations: {
    softDelete: {
      title: 'Soft Delete Item',
      body: 'This item will be removed from mobile apps on the next delta sync and can be restored anytime from the Deleted filter.',
      confirm: 'Confirm Soft Delete',
      cancel: 'Keep Item',
    },
    rejectSuggestion: {
      title: 'Reject Suggestion',
      body: 'This suggestion will immediately leave the Pending queue and be recorded in the audit log.',
      noteLabel: 'Internal Note (Optional)',
      notePlaceholder: 'Reason for rejection or moderator note...',
      confirm: 'Confirm Reject Suggestion',
      cancel: 'Keep Pending',
    },
    unsavedChanges: {
      title: 'Unsaved Changes',
      body: 'You have unsaved edits. Leave this page and discard changes?',
      confirm: 'Leave Page',
      cancel: 'Keep Editing',
    },
  },
  catalog: {
    searchPlaceholder: 'Search without diacritics...',
    searchLabel: 'Search',
    itemCount: 'Items',
    activeTab: 'Active',
    deletedTab: 'Deleted',
    hasNameChip: 'Uses {الاسم}',
    dualGender: 'Dual Gender',
    updatedAt: 'Updated',
    version: 'Version',
    actions: 'Actions',
  },
  editor: {
    refLabel: 'Reference',
    refPlaceholder: 'e.g., مزمور ٢٣: ١',
    titleLabel: 'Title',
    titlePlaceholder: 'Enter Arabic title...',
    verseRefLabel: 'Supporting Verse (Optional)',
    verseRefPlaceholder: 'e.g., يوحنا ٣: ١٦',
    sameForBothLabel: 'Same text for male & female',
    maleTextLabel: 'Male Variant',
    femaleTextLabel: 'Female Variant',
    singleTextLabel: 'Content Text',
    toolbar: {
      bold: 'Bold',
      italic: 'Italic',
      h2: 'Heading 2',
      h3: 'Heading 3',
      bulletList: 'Bullet List',
      blockquote: 'Blockquote',
      insertNameChip: 'Insert Name Chip',
      chipDisplayLabel: 'الاسم',
    },
    preview: {
      heading: 'Live Mobile Preview',
      testNameLabel: 'Test Name',
      testNamePlaceholder: 'Type a test name...',
      defaultMaleName: 'مينا',
      defaultFemaleName: 'سارة',
      genderLabel: 'Gender',
      maleOption: 'Male',
      femaleOption: 'Female',
      neutralHint: 'Neutral preview mode (no name)',
    },
  },
  moderation: {
    tabs: {
      pending: 'Pending',
      accepted: 'Accepted',
      rejected: 'Rejected',
    },
    submitterContext: 'Submitter Context',
    submitterEmail: 'Email',
    submittedAt: 'Submitted At',
    historyCounts: 'Submitter History',
    acceptedCount: 'Accepted',
    rejectedCount: 'Rejected',
    pendingCount: 'Pending',
    moderationNote: 'Moderation Note',
    refreshQueue: 'Refresh Queue',
    emptyOther: 'No suggestions in this tab',
    suggestion: 'Suggestion',
  },
  audit: {
    actionFilter: 'Action',
    entityFilter: 'Entity Type',
    allOption: 'All',
    timestamp: 'Timestamp',
    actor: 'Admin',
    action: 'Action',
    entityType: 'Entity',
    entityId: 'Entity ID',
    contentVersion: 'Version',
    summary: 'Summary',
    expandSummary: 'Show Details',
    collapseSummary: 'Hide Details',
  },
  toast: {
    saved: 'Changes saved',
    published: 'Content item published',
    softDeleted: 'Item soft-deleted',
    restored: 'Item restored',
    suggestionAccepted: 'Suggestion accepted & published',
    suggestionRejected: 'Suggestion rejected',
  },
};

export const ADMIN_DICTIONARY: Record<AdminLang, AdminCopy> = {
  ar: AR_COPY,
  en: EN_COPY,
};

/** Format numeric counts and version numbers using Arabic-Indic digits in 'ar' and ASCII in 'en'. */
export function formatNumber(value: number, lang: AdminLang): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  const raw = String(value);
  return lang === 'ar' ? toArabicDigits(raw) : raw;
}

/** Format an epoch-ms timestamp using formatArabicDate in 'ar' and short ISO-style in 'en'. */
export function formatTimestamp(ms: number, lang: AdminLang): string {
  if (!Number.isFinite(ms)) {
    return '';
  }
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  if (lang === 'ar') {
    return `${formatArabicDate(date)} · ${toArabicDigits(hh)}:${toArabicDigits(mm)}`;
  }

  const yyyy = String(date.getFullYear());
  const mon = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mon}-${dd} ${hh}:${mm}`;
}

function readStoredLang(): AdminLang {
  if (typeof window === 'undefined') {
    return 'ar';
  }
  try {
    const stored = window.localStorage.getItem(ADMIN_LANG_STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') {
      return stored;
    }
  } catch {
    // Ignore storage access errors in restricted browser contexts.
  }
  return 'ar';
}

function writeStoredLang(lang: AdminLang): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(ADMIN_LANG_STORAGE_KEY, lang);
  } catch {
    // Ignore storage access errors in restricted browser contexts.
  }
}

export interface I18nContextValue {
  lang: AdminLang;
  dir: 'rtl' | 'ltr';
  setLang: (next: AdminLang) => void;
  toggleLang: () => void;
  t: AdminCopy;
  formatNumber: (value: number) => string;
  formatTimestamp: (ms: number) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: ReactNode;
  initialLang?: AdminLang;
}

export function I18nProvider({ children, initialLang }: I18nProviderProps) {
  const [lang, setLangState] = useState<AdminLang>(() => initialLang ?? readStoredLang());

  const dir: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
    }
  }, [lang, dir]);

  const setLang = useCallback((next: AdminLang) => {
    setLangState(next);
    writeStoredLang(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next: AdminLang = prev === 'ar' ? 'en' : 'ar';
      writeStoredLang(next);
      return next;
    });
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      dir,
      setLang,
      toggleLang,
      t: ADMIN_DICTIONARY[lang],
      formatNumber: (v: number) => formatNumber(v, lang),
      formatTimestamp: (ms: number) => formatTimestamp(ms, lang),
    }),
    [lang, dir, setLang, toggleLang],
  );

  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
