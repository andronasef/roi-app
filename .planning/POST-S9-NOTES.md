# Post-Phase 7 (`S7`, formerly `S9` — final phase) Product, UX & Bug-Fix Notes

> **Trigger:** Surface and review this entire list with the user immediately after **Phase 7 (`S7`, the final phase)** is completed.

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
  - Note (Phase 5): the دفتر الشكر full-screen Reanimated editor already opens smoothly (260ms); collapse is instant by design. Use it as the model for this full-screen add-item editor.
- **Online Bible Verse Search & Auto-Fill (Personal Verse Creation):**
  - Instead of forcing the user to type the verse and reference manually, allow searching the Bible online (e.g., searching `"حياة"` across the whole Bible or by reference), showing matching results, and auto-filling both **`الشاهد` (reference)** and **`النص` (verse text)** when the user picks one.
  - Reference API to evaluate/test at implementation time (`biblesupersearch.com`, `svd` module), using the user's Tampermonkey script below:
    <details>
    <summary>Reference Script: Bible Verse Fetcher (SVD)</summary>

    ```javascript
    // ==UserScript==
    // @name         Bible Verse Fetcher (SVD) - Arabic UI & Fixes
    // @namespace    http://tampermonkey.net/
    // @version      4.0
    // @description  Select text -> Ctrl+Alt+B (or لا) -> Choose verse. Arabic Font & RTL supported.
    // @author       You
    // @match        *://*/*
    // @grant        GM_xmlhttpRequest
    // ==/UserScript==

    (function() {
        'use strict';

        // --- Configuration ---
        const CONFIG = {
            keyCode: 'KeyB', // Physical key location (works for English 'b' and Arabic 'لا')
            bibleModule: 'svd',
            apiUrl: 'https://api.biblesupersearch.com/api',
            searchLimit: 20
        };

        // --- API Logic ---
        function fetchVerse(query) {
            const url = `${CONFIG.apiUrl}?bible=${CONFIG.bibleModule}&search=${encodeURIComponent(query)}&limit=${CONFIG.searchLimit}&data_format=passage`;
            // Parses response.results -> book_name + Object.values(result.verses[CONFIG.bibleModule])[0][0] -> { chapter, verse, text }
        }

        function formatVerseResult(resultObj) {
            try {
                const bookName = resultObj.book_name || "Unknown";
                const versesData = resultObj.verses?.[CONFIG.bibleModule];
                if (!versesData) return null;

                const chapters = Object.values(versesData);
                if (!chapters.length) return null;

                const verses = Object.values(chapters[0]);
                if (!verses.length) return null;

                const vData = verses[0];
                const text = vData.text.replace(/<[^>]*>/g, '').trim();
                const ref = `${bookName} ${vData.chapter}:${vData.verse}`;

                return {
                    fullString: `${text} (${ref})`,
                    previewRef: ref,
                    previewText: text
                };
            } catch (e) {
                return null;
            }
        }
    })();
    ```

    </details>
- **Easy Name Token Insertion in Personal Verses:**
  - In the Personal Verse tab/editor, add a clear hint and an effortless way to insert the user's dynamic name token (e.g., a tappable chip or drag-and-drop `[الاسم]` token into the verse text) so personal verses can also use Ro'i's name personalization feature.
- **Smooth Sliding Tabs & Page Transitions:** Replace the instant/static tab switching between `الآيات` | `أسماء الله` | `البركات` | `المفضلة` with smooth motion:
  - **Animated Tab Indicator:** The underline bar smoothly slides from the current tab to the selected tab (e.g., sliding across `أسماء الله` and `البركات` when jumping from `الآيات` to `المفضلة`).
  - **Sliding Page Motion:** The page content itself smoothly slides horizontally through the intermediate pages rather than snapping statically.

## 4. Bugs
- **iOS Back Button Not Working:** The in-app Back button on iOS is not working reliably *(confirmed during Phase 4 iOS Simulator UAT)*.
