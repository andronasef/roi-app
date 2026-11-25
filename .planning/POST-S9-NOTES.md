# Post-Phase 9 (`S9`) Product, UX & Bug-Fix Notes

> **Trigger:** Surface and review this entire list with the user immediately after **Phase 9 (`S9`)** is completed.

## 1. Appearance & Theme Selector (Settings)
- **Full Look & Feel Customization:** The current UI feels too minimal for some users; add a comprehensive **Appearance / Theme Selector** section in Settings (`إعدادات الشكل`) where users can customize the entire app's look:
  - **Themes / Presets:** Multiple overall styles to choose from (e.g., Simple/Minimal, Youthful/Vibrant, etc.).
  - **Colors:** User-selectable color palettes / accent colors.
  - **Fonts:** User-selectable typography / font options.

## 2. Hyper-Customizable Homepage Editor
- *(Note: `شاشة اختبار النصوص` and `شاشة فحص التكاملات` on Home are dev-only screens and should be ignored.)*
- **Top Edit Button:** Replace the current `"تعديل الأدوات"` placement with a top **Edit** button on the Homepage.
- **Maximum Homepage Customization (in Arabic):** Turn the Homepage into a flexible widget/tile editor where the user can:
  - Add or remove any tools/widgets freely.
  - Reorder and move items anywhere.
  - Resize tiles/widgets (make them bigger or smaller).
  - Customize placement of standalone cards like the Daily/Weekly Verse.
- **Agent Rule (Enforced in `AGENTS.md` / `CLAUDE.md`):** Every new feature/tool added in future phases must be integrated into the Homepage Editor as a customizable item.

## 3. "ليا أنا" (Leyaana) — Content & UX Improvements
- **Missing Daily Verse (`آية اليوم`) — High Priority:** Currently **ليا أنا** only shows Weekly (`آية الأسبوع`) and Monthly (`آية الشهر`) verses. It must include **Daily, Weekly, and Monthly** verses, with **Daily Verse (`آية اليوم`) shown first**.
- **First-Time Explainer for `"اقترح للكل"` (Suggest to Everyone):** On the user's first tap of `"اقترح للكل"`, display an introductory explanation of what it does (e.g., *"You added a personal item — you can suggest it to everyone so other users can see this verse/name/blessing too"*, tailored to the item type).
- **Larger / Full Screen for Adding a Personal Item:** The current `"إضافة عنصر شخصي"` sheet/modal is too small and cramped. Make it a full or much larger screen so the user can comfortably see and write their item.
- **Smooth Sliding Tabs & Page Transitions:** Replace the instant/static tab switching between `الآيات` | `أسماء الله` | `البركات` | `المفضلة` with smooth motion:
  - **Animated Tab Indicator:** The underline bar smoothly slides from the current tab to the selected tab (e.g., sliding across `أسماء الله` and `البركات` when jumping from `الآيات` to `المفضلة`).
  - **Sliding Page Motion:** The page content itself smoothly slides horizontally through the intermediate pages rather than snapping statically.

## 4. Bugs
- **iOS Back Button Not Working:** The in-app Back button on iOS is not working reliably *(confirmed during Phase 4 iOS Simulator UAT)*.
