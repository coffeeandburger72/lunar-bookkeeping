# 80s Hong Kong Bookkeeping Website — Design

**Date:** 2026-04-14
**Status:** Approved for implementation planning

## Goal

A mobile-friendly personal expense tracker styled like a 1980s Hong Kong paper ledger (數簿). Single-user, local-only, no accounts, no server. The joy is in the analog details: tap-to-flick abacus for amounts, handwritten notes, tap-to-circle categories, and an auto-filled 農曆 date.

## Non-goals (YAGNI)

- No cloud sync, accounts, or multi-device
- No server — static files only
- No charts, budgets, or recurring entries
- No currency switching (HKD only)
- No in-place edit; delete and re-enter instead
- No build step, framework, or npm dependencies at runtime

## Tech stack

Plain HTML + CSS + vanilla JavaScript (ES modules). No framework, no bundler. Opens by double-clicking `index.html` or serving the folder from any static host.

- **Persistence:** `localStorage` (key `bookkeeping.records`)
- **Abacus:** inline SVG, tap handlers on bead elements
- **Handwriting:** `<canvas>` with pointer events
- **Lunar calendar:** small public-domain conversion algorithm inlined in `js/lunar.js` (no npm)
- **Fonts:** Google Fonts `Noto Serif TC` (loaded via `<link>`), system serif fallback

## File layout

```
index.html
style.css
js/
  app.js          # screen routing, form wiring, save handler
  storage.js      # load / save / delete / export / import records
  abacus.js       # SVG abacus component, tap-to-flick, value readout
  handwriting.js  # canvas stroke capture, playback, thumbnail render
  lunar.js        # gregorian -> 農曆 conversion (pure function)
  lunar.test.js   # node-runnable sanity tests for lunar.js
  categories.js   # the 9-item list + circle-select UI
docs/
  superpowers/specs/2026-04-14-80s-hk-bookkeeping-design.md
```

Each JS module has one clear purpose and can be understood in isolation. `app.js` is the only file that wires them together.

## Screens

Two screens, toggled via a bottom tab bar: **記帳** (new entry) and **賬簿** (ledger).

### Screen 1 — 記帳 (new entry)

Top-to-bottom, single column, max-width 480px:

1. **Header band** — red SVG seal 「數簿」, slightly rotated. Today's 農曆 date auto-rendered below it (e.g. `乙巳年 三月廿七`).
2. **Amount readout** — large tabular-nums display: `$0.00`, updates live as the abacus changes.
3. **Abacus** — 13-column SVG 算盤. Each column has 2 heaven beads (worth 5 each) and 5 earth beads (worth 1 each). Tap a bead to flick it toward the center bar; tap again to flick it back. Columns represent digits; rightmost 2 columns are cents.
4. **Category grid** — 3×3 grid of 9 terms: `伙食 買餸 車費 / 水電煤 屋租 衫褲 / 交際 雜項 煙仔`. Tap one → a wobbly red SVG ellipse animates around it (stroke-dasharray draw, 200ms). Tap again to clear. Only one category circled at a time.
5. **Note pad** — ruled rectangle. Freehand write with finger/stylus via canvas. Small `清` button in the corner clears.
6. **入賬 button** — big red stamp. On tap: validate, save, play a red 「入」 chop animation (fade in to 40% opacity then fade out, 300ms total), reset form to empty state.

### Screen 2 — 賬簿 (ledger)

- Top summary: `本月總計 $X.XX` in old cash-register green.
- Optional filter chips: tap a category to filter the list; tap again to clear.
- Vertical scrolling list of records on ruled paper. Each row shows: 農曆 date · amount · circled category term · small thumbnail of the handwritten note (re-rendered from vector strokes).
- Tap a row to expand: full-size note, full amount, delete button.
- Delete requires a `確定?` confirmation.
- Footer actions: **匯出** (export JSON), **匯入** (import JSON), **清簿** (clear all, with confirmation).

## Data model

One record per entry, stored as a JSON array under `localStorage['bookkeeping.records']`:

```json
{
  "id": "1713100000000",
  "createdAt": 1713100000000,
  "lunarDate": "乙巳年三月廿七",
  "amount": 4250,
  "category": "伙食",
  "noteStrokes": [
    [[0.12, 0.33, 0], [0.14, 0.34, 16], [0.18, 0.37, 33]],
    [[0.42, 0.50, 120], [0.48, 0.52, 140]]
  ]
}
```

- `id` — creation timestamp as string. Sufficient for a single-user local app.
- `createdAt` — epoch ms, used for sorting and month grouping.
- `lunarDate` — pre-computed at save time so the ledger doesn't need the lunar library at render.
- `amount` — integer cents. `4250` means `$42.50`. Avoids float precision bugs.
- `category` — one of the 9 category strings.
- `noteStrokes` — array of strokes. Each stroke is an array of `[x, y, t]` points where `x` and `y` are normalized to `[0, 1]` relative to the canvas, and `t` is milliseconds since stroke start. Normalized coordinates let the same strokes re-render correctly at any canvas size (thumbnail, full, rotation).

## Categories

Fixed list of 9 terms, hardcoded in `js/categories.js`:

`伙食`, `買餸`, `車費`, `水電煤`, `屋租`, `衫褲`, `交際`, `雜項`, `煙仔`

Chosen to feel period-appropriate for 1980s Hong Kong household bookkeeping.

## Visual spec

### Palette

- Paper: `#f3e9d2`
- Ink: `#1a1a1a`
- Red seal / circle / stamp: `#b8002e`
- Ruled lines: `#c9a878`
- Cash-register green (totals): `#2d5a3d`
- Wooden abacus frame: `#7a4a2b`
- Abacus beads: `#3a2418`

### Typography

- Headings and numbers: `Noto Serif TC`, weights 700/900, `font-variant-numeric: tabular-nums`
- Fallback stack: `"Noto Serif TC", "Ma Shan Zheng", serif`
- Handwriting: rendered from the user's own strokes; no font needed

### Textures and effects

- Paper background: CSS `radial-gradient` for warmth + inline SVG noise `<filter feTurbulence>` for grain. No image files.
- Ruled ledger lines: `repeating-linear-gradient` in ruled-tan.
- Red seal header: SVG square rotated ~3°, `「數簿」` inside in heavy serif.
- Circle-select animation: SVG `<path>` drawn around the tapped category using a slightly wobbly ellipse (hand-built path, not a perfect ellipse). Animated via `stroke-dasharray` over 200ms.
- 入 chop on save: red SVG `「入」` character, fade to 40% opacity then fade out over 300ms, centered over the form.

### Abacus

- 13 columns, standard 算盤 layout (2 heaven / 5 earth)
- Columns 12–13 (rightmost) represent cents; the readout shows the decimal point
- Tap behavior: each bead tracks an `active` state (true = flicked toward center bar). Tapping any bead toggles it and, for realistic behavior, also flips any beads between it and the bar in the same direction.
- Readout in large bold numerals above the abacus, with `$` prefix and decimal at cents position

### Layout

- Mobile-first. Single column. Max-width 480px centered on larger screens.
- Base font size 16px.
- Touch targets ≥44px.
- Bottom tab bar with `env(safe-area-inset-bottom)` padding for iOS.

## Error handling and edge cases

- **localStorage blocked or full** — Show red inked message 「寫唔入簿」 with an "Export backup" button. App stays usable in-memory for the current session.
- **Save with amount = 0** — Shake the 入賬 button, do not save.
- **Save with no category circled** — Shake the 入賬 button, do not save. (Empty note is allowed.)
- **Lunar date out of supported range** (before 1900 or after 2100) — Fall back to gregorian date with a small ⚠ marker. Not expected in practice.
- **Canvas rotation/resize** — Strokes are stored as normalized `[0, 1]` coordinates, so re-rendering at any size works without distortion.
- **Delete in ledger** — Always requires a `確定?` confirmation.
- **Import invalid JSON** — Validate shape (array of objects with required fields). Refuse with 「唔啱格式」 message. Do not wipe or touch existing data.

## Testing approach

- No test framework. Vanilla JS, verified in a real browser.
- `js/lunar.test.js` — node-runnable pure-function test. Verifies ~10 known `(gregorian → 農曆)` pairs including edge cases (leap months, year boundaries).
- Manual test checklist in the implementation plan: enter amount, switch categories, draw note, save, reload page, verify persisted, export, clear, import, verify count matches.

## Flexibility / future tweaks

The export/import JSON mechanism means users (or the developer) can:

- Back up by emailing the JSON to themselves
- Edit records by hand in a text editor
- Move data between browsers or devices
- Restore after clearing browser data

If future needs emerge (more categories, currencies, charts), the data shape is simple enough to extend without migration — just add fields and tolerate their absence on old records.
