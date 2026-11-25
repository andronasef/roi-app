# Phase 2: Content Backend & First Download - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-25
**Phase:** 02-content-backend-first-download
**Areas discussed:** بوابة التحميل الأول والأوفلاين (HOME-06/07), استيراد Sanity القديم (BE-07), الاستضافة والأمان على Dokploy (BE-04/06), الاقتراحات المربوطة بحساب Google (BE-03)

---

## بوابة التحميل الأول والأوفلاين (HOME-06/07)

### Q1: شكل التحميل الأول على الشاشة
| Option | Description | Selected |
|--------|-------------|----------|
| شريط تقدم هادي + اسم المرحلة الحالية (الآيات، أسماء الله، البركات) | بدون أرقام تقنية معقدة | ✓ |
| شاشة بسيطة جداً بدون نسب مئوية | رسالة ترحيب ورقي دافئ + مؤشر تحميل فقط | |
| تفاصيل كاملة بالنسبة المئوية وعدد العناصر المحمّلة لكل نوع | تفاصيل رقمية لكل قسم | |
| أنت قرر (You decide) | الأنسب لروح التطبيق | |

**User's choice:** شريط تقدم هادي + اسم المرحلة الحالية (بدون أرقام تقنية معقدة).

### Q2: التصرف عند انقطاع الإنترنت في نص التحميل الأول
| Option | Description | Selected |
|--------|-------------|----------|
| استكمال تلقائي من آخر ملف خلص + زر "جرّب تاني" + Transaction واحدة | لا يُطبق أي محتوى رسمياً إلا بعد اكتمال الـ 3 أقسام معاً | ✓ |
| رسالة "النت فصل، كمّل التحميل" مع زر "استكمال" يدوي فقط | بدون إعادة تحميل تلقائية | |
| مسح الكاش المؤقت وإعادة الـ 3 أقسام من الأول | إعادة كاملة عند الانقطاع | |
| أنت قرر (You decide) | تفويض الاختيار | |

**User's choice:** استكمال تلقائي من آخر ملف + زر يدوي، والتطبيق داخل Transaction واحدة بعد اكتمال الثلاثة.

### Q3: مزامنة الدلتا (`contentVersion`) في الفتحات اللاحقة
| Option | Description | Selected |
|--------|-------------|----------|
| فحص صامت في الخلفية عند فتح التطبيق (بحد أقصى ذكي مثل كل ٦ ساعات) | يطبق الدلتا فوراً بدون تعطيل، وأوفلاين يكمل عادي | ✓ |
| فحص في الخلفية + رسالة Toast صغيرة "تم تحديث المحتوى" | إشعار بصري بسيط | |
| تحديث يدوي فقط من الإعدادات | بدون فحص تلقائي عند الفتح | |
| أنت قرر (You decide) | تفويض الاختيار | |

**User's choice:** فحص صامت في الخلفية عند الفتح بحد أقصى زمني ذكي، وتطبيق فوري للدلتا بدون إزعاج.

### Q4: نبرة شاشة الأوفلاين وما يظهر بعد التحميل في Phase 2
| Option | Description | Selected |
|--------|-------------|----------|
| رسالة مصرية دافئة + زر "جرّب تاني"، وبعد التحميل شاشة "المكتبة جاهزة" | تعرض أعداد الآيات والأسماء والبركات حتى تُبنى شاشات Phase 4 | ✓ |
| شاشة مختصرة بكلمتين ("افتح الإنترنت") والدخول للشاشة الحالية | عرض contentVersion فقط | |
| معاينة كاملة لقوائم الآيات والأسماء والبركات في Phase 2 | تداخل مع نطاق Phase 4 | |
| أنت قرر (You decide) | تفويض الاختيار | |

**User's choice:** شاشة أوفلاين مصرية دافئة + شاشة "المكتبة جاهزة" في نهاية Phase 2.

---

## استيراد Sanity القديم (BE-07)

| Option | Description | Selected |
|--------|-------------|----------|
| يدعم الاتنين: Sanity API أو ملف تصدير محلي | ربط مباشر + fallback ملف محلي | |
| Sanity API مباشرة فقط | Project ID + Dataset + Token | |
| ملف `.ndjson` / `.json` محلي فقط | بدون اتصال بـ Sanity API | |
| **Freeform override (Owner)** | استبعاد Sanity من تعقيد Phase 2 بالكامل | ✓ |

**User's choice:** استبعاد استيراد Sanity من Phase 2 بالكامل.
**Notes:** المالك طلب عدم التفكير أو التعقيد في موضوع Sanity الآن، وسيقوم بتصدير JSON بنفسه ومعالجته لاحقاً بعد انتهاء المرحلة. تم اعتماد بيانات seed/JSON محلية نظيفة للاختبار في Phase 2.

---

## الاستضافة والأمان على Dokploy (BE-04/06)

### Q1: الدومينات وقفل الـ CORS
| Option | Description | Selected |
|--------|-------------|----------|
| إعداد مرن عبر `env` (`API_BASE_URL` و `ADMIN_ORIGINS`) | يقبل دومين مؤقت على Dokploy الآن ويُقفل على النهائي لاحقاً | ✓ |
| دومينات ثابتة جاهزة حالياً | تحديدها فوراً | |
| استضافة بدومين تلقائي فقط بدون تخصيص | `traefik` / `sslip.io` | |

**User's choice:** متغيرات بيئة مرنة عبر `env`.

### Q2: النسخ الاحتياطي لـ SQLite واختبار الاسترجاع
| Option | Description | Selected |
|--------|-------------|----------|
| Volume ثابت + سكريبت SQLite online backup + اختبار restore فعلي | جاهز للربط لاحقاً بـ Dokploy Backup / S3 | ✓ |
| ميزة Dokploy Volume Backup إلى S3 / R2 فوراً | إعداد تخزين سحابي من الآن | |
| نسخ احتياطي محلي يومي فقط بدون S3 | على السيرفر فقط | |
| أنت قرر (You decide) | تفويض الاختيار | |

**User's choice:** Persistent volume على Dokploy + سكريبت online backup + اختبار restore فعلي في Phase 2.

### Q3: مراقبة التوقف (Uptime Monitor)
| Option | Description | Selected |
|--------|-------------|----------|
| Endpoint `/health` يفحص SQLite والـ snapshots + تجهيز UptimeRobot | تنبيه إيميل/تيليجرام مجاناً | ✓ |
| Uptime Kuma / Healthchecks مستضاف ذاتياً | على نفس السيرفر | |
| تجهيز `/health` فقط وتأجيل التنبيه لـ Phase 9 | تأجيل المراقبة | |
| أنت قرر (You decide) | تفويض الاختيار | |

**User's choice:** `/health` endpoint + تجهيز الربط مع UptimeRobot لتنبيهات الإيميل/تيليجرام.

### Q4: طريقة نشر Dokploy وقفل GraphQL
| Option | Description | Selected |
|--------|-------------|----------|
| نشر مباشر من Git Repo بـ `Dockerfile` داخل `backend/` + إقفال Introspection في `production` | يعمل Playground محلياً فقط ويُقفل في `NODE_ENV=production` | ✓ |
| بناء صورة Docker ورفعها على GHCR / Registry | سحب صورة مبنية مسبقاً | |
| تشغيل محلي وتأجيل رفع Dokploy للمرحلة القادمة | بدون نشر حي الآن | |

**User's choice:** نشر Git مباشر على Dokploy بـ `Dockerfile` وإقفال GraphQL Playground/Introspection في `production`.

---

## الاقتراحات المربوطة بحساب Google (BE-03)

### Q1 & Q2: هوية مُرسل الاقتراحات وتدفق التسجيل
| Option | Description | Selected |
|--------|-------------|----------|
| ربط الاقتراح بحساب Google الحقيقي (`googleSub` + `email`) | التحقق من Google ID Token على السيرفر وحفظ الإيميل مع الاقتراح `pending` للأدمن، مع توضيح ذلك في سياسة الخصوصية | ✓ |
| تحقق Google ID Token مع حفظ Hash غير قابل للعكس | إخفاء الإيميل عن الأدمن | |
| الإبقاء على `PROJECT.md` الأصلي (signed anonymous device ID) | تجنب حسابات المستخدمين وقاعدة Apple 4.8 | |

**User's choice:** ربط الاقتراح بحساب Google الحقيقي (`googleSub` + `email`) بعد توضيح تبعات الخصوصية وـ App Store Guideline 4.8.
**Notes:** المالك طلب أيضاً إضافة خطوة اختيارية (قابلة للتخطي) لتسجيل الدخول بـ Google كشاشة أخيرة في الـ Onboarding — تم تسجيلها لـ Phase 4 / Phase 8.

### Q3: حدود الإرسال (Rate Limit)
| Option | Description | Selected |
|--------|-------------|----------|
| بحد أقصى ٥ اقتراحات/يوم + حظر مبدئي + zod | تقييد أشد | |
| حد مفتوح نسبياً (١٠ اقتراحات/يوم لكل حساب) بدون نظام حظر في Phase 2 | التوازن المطلوب حالياً | ✓ |
| اقتراح واحد فقط في اليوم | تقييد صارم جداً | |
| أنت قرر (You decide) | تفويض الاختيار | |

**User's choice:** حد مفتوح نسبياً (١٠ اقتراحات في اليوم لكل حساب Google) بدون نظام حظر في Phase 2 (مع التحقق عبر `@roi/shared` `personalizedTextSchema`).

### Q4: أنواع الاقتراحات والحقول المدعومة
| Option | Description | Selected |
|--------|-------------|----------|
| الأنواع الثلاثة (`verse`, `name_of_god`, `blessing`) بحقول schema الموحد | جاهز فوراً لـ Phase 3 (الأدمن) وPhase 4 (ليا أنا) | ✓ |
| نص حر بسيط (`text` + `ref`) والأدمن يصنفه لاحقاً | بدون تحديد نوع | |
| الآيات والبركات فقط بدون أسماء الله | نوعين فقط | |
| أنت قرر (You decide) | تفويض الاختيار | |

**User's choice:** الأنواع الثلاثة (`verse`, `name_of_god`, `blessing`) بنفس حقول schema الموحد.

---

## Claude's Discretion

- تفاصيل جداول Drizzle في الـ Backend وهيكل ملفات الـ gzip snapshot وطبقات الـ NestJS وحدود عمق/تعقيد GraphQL وبنية الـ Dockerfile.

## Deferred Ideas

- **Sanity one-time import (`BE-07`):** أُبعد عن تعقيد Phase 2 بناءً على طلب المالك؛ سيتم التصدير والاستيراد لاحقاً عبر JSON.
- **شاشة اختيارية لتسجيل الدخول بـ Google في نهاية الـ Onboarding:** نُقلت لـ Phase 4 (`HOME-01`) / Phase 8 (`SYNC-01`).
- **مراجعة سياسة الخصوصية وبيانات المتجر (`REL-02`) وقاعدة Apple 4.8 (`REL-03`):** نُقلت لـ Phase 9 لتعكس إرسال Google account مع الاقتراحات.
