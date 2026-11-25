import type { Gender } from './repository';

export interface GenderedCopy {
  readonly male: string;
  readonly female: string;
}

/**
 * Gender-aware Egyptian Arabic UI copy dictionary covering Onboarding, Home,
 * ليا أنا, and Settings (PERS-04, D-03, 04-UI-SPEC.md Copywriting Contract).
 */
export const UI_COPY = {
  onboarding1Tagline: {
    male: 'كلمتك، وهويتك، وصلاتك… في مكان واحد، وحد بيرعاك وإنت جواه.',
    female: 'كلمتك، وهويتك، وصلاتك… في مكان واحد، وحد بيرعاكي وإنتي جواه.',
  },
  onboarding1Cta: {
    male: 'ابدأ الرحلة',
    female: 'ابدئي الرحلة',
  },
  onboarding2Heading: {
    male: 'نحب نناديك بإيه؟',
    female: 'نحب نناديكي بإيه؟',
  },
  onboarding2Subtext: {
    male: 'عشان الآيات والكلام جوه روعي يكون مكتوب ليك بالاسم',
    female: 'عشان الآيات والكلام جوه روعي يكون مكتوب ليكي بالاسم',
  },
  onboarding2NamePlaceholder: {
    male: 'اكتب اسمك هنا',
    female: 'اكتبي اسمك هنا',
  },
  onboarding2Cta: {
    male: 'احفظ اسمي وكمّل',
    female: 'احفظي اسمي وكمّلي',
  },
  onboarding2MissingError: {
    male: 'اكتب اسمك واختار ولد أو بنت عشان روعي يكلمك بطريقتك',
    female: 'اكتبي اسمك واختاري ولد أو بنت عشان روعي يكلمك بطريقتك',
  },
  onboarding3HeadingPrefix: {
    male: 'اختار آية تبدأ بيها، يا ',
    female: 'اختاري آية تبدأي بيها، يا ',
  },
  onboarding3Helper: {
    male: 'دوس على النجمة ⭐ عشان تحفظها في مفضلتك، أو كمّل وتختار بعدين',
    female: 'دوسي على النجمة ⭐ عشان تحفظيها في مفضلتك، أو كمّلي وتختاري بعدين',
  },
  onboarding3GoogleDialogBody: {
    male: 'حساب جوجل هيسمح لك تبعت اقتراحات لكل الناس دلوقتي، وهيجهّز نسخة احتياطية خاصة بيك في مجلد التطبيق المخفي على جوجل درايف في التحديث الجاي — من غير ما نشوف أي حاجة من بياناتك',
    female:
      'حساب جوجل هيسمح لك تبعتي اقتراحات لكل الناس دلوقتي، وهيجهّز نسخة احتياطية خاصة بيكي في مجلد التطبيق المخفي على جوجل درايف في التحديث الجاي — من غير ما نشوف أي حاجة من بياناتك',
  },
  onboardingGoogleError: {
    male: 'تعذر ربط حساب جوجل دلوقتي — تقدر تكمل من غير تسجيل وتربطه بعدين من الإعدادات',
    female:
      'تعذر ربط حساب جوجل دلوقتي — تقدري تكمّلي من غير تسجيل وتربطيه بعدين من الإعدادات',
  },
  homeGreetingPrefix: {
    male: 'أهلاً بيك يا ',
    female: 'أهلاً بيكي يا ',
  },
  homeGreetingNeutral: {
    male: 'أهلاً بيك في روعي',
    female: 'أهلاً بيكي في روعي',
  },
  homeSubtitle: {
    male: 'روعي فاكرلك يومك',
    female: 'روعي فاكرلك يومك',
  },
  homeIntroHeading: {
    male: 'أهلاً بيك في أدواتك',
    female: 'أهلاً بيكي في أدواتك',
  },
  homeIntroBody: {
    male: 'هنا مكان أدواتك اليومية في روعي — دلوقتي هتلاقي أداة ليا أنا جاهزة ليك، وباقي الأدوات هتنور هنا واحدة واحدة. تقدر ترتبهم أو تخفي اللي مش محتاجه من تعديل الأدوات.',
    female:
      'هنا مكان أدواتك اليومية في روعي — دلوقتي هتلاقي أداة ليا أنا جاهزة ليكي، وباقي الأدوات هتنور هنا واحدة واحدة. تقدري ترتبيهم أو تخفي اللي مش محتاجاه من تعديل الأدوات.',
  },
  homeIntroDismiss: {
    male: 'فهمت، كمّل',
    female: 'فهمت، كمّلي',
  },
  leyaanaLongPressHint: {
    male: 'اضغط مطولاً للنسخ',
    female: 'اضغطي مطولاً للنسخ',
  },
  leyaanaCopyQuestion: {
    male: 'الآية دي ليك ولا هتبعتها لحد؟',
    female: 'الآية دي ليكي ولا هتبعتيها لحد؟',
  },
  leyaanaEmptyFavoritesBody: {
    male: 'دوس على النجمة ⭐ في أي آية أو اسم من أسماء الله أو بركة عشان تلاقيها هنا بسهولة',
    female:
      'دوسي على النجمة ⭐ في أي آية أو اسم من أسماء الله أو بركة عشان تلاقيها هنا بسهولة',
  },
  leyaanaEmptyHistoryBody: {
    male: 'كل آية أسبوعية أو شهرية بتوصلك هتتحفظ هنا تلقائي عشان ترجع لها في أي وقت',
    female:
      'كل آية أسبوعية أو شهرية بتوصلك هتتحفظ هنا تلقائي عشان ترجعي لها في أي وقت',
  },
  leyaanaEmptySearchBody: {
    male: 'جرّب كلمة تانية أو امسح البحث عشان تشوف كل العناصر',
    female: 'جرّبي كلمة تانية أو امسحي البحث عشان تشوفي كل العناصر',
  },
  leyaanaEmptyPersonalBody: {
    male: 'تقدر تضيف آية أو اسم من أسماء الله أو بركة خاصة بيك من زر أضف عنصر',
    female:
      'تقدري تضيفي آية أو اسم من أسماء الله أو بركة خاصة بيكي من زر أضف عنصر',
  },
  leyaanaPersonalFormEmptyError: {
    male: 'اكتب العنوان والنص الأول عشان نقدر نحفظ العنصر',
    female: 'اكتبي العنوان والنص الأول عشان نقدر نحفظ العنصر',
  },
  leyaanaDeleteConfirmBody: {
    male: 'متأكد إنك عايز تحذف العنصر ده؟ تقدر ترجع تضيفه تاني في أي وقت.',
    female:
      'متأكدة إنك عايزة تحذفي العنصر ده؟ تقدري ترجعي تضيفيه تاني في أي وقت.',
  },
  leyaanaSuggestOfflineError: {
    male: 'محتاجين إنترنت عشان نبعت اقتراحك — أول ما الإنترنت يرجع جرّب تبعت الاقتراح تاني',
    female:
      'محتاجين إنترنت عشان نبعت اقتراحك — أول ما الإنترنت يرجع جرّبي تبعتي الاقتراح تاني',
  },
  leyaanaSuggestSubmitError: {
    male: 'ما قدرناش نبعت الاقتراح دلوقتي — تأكد من الإنترنت واضغط اقترح للكل تاني',
    female:
      'ما قدرناش نبعت الاقتراح دلوقتي — اتأكدي من الإنترنت واضغطي اقترح للكل تاني',
  },
  settingsEditPrompt: {
    male: 'عدّل اسمك أو النوع عشان روعي يظبط كلامه ليك',
    female: 'عدّلي اسمك أو النوع عشان روعي يظبط كلامه ليكي',
  },
  settingsGoogleConnectHint: {
    male: 'اربط حساب جوجل عشان تقدر تبعت اقتراحات للكل وتجهّز النسخة الاحتياطية',
    female:
      'اربطي حساب جوجل عشان تقدري تبعتي اقتراحات للكل وتجهّزي النسخة الاحتياطية',
  },
  settingsShareCta: {
    male: 'شارك التطبيق',
    female: 'شاركي التطبيق',
  },
  settingsRateCta: {
    male: 'قيّم التطبيق',
    female: 'قيّمي التطبيق',
  },
  settingsHelpCta: {
    male: 'اطلب مساعدة',
    female: 'اطلبي مساعدة',
  },
  intercessionEmptyBody: {
    male: 'أضف أول صلاة أو شخص بتصلي عشانه من زر أضف صلاة فوق عشان روعي يفتكر معاك',
    female:
      'أضيفي أول صلاة أو شخص بتصلي عشانه من زر أضف صلاة فوق عشان روعي يفتكر معاكي',
  },
  intercessionSearchEmptyBody: {
    male: 'جرّب كلمة تانية أو امسح البحث عشان تشوف كل الصلوات',
    female: 'جرّبي كلمة تانية أو امسحي البحث عشان تشوفي كل الصلوات',
  },
  answeredEmptyBody: {
    male: 'لما ربنا يستجيب صلاة وتعلم عليها اتستجابت، هتفضل محفوظة هنا تشجعك',
    female:
      'لما ربنا يستجيب صلاة وتعلمي عليها اتستجابت، هتفضل محفوظة هنا تشجعك',
  },
  deletePrayerBody: {
    male: 'متأكد إنك عايز تحذف الصلاة دي؟ مش هتظهر تاني في القائمة.',
    female: 'متأكدة إنك عايزة تحذفي الصلاة دي؟ مش هتظهر تاني في القائمة.',
  },
  clearGratitudeBody: {
    male: 'لو مسحت الكلام كله، اليوم ده هيتشال من الدفتر. متأكد؟',
    female: 'لو مسحتي الكلام كله، اليوم ده هيتشال من الدفتر. متأكدة؟',
  },
  notificationDeniedError: {
    male: 'الإشعارات مقفولة من إعدادات الموبايل — افتحها من الإعدادات عشان نقدر نبعتلك التذكير بالليل',
    female:
      'الإشعارات مقفولة من إعدادات الموبايل — افتحيها من الإعدادات عشان نقدر نبعتلك التذكير بالليل',
  },
} as const satisfies Record<string, GenderedCopy>;

export type UiCopyKey = keyof typeof UI_COPY;

/** Resolve a gender-aware Egyptian Arabic UI string, defaulting safely to male/neutral. */
export function uiCopy(key: UiCopyKey, gender: Gender = 'male'): string {
  const entry = UI_COPY[key];
  return gender === 'female' ? entry.female : entry.male;
}
