# Phase 4: Onboarding, Personalization & Identity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-25
**Phase:** 4-Onboarding, Personalization & Identity
**Areas discussed:** Onboarding & Google sign-in, Home grid ("أدواتك") & unbuilt tools, ليا أنا structure & verse pools, Personal items, copy & Settings

---

## Onboarding & Google sign-in

### Question 1: Integration of optional Google Sign-In with the 3 onboarding screens
| Option | Description | Selected |
|--------|-------------|----------|
| 4th skippable step after first win | Keep the 3 core screens (What Ro'i is; Name & gender; First verse), then show a skippable "ادخول باستخدام Google" screen right after the first win before Home | |
| Post-win sheet on Home | Keep Onboarding strictly 3 screens, and show the skippable Google Sign-In prompt as a one-time card/sheet on Home | |
| You decide | Choose the cleanest transition that honors "after first win, skippable" | ✓ (with custom instruction) |

**User's choice:** You decide + custom direction
**Notes:** User specified placing a primary **«استمر باستخدام جوجل»** button on the 3rd (last) onboarding screen with a small **«استمر بدون تسجيل»** text link underneath it.

### Question 2: Screen 2 (Name & gender) requirements
| Option | Description | Selected |
|--------|-------------|----------|
| Name optional, gender chosen | User picks male/female and can leave name blank (neutral fallback) | |
| Both required | User must enter a name and pick male/female on Screen 2 to personalize Ro'i from minute one | ✓ |
| Both skippable | User can tap "تخطي" on Screen 2 with neutral fallback and default phrasing until set in Settings | |

**User's choice:** Both required
**Notes:** Neutral fallback in `personalize()` remains active if name is ever cleared later in Settings.

### Question 3: Screen 3 "pick a first verse" flow
| Option | Description | Selected |
|--------|-------------|----------|
| Curated cards + search/shuffle, saved to Favorites | Show 3–5 personalized starter verses (with a shuffle/search option); tapping one saves it to Favorites ⭐ right on the card before "استمر باستخدام جوجل / استمر بدون تسجيل" | ✓ |
| Pick from full downloaded verse list | Let the user search/browse the whole downloaded verses library on Screen 3 and star one as their first favorite | |
| Auto-assign first weekly verse on completion | Screen 3 reveals their first personalized weekly verse (with option to star/swap or continue) before the Google/guest buttons | |

**User's choice:** Curated cards + search/shuffle, saved to Favorites

### Question 4: Google Sign-In scope and explanation on Screen 3
| Option | Description | Selected |
|--------|-------------|----------|
| Basic Google Sign-In now, Drive permission in Phase 8 | Screen 3 explains briefly and requests basic Google sign-in; Drive permission is added in Phase 8 | |
| Request Google Sign-In + drive.appdata scope now | Ask for Drive appdata scope during onboarding sign-in too so Phase 8 won't need re-consent | ✓ |
| You decide | Pick what matches Google OAuth verification & Phase 8 timing best | |

**User's choice:** Request Google Sign-In + drive.appdata scope now

---

## Home grid ("أدواتك") & unbuilt tools

### Question 1: Behavior of unbuilt Phase 5–6 tool tiles on Home
| Option | Description | Selected |
|--------|-------------|----------|
| Visible "قريباً" tiles | Show all 4 tool tiles on Home; unbuilt 3 show a warm "قريباً" badge and preview sheet | |
| ليا أنا active + upcoming row below | Feature ليا أنا full-width at the top and group the 3 upcoming tools in a muted "جاي قريب" section | |
| Hide unbuilt tools until Phases 5–6 | Only show ليا أنا on Home in Phase 4 while keeping the tile customization model ready for all 4 tools | ✓ |

**User's choice:** Hide unbuilt tools until Phases 5–6

### Question 2: Home tile customization UX
| Option | Description | Selected |
|--------|-------------|----------|
| Inline edit mode on Home ("تعديل") | A subtle button beside "أدواتك" switches the grid into edit mode with show/hide toggles and move up/down controls (preventing hiding the last visible tool) | ✓ |
| Customize sheet from Home & Settings | Tapping a customize icon on Home (or in Settings) opens a clean sheet listing the tools with visibility switches and reorder controls | |
| Long-press tile to customize | Long-pressing a tile enters reorder/hide mode directly on the grid | |

**User's choice:** Inline edit mode on Home ("تعديل")

### Question 3: One-time Home intro message (HOME-05) and top-of-Home layout
| Option | Description | Selected |
|--------|-------------|----------|
| Dismissible welcome card + personalized greeting | Show a gender-aware greeting with the user's name at the top, a one-time dismissible intro card explaining "أدواتك" (gone permanently on dismiss), and a compact weekly-verse peek above the grid | ✓ |
| One-time intro banner + tool tiles only | Keep Home super minimal without an extra verse preview card | |
| Modal intro dialog on first Home arrival | Show a one-time calm dialog explaining Home ("أدواتك") on first visit | |

**User's choice:** Dismissible welcome card + personalized greeting

### Question 4: Storage boundary for profile & Home tile layout
| Option | Description | Selected |
|--------|-------------|----------|
| Profile & Home layout in SQLite settings (sync-ready) | Store name, gender, and tile visibility/order in the syncable SQLite settings table so Drive restore in Phase 8 brings them back too, while keeping onboarding/intro-seen flags device-local in MMKV | ✓ |
| Everything in MMKV except user content | Keep profile and Home tile layout in MMKV device-local only | |
| You decide | Place each preference in SQLite vs MMKV according to Phase 1/8 sync boundaries | |

**User's choice:** Profile & Home layout in SQLite settings (sync-ready)

---

## ليا أنا structure & verse pools

### Question 1: Weekly and monthly verse pools
| Option | Description | Selected |
|--------|-------------|----------|
| Whole verses library, shared non-repeat pool | Both weekly and monthly verses draw from all active public verses | |
| Whole verses library, independent weekly & monthly histories | Both draw from all active verses, avoiding repeats within the same slot | |
| Filter by tag when present | Use tagged subset if tags exist, otherwise fall back to whole library | |

**User's choice:** Clarified via direct user explanation
**Notes:** User explained that verses have no weekly/monthly/daily tags — every verse can be chosen as a weekly or monthly verse, picked randomly/deterministically and persisted, pointing to `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily` as reference logic.

### Question 2: Display of Names of God (ME-04) and Blessings (ME-05)
| Option | Description | Selected |
|--------|-------------|----------|
| Today's pick at top + full browsable list below | Highlight one Name of God / Blessing on top with the full scrollable & searchable card library underneath | |
| Full browsable card list only | Show all Names of God / Blessings as rich-text cards without a separate daily pick | |
| Daily/featured card only (with a "تصفح الكل" button) | Keep the tab focused on one calm card like daily, with an optional button to open the full list | ✓ |

**User's choice:** Daily/featured card only (with a "تصفح الكل" button)

### Question 3: Top-level organization inside ليا أنا
| Option | Description | Selected |
|--------|-------------|----------|
| 4 top tabs (الآيات \| أسماء الله \| البركات \| المفضلة) | Keeps daily's clean tab bar and adds a dedicated Favorites ⭐ tab (covering verses, names & blessings), with "السجل" history link inside الآيات | ✓ |
| 3 tabs + header icon for Favorites & History | Keep the 3 content tabs and put ⭐ المفضلة and السجل in the top app bar | |
| Dashboard cards + drill-down screens | Single scrollable screen with Weekly/Monthly verses, today's Name & Blessing, and buttons for Favorites/All/History | |

**User's choice:** 4 top tabs (الآيات | أسماء الله | البركات | المفضلة)

### Question 4: Cross-slot repeat avoidance for weekly & monthly verses
| Option | Description | Selected |
|--------|-------------|----------|
| Shared seen-history, cycle reset on exhaustion | Track assigned verses across both weekly and monthly so neither repeats until the whole library is exhausted | |
| Separate seen-history per slot | Weekly only avoids past weekly verses and monthly only avoids past monthly verses | |
| You decide | Pick the cleanest deterministic behavior for small vs. large verse pools | ✓ |

**User's choice:** You decide (Claude's discretion: shared seen-history across weekly & monthly with cycle reset on exhaustion)

### Question 5: "تصفح الكل" list presentation for Names of God & Blessings
| Option | Description | Selected |
|--------|-------------|----------|
| Compact list cards -> tap to read full article | "تصفح الكل" shows searchable cards with title (+ supporting verse ref for blessings) and ⭐ star; tapping opens the full rich-text card view | ✓ |
| Full rich-text cards directly in the scrollable list | Show the entire rich-text article for each Name of God / Blessing inline in the list | |
| You decide | Match article length and mobile readability best | |

**User's choice:** Compact list cards -> tap to read full article

---

## Personal items, copy & Settings

### Question 1: Allowed content kinds for local personal items (ME-08)
| Option | Description | Selected |
|--------|-------------|----------|
| All 3 kinds (آية، اسم من أسماء الله، بركة) | Matches Phase 2's submitSuggestion schema; user picks the kind, fills title/ref + text (+ optional verseRef for blessings), saves locally with edit/delete, and can optionally suggest it to everyone | ✓ |
| Personal verses only | Keep local personal additions simple (verse text + reference) | |
| You decide | Align local personal items with Phase 2's submitSuggestion contract | |

**User's choice:** All 3 kinds (آية، اسم من أسماء الله، بركة)

### Question 2: "اقترح للكل" (ME-09) auth handling & personal-item input simplicity
| Option | Description | Selected |
|--------|-------------|----------|
| Inline Google Sign-In prompt + plain-text form | If not signed in yet, show a warm explanation ("عشان نراجع الاقتراحات ونمنع السبام") and sign in with Google right there; keep user input simple plain text without raw tokens | ✓ |
| Link to Settings to sign in first | Disable the suggest button and send the user to Settings to connect Google | |
| Allow inserting {الاسم} chip in personal items too | Also give end users a name-insertion chip when adding/suggesting items | |

**User's choice:** Inline Google Sign-In prompt + plain-text form

### Question 3: Long-press copy & sharing format (ME-07)
| Option | Description | Selected |
|--------|-------------|----------|
| Copy personalized text as shown + ref (long-press + subtle copy icon) | Copies what the user reads (stripping Markdown marks cleanly for Names/Blessings), triggered by long-press or a subtle copy icon button, with a calm "اتنسخت" toast | ✓ (refined for verses) |
| Copy neutral text (without user's name) + ref | Strips the user's name before copying for group sharing | |
| Long-press only, exact displayed text + ref | Match daily's exact long-press interaction without an extra icon button | |

**User's choice:** Selected first option with a key refinement for verses
**Notes:** For verses with personalization (`{الاسم}` or male/female variant), prompt **"الآية دي ليك ولا هتبعتها لحد؟"** first; if sending to someone else, ask recipient gender (`ولد` / `بنت`) and optional name before composing and copying with its reference.

### Question 4: Settings access & support links (SET-01)
| Option | Description | Selected |
|--------|-------------|----------|
| Gear icon on Home header + env-configured support links | Gear icon in Home app bar opens Settings with Name & gender, Theme, Scripture size, Google account, Rate app, Help & WhatsApp | ✓ (with tarneemna-app reference) |
| Settings as a tile on Home + header icon | Put Settings in the Home header and also on Home | |
| You decide | Wire Settings navigation and configurable store/WhatsApp links cleanly | |

**User's choice:** Gear icon on Home header + follow `tarneemna-app` Settings reference
**Notes:** User pointed to `/Users/andrew/Documents/Work/Dev/Projects/Personalss/tarneemna-app` (`settings_screen.dart` and `values.dart`) for the grouped-card Settings UI and Increasing Labs links (`wa.me/increasinglabs`, support form, rate/share link pattern).

---

## Claude's Discretion
- Shared seen-history across weekly and monthly verses with cycle reset on exhaustion (`ME-01`..`ME-03`).
- Exact SQLite table/column names for `verse_assignments`, `favorites`, and `personal_items` following `syncCols()`, UUIDv7, UTC epoch-ms, and `D-14` migration fixture tests.
- Exact `react-native-marked` styling under warm-paper light/dark theme tokens and gender-aware Egyptian Arabic UI string wording (`PERS-04`).

## Deferred Ideas
- None — discussion stayed within phase scope. (Unbuilt Phase 5–6 tiles remain hidden on Home until Phases 5–6; full Drive backup/restore executes in Phase 8.)
