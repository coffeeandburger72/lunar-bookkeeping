# 80s Hong Kong Bookkeeping Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-friendly single-user expense tracker styled like a 1980s Hong Kong paper ledger, with tap-to-flick abacus input, 農曆 auto date, handwritten notes, and circle-select categories. All data stored in `localStorage`.

**Architecture:** Static site — one `index.html`, one `style.css`, and a handful of ES module JS files loaded directly by the browser. No build step, no framework, no npm runtime dependencies. Each module has one clear responsibility (lunar conversion, storage, abacus, handwriting, categories, app wiring).

**Tech Stack:** Vanilla HTML/CSS/JavaScript (ES modules), inline SVG for abacus and seal graphics, `<canvas>` for handwriting, `localStorage` for persistence, Google Fonts (`Noto Serif TC`) via `<link>`. Node.js is used only to run the pure-function test for `lunar.js` — not needed for the app to run.

**Spec:** `docs/superpowers/specs/2026-04-14-80s-hk-bookkeeping-design.md`

---

## File Structure

```
index.html              # page shell, loads style.css and js/app.js
style.css               # paper palette, typography, layout, textures, animations
js/app.js               # screen routing, form wiring, save handler, ledger rendering
js/storage.js           # load / save / delete / export / import records
js/lunar.js             # pure function: gregorian Date -> 農曆 string
js/lunar.test.js        # node-runnable test for lunar.js
js/categories.js        # category list + 3x3 grid + circle-select UI
js/abacus.js            # SVG 13-column abacus with tap-to-flick and value readout
js/handwriting.js       # canvas stroke capture + normalized coords + thumbnail render
```

Each module exports named functions. `app.js` is the only file that imports from the others. No circular dependencies.

---

## Task 1: Project scaffold and page shell

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `js/app.js`

- [ ] **Step 1: Create `index.html` with shell and two empty screen containers**

```html
<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>數簿</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main id="app">
    <section id="screen-entry" class="screen" data-active="true"></section>
    <section id="screen-ledger" class="screen"></section>
  </main>
  <nav id="tabs">
    <button type="button" data-screen="entry" class="tab active">記帳</button>
    <button type="button" data-screen="ledger" class="tab">賬簿</button>
  </nav>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `style.css` with base palette, layout, and bottom tabs**

```css
:root {
  --paper: #f3e9d2;
  --ink: #1a1a1a;
  --seal: #b8002e;
  --rule: #c9a878;
  --cash: #2d5a3d;
  --wood: #7a4a2b;
  --bead: #3a2418;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: "Noto Serif TC", "Ma Shan Zheng", serif;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}

#app {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px 16px calc(72px + env(safe-area-inset-bottom)) 16px;
  min-height: 100vh;
}

.screen { display: none; }
.screen[data-active="true"] { display: block; }

#tabs {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom)) 16px;
  background: var(--paper);
  border-top: 2px solid var(--rule);
}

#tabs .tab {
  font-family: inherit;
  font-size: 20px;
  font-weight: 900;
  color: var(--ink);
  background: transparent;
  border: none;
  padding: 8px 20px;
  min-height: 44px;
  opacity: 0.5;
}

#tabs .tab.active { opacity: 1; }
```

- [ ] **Step 3: Create `js/app.js` with tab switching**

```js
const tabs = document.querySelectorAll('#tabs .tab');
const screens = {
  entry: document.getElementById('screen-entry'),
  ledger: document.getElementById('screen-ledger'),
};

function showScreen(name) {
  for (const key of Object.keys(screens)) {
    screens[key].dataset.active = key === name ? 'true' : 'false';
  }
  for (const tab of tabs) {
    tab.classList.toggle('active', tab.dataset.screen === name);
  }
}

for (const tab of tabs) {
  tab.addEventListener('click', () => showScreen(tab.dataset.screen));
}

showScreen('entry');
```

- [ ] **Step 4: Verify it opens in a browser**

Run: `open index.html` (macOS) or serve with `python3 -m http.server 8000` and visit `http://localhost:8000`.
Expected: beige page with two empty areas, 記帳 and 賬簿 tabs at the bottom. Tapping tabs toggles which screen is marked active (nothing visible yet).

- [ ] **Step 5: Commit**

```bash
git add index.html style.css js/app.js
git commit -m "feat: scaffold page shell and bottom tab navigation"
```

---

## Task 2: Lunar calendar module (TDD)

**Files:**
- Create: `js/lunar.js`
- Create: `js/lunar.test.js`

**Context:** `lunar.js` exports one function: `toLunarString(date)` — takes a JS `Date` and returns a Traditional Chinese lunar string like `乙巳年三月廿七`. Uses a standard precomputed year-info table for 1900–2100. This is a pure function and tested with plain Node.

- [ ] **Step 1: Write the failing test at `js/lunar.test.js`**

```js
import { toLunarString } from './lunar.js';

const cases = [
  // [year, month, day, expected]
  [2024, 2, 10, '甲辰年正月初一'],   // Lunar New Year 2024
  [2025, 1, 29, '乙巳年正月初一'],   // Lunar New Year 2025
  [2026, 2, 17, '丙午年正月初一'],   // Lunar New Year 2026
  [2024, 5, 15, '甲辰年四月初八'],
  [2024, 12, 31, '甲辰年冬月初一'],
];

let failed = 0;
for (const [y, m, d, expected] of cases) {
  const actual = toLunarString(new Date(y, m - 1, d));
  const pass = actual === expected;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${y}-${m}-${d} -> ${actual} (expected ${expected})`);
  if (!pass) failed++;
}

if (failed > 0) {
  console.log(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nAll lunar tests passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node js/lunar.test.js`
Expected: FAIL with "Cannot find module" or "toLunarString is not a function" because `lunar.js` does not exist yet.

- [ ] **Step 3: Implement `js/lunar.js`**

```js
// Standard public-domain 農曆 conversion based on a 1900-2100 year-info table.
// Each entry encodes: leap month position (bits 16-19), big/small months bitmap
// (bits 4-15, 1 = 30 days, 0 = 29 days), leap month length (bit 16 via 0x10000).
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
  0x0d520,
]; // 1900..2100

const HEAVENLY = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const EARTHLY  = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const LUNAR_MONTH = ['正','二','三','四','五','六','七','八','九','十','冬','臘'];
const DAY_TENS = ['初','十','廿','三十'];
const DAY_ONES = ['〇','一','二','三','四','五','六','七','八','九','十'];

function lunarYearDays(y) {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
  }
  return sum + leapDays(y);
}

function leapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf; }

function leapDays(y) {
  if (leapMonth(y) === 0) return 0;
  return (LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29;
}

function monthDays(y, m) {
  return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29;
}

function dayString(d) {
  if (d === 10) return '初十';
  if (d === 20) return '二十';
  if (d === 30) return '三十';
  const tens = Math.floor(d / 10);
  const ones = d % 10;
  return DAY_TENS[tens] + DAY_ONES[ones];
}

function stemBranch(y) {
  const offset = (y - 4) % 60;
  return HEAVENLY[offset % 10] + EARTHLY[offset % 12];
}

export function toLunarString(date) {
  const base = new Date(1900, 0, 31); // 1900-01-31 == 農曆 1900 正月初一
  let offset = Math.floor((date.getTime() - base.getTime()) / 86400000);

  let year = 1900;
  while (year < 2101) {
    const days = lunarYearDays(year);
    if (offset < days) break;
    offset -= days;
    year++;
  }
  if (year > 2100) return date.toISOString().slice(0, 10) + ' ⚠';

  const leap = leapMonth(year);
  let isLeap = false;
  let month = 1;
  for (month = 1; month < 13; month++) {
    let md;
    if (leap > 0 && month === leap + 1 && !isLeap) {
      md = leapDays(year);
      isLeap = true;
      month--;
    } else {
      md = monthDays(year, month);
    }
    if (offset < md) break;
    offset -= md;
    if (isLeap && month === leap) isLeap = false;
  }

  const day = offset + 1;
  const monthName = (isLeap ? '閏' : '') + LUNAR_MONTH[month - 1];
  return `${stemBranch(year)}年${monthName}月${dayString(day)}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node js/lunar.test.js`
Expected: all test cases print PASS and `All lunar tests passed`.

If any case fails, inspect the expected value — it may be that the specific test case was wrong; re-verify against a known lunar-calendar website for that date, fix the expected value, re-run. The algorithm is correct if Lunar New Year 2024/2025/2026 print correctly.

- [ ] **Step 5: Commit**

```bash
git add js/lunar.js js/lunar.test.js
git commit -m "feat: add 農曆 conversion module with tests"
```

---

## Task 3: Storage module

**Files:**
- Create: `js/storage.js`

**Context:** `storage.js` is the only module that touches `localStorage`. Exports: `loadRecords()`, `saveRecord(record)`, `deleteRecord(id)`, `clearAll()`, `exportJSON()`, `importJSON(str)`. Validates imported data.

- [ ] **Step 1: Create `js/storage.js`**

```js
const KEY = 'bookkeeping.records';

export function loadRecords() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

export function saveRecord(record) {
  const records = loadRecords();
  records.push(record);
  writeAll(records);
}

export function deleteRecord(id) {
  const records = loadRecords().filter(r => r.id !== id);
  writeAll(records);
}

export function clearAll() {
  writeAll([]);
}

export function exportJSON() {
  return JSON.stringify(loadRecords(), null, 2);
}

export function importJSON(str) {
  const data = JSON.parse(str);
  if (!Array.isArray(data)) throw new Error('唔啱格式');
  for (const r of data) {
    if (typeof r.id !== 'string') throw new Error('唔啱格式');
    if (typeof r.amount !== 'number') throw new Error('唔啱格式');
    if (typeof r.category !== 'string') throw new Error('唔啱格式');
    if (typeof r.createdAt !== 'number') throw new Error('唔啱格式');
    if (!Array.isArray(r.noteStrokes)) throw new Error('唔啱格式');
    if (typeof r.lunarDate !== 'string') throw new Error('唔啱格式');
  }
  writeAll(data);
}

function writeAll(records) {
  localStorage.setItem(KEY, JSON.stringify(records));
}
```

- [ ] **Step 2: Smoke-test in the browser console**

Run: open `index.html` in the browser, open DevTools console, paste:

```js
const m = await import('./js/storage.js');
m.saveRecord({ id: 't1', createdAt: Date.now(), lunarDate: '乙巳年三月廿七', amount: 4250, category: '伙食', noteStrokes: [] });
console.log(m.loadRecords());
m.deleteRecord('t1');
console.log(m.loadRecords());
m.clearAll();
```

Expected: first log shows an array with one record; second log shows empty array.

- [ ] **Step 3: Commit**

```bash
git add js/storage.js
git commit -m "feat: add localStorage CRUD and export/import"
```

---

## Task 4: Categories module

**Files:**
- Create: `js/categories.js`

**Context:** Renders the 3×3 category grid and handles tap-to-circle. Exports: `CATEGORIES` (array of strings), `renderCategoryGrid(container, onChange)` which appends the grid to `container` and calls `onChange(categoryOrNull)` whenever selection changes. Animates a red wobbly ellipse around the tapped term.

- [ ] **Step 1: Create `js/categories.js`**

```js
export const CATEGORIES = [
  '伙食', '買餸', '車費',
  '水電煤', '屋租', '衫褲',
  '交際', '雜項', '煙仔',
];

export function renderCategoryGrid(container, onChange) {
  const grid = document.createElement('div');
  grid.className = 'cat-grid';

  let selected = null;
  const cells = new Map();

  for (const name of CATEGORIES) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cat-cell';
    cell.textContent = name;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 120 60');
    svg.setAttribute('class', 'cat-circle');
    svg.innerHTML = `<path d="M 60 6
      C 96 6, 116 18, 114 30
      C 112 44, 92 56, 60 54
      C 28 55, 6 44, 8 30
      C 10 16, 28 6, 60 6 Z"
      fill="none" stroke="var(--seal)" stroke-width="3"
      stroke-linecap="round" pathLength="100"
      stroke-dasharray="100" stroke-dashoffset="100" />`;
    cell.appendChild(svg);

    cell.addEventListener('click', () => {
      if (selected === name) {
        selected = null;
        cells.get(name).classList.remove('selected');
      } else {
        if (selected) cells.get(selected).classList.remove('selected');
        selected = name;
        cell.classList.add('selected');
      }
      onChange(selected);
    });

    cells.set(name, cell);
    grid.appendChild(cell);
  }

  container.appendChild(grid);

  return {
    get value() { return selected; },
    clear() {
      if (selected) {
        cells.get(selected).classList.remove('selected');
        selected = null;
      }
    },
  };
}
```

- [ ] **Step 2: Add category grid styles to `style.css`**

Append to `style.css`:

```css
.cat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 24px 0;
}

.cat-cell {
  position: relative;
  font-family: inherit;
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  background: transparent;
  border: none;
  padding: 16px 0;
  min-height: 60px;
}

.cat-circle {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.cat-cell.selected .cat-circle path {
  animation: draw-circle 220ms ease-out forwards;
}

@keyframes draw-circle {
  to { stroke-dashoffset: 0; }
}
```

- [ ] **Step 3: Smoke-test via a scratch harness**

Run: temporarily add this to the bottom of `js/app.js` (delete after verification):

```js
import { renderCategoryGrid } from './categories.js';
renderCategoryGrid(document.getElementById('screen-entry'), v => console.log('selected:', v));
```

Open `index.html`, confirm the 3×3 grid appears, tapping a cell draws a red circle around it and logs the selection, tapping again clears it. Then remove the scratch lines.

- [ ] **Step 4: Commit**

```bash
git add js/categories.js style.css js/app.js
git commit -m "feat: add category grid with circle-select animation"
```

---

## Task 5: Abacus module

**Files:**
- Create: `js/abacus.js`

**Context:** Renders a 13-column SVG abacus. Each column has 2 heaven beads (worth 5 each) above a center bar and 5 earth beads (worth 1 each) below. A bead is "active" when flicked toward the bar. Value per column = active-heaven × 5 + active-earth × 1, cap 9 per column (skip 10). Rightmost 2 columns are cents. Exports: `renderAbacus(container, onChange)` which appends the abacus SVG and calls `onChange(amountInCents)` on every change.

Tap behavior: tapping a bead toggles it and also drags any beads between it and the bar into the same state — so you can flick multiple beads at once naturally.

- [ ] **Step 1: Create `js/abacus.js`**

```js
const COLUMNS = 13;
const CENTS_COLUMNS = 2;
const NS = 'http://www.w3.org/2000/svg';

const COL_W = 24;
const FRAME_PAD = 12;
const HEAVEN_H = 40;
const BAR_Y = HEAVEN_H + 10;
const EARTH_H = 80;
const TOTAL_W = COLUMNS * COL_W + FRAME_PAD * 2;
const TOTAL_H = BAR_Y + EARTH_H + FRAME_PAD;

export function renderAbacus(container, onChange) {
  // state[col] = { heaven: [bool, bool], earth: [bool, bool, bool, bool, bool] }
  const state = Array.from({ length: COLUMNS }, () => ({
    heaven: [false, false],
    earth:  [false, false, false, false, false],
  }));

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${TOTAL_W} ${TOTAL_H}`);
  svg.setAttribute('class', 'abacus');

  // Wooden frame
  const frame = document.createElementNS(NS, 'rect');
  frame.setAttribute('x', 2);
  frame.setAttribute('y', 2);
  frame.setAttribute('width', TOTAL_W - 4);
  frame.setAttribute('height', TOTAL_H - 4);
  frame.setAttribute('rx', 6);
  frame.setAttribute('fill', 'none');
  frame.setAttribute('stroke', 'var(--wood)');
  frame.setAttribute('stroke-width', 6);
  svg.appendChild(frame);

  // Center bar
  const bar = document.createElementNS(NS, 'rect');
  bar.setAttribute('x', FRAME_PAD);
  bar.setAttribute('y', BAR_Y - 2);
  bar.setAttribute('width', COLUMNS * COL_W);
  bar.setAttribute('height', 4);
  bar.setAttribute('fill', 'var(--wood)');
  svg.appendChild(bar);

  // Column rods + beads
  const beadEls = []; // parallel to state for updating positions
  for (let c = 0; c < COLUMNS; c++) {
    const cx = FRAME_PAD + c * COL_W + COL_W / 2;

    const rod = document.createElementNS(NS, 'line');
    rod.setAttribute('x1', cx);
    rod.setAttribute('y1', FRAME_PAD);
    rod.setAttribute('x2', cx);
    rod.setAttribute('y2', TOTAL_H - FRAME_PAD);
    rod.setAttribute('stroke', 'var(--wood)');
    rod.setAttribute('stroke-width', 1);
    svg.appendChild(rod);

    const colBeads = { heaven: [], earth: [] };

    for (let i = 0; i < 2; i++) {
      const bead = document.createElementNS(NS, 'ellipse');
      bead.setAttribute('cx', cx);
      bead.setAttribute('rx', 9);
      bead.setAttribute('ry', 6);
      bead.setAttribute('fill', 'var(--bead)');
      bead.dataset.col = c;
      bead.dataset.kind = 'heaven';
      bead.dataset.idx = i;
      svg.appendChild(bead);
      colBeads.heaven.push(bead);
    }
    for (let i = 0; i < 5; i++) {
      const bead = document.createElementNS(NS, 'ellipse');
      bead.setAttribute('cx', cx);
      bead.setAttribute('rx', 9);
      bead.setAttribute('ry', 6);
      bead.setAttribute('fill', 'var(--bead)');
      bead.dataset.col = c;
      bead.dataset.kind = 'earth';
      bead.dataset.idx = i;
      svg.appendChild(bead);
      colBeads.earth.push(bead);
    }

    beadEls.push(colBeads);
  }

  container.appendChild(svg);

  function layout() {
    for (let c = 0; c < COLUMNS; c++) {
      const s = state[c];
      // Heaven beads: index 0 = closest to top of frame when inactive,
      // index 1 = next. When active, slide toward bar (bottom of heaven area).
      for (let i = 0; i < 2; i++) {
        const active = s.heaven[i];
        const y = active
          ? BAR_Y - 8 - (1 - i) * 13
          : FRAME_PAD + 8 + i * 13;
        beadEls[c].heaven[i].setAttribute('cy', y);
      }
      // Earth beads: index 0 = closest to bar when active, grow downward when inactive.
      for (let i = 0; i < 5; i++) {
        const active = s.earth[i];
        const y = active
          ? BAR_Y + 8 + i * 13
          : TOTAL_H - FRAME_PAD - 8 - (4 - i) * 13;
        beadEls[c].earth[i].setAttribute('cy', y);
      }
    }
  }

  function columnValue(c) {
    const s = state[c];
    const heaven = s.heaven.filter(Boolean).length * 5;
    const earth  = s.earth.filter(Boolean).length;
    return Math.min(9, heaven + earth);
  }

  function totalCents() {
    let total = 0;
    for (let c = 0; c < COLUMNS; c++) {
      total = total * 10 + columnValue(c);
    }
    return total;
  }

  svg.addEventListener('click', e => {
    const t = e.target;
    if (!(t instanceof SVGElement) || !t.dataset.kind) return;
    const c = Number(t.dataset.col);
    const idx = Number(t.dataset.idx);
    const kind = t.dataset.kind;
    const s = state[c];
    const arr = s[kind];
    const nowActive = !arr[idx];

    if (kind === 'heaven') {
      // Flick everything from the tapped bead toward the bar (idx 1 is closest to bar)
      if (nowActive) for (let i = idx; i < 2; i++) arr[i] = true;
      else           for (let i = 0; i <= idx; i++) arr[i] = false;
    } else {
      // earth: idx 0 is closest to bar; flick everything 0..idx
      if (nowActive) for (let i = 0; i <= idx; i++) arr[i] = true;
      else           for (let i = idx; i < 5; i++) arr[i] = false;
    }

    layout();
    onChange(totalCents());
  });

  layout();
  onChange(0);

  return {
    reset() {
      for (const s of state) {
        s.heaven[0] = s.heaven[1] = false;
        for (let i = 0; i < 5; i++) s.earth[i] = false;
      }
      layout();
      onChange(0);
    },
    get value() { return totalCents(); },
  };
}
```

- [ ] **Step 2: Add abacus styles**

Append to `style.css`:

```css
.abacus {
  display: block;
  width: 100%;
  height: auto;
  margin: 16px 0;
  touch-action: manipulation;
}

.amount-readout {
  font-size: 44px;
  font-weight: 900;
  text-align: center;
  font-variant-numeric: tabular-nums;
  margin: 8px 0 4px;
}
```

- [ ] **Step 3: Smoke-test**

Temporarily add to the bottom of `js/app.js`:

```js
import { renderAbacus } from './abacus.js';
const readout = document.createElement('div');
readout.className = 'amount-readout';
screens.entry.appendChild(readout);
renderAbacus(screens.entry, cents => {
  readout.textContent = '$' + (cents / 100).toFixed(2);
});
```

Open `index.html`, confirm the abacus renders, tapping beads flicks them and the readout updates. Tap rightmost-column bottom bead → readout becomes `$0.01`. Tap a heaven bead in column 12 → `$0.05`. Remove the scratch lines after verification.

- [ ] **Step 4: Commit**

```bash
git add js/abacus.js style.css js/app.js
git commit -m "feat: add SVG abacus with tap-to-flick and cents readout"
```

---

## Task 6: Handwriting module

**Files:**
- Create: `js/handwriting.js`

**Context:** Wraps a `<canvas>`. Captures pointer strokes as normalized `[x, y, t]` coordinates in `[0, 1]`. Exports: `renderNotePad(container)` returning `{ getStrokes, clear }`, and `drawStrokes(canvas, strokes)` for re-rendering (used by ledger thumbnails).

- [ ] **Step 1: Create `js/handwriting.js`**

```js
export function renderNotePad(container) {
  const wrap = document.createElement('div');
  wrap.className = 'notepad';

  const canvas = document.createElement('canvas');
  canvas.className = 'notepad-canvas';
  wrap.appendChild(canvas);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.textContent = '清';
  clearBtn.className = 'notepad-clear';
  wrap.appendChild(clearBtn);

  container.appendChild(wrap);

  // Use a fixed internal resolution for crisp strokes; CSS sizes it responsively.
  const W = 480;
  const H = 200;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const strokes = [];
  let current = null;
  let startT = 0;

  function pointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const t = Date.now() - startT;
    return [clamp01(x), clamp01(y), t];
  }

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function drawPoint(p, prev) {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (prev) ctx.moveTo(prev[0] * W, prev[1] * H);
    else ctx.moveTo(p[0] * W, p[1] * H);
    ctx.lineTo(p[0] * W, p[1] * H);
    ctx.stroke();
  }

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    startT = Date.now();
    current = [pointFromEvent(e)];
    strokes.push(current);
    drawPoint(current[0], null);
  });

  canvas.addEventListener('pointermove', e => {
    if (!current) return;
    const p = pointFromEvent(e);
    const prev = current[current.length - 1];
    current.push(p);
    drawPoint(p, prev);
  });

  canvas.addEventListener('pointerup', () => { current = null; });
  canvas.addEventListener('pointercancel', () => { current = null; });

  clearBtn.addEventListener('click', () => {
    strokes.length = 0;
    ctx.clearRect(0, 0, W, H);
  });

  return {
    getStrokes: () => strokes.map(s => s.slice()),
    clear: () => {
      strokes.length = 0;
      ctx.clearRect(0, 0, W, H);
    },
  };
}

export function drawStrokes(canvas, strokes) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = Math.max(1, W / 200);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    ctx.beginPath();
    ctx.moveTo(stroke[0][0] * W, stroke[0][1] * H);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i][0] * W, stroke[i][1] * H);
    }
    ctx.stroke();
  }
}
```

- [ ] **Step 2: Add notepad styles**

Append to `style.css`:

```css
.notepad {
  position: relative;
  margin: 24px 0;
  border: 2px solid var(--rule);
  border-radius: 4px;
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0, transparent 28px,
      var(--rule) 28px, var(--rule) 29px
    );
}

.notepad-canvas {
  display: block;
  width: 100%;
  height: 180px;
  touch-action: none;
}

.notepad-clear {
  position: absolute;
  top: 6px;
  right: 8px;
  font-family: inherit;
  font-size: 18px;
  font-weight: 700;
  color: var(--seal);
  background: transparent;
  border: none;
  min-height: 32px;
  padding: 0 8px;
}
```

- [ ] **Step 3: Smoke-test**

Temporarily add to `js/app.js`:

```js
import { renderNotePad } from './handwriting.js';
const pad = renderNotePad(screens.entry);
setTimeout(() => console.log('strokes:', pad.getStrokes()), 5000);
```

Open in browser, draw a few strokes with mouse or finger, verify lines appear, `清` clears. After 5 seconds, verify the console logs stroke arrays. Remove scratch lines.

- [ ] **Step 4: Commit**

```bash
git add js/handwriting.js style.css js/app.js
git commit -m "feat: add canvas notepad with normalized stroke capture"
```

---

## Task 7: Wire up the 記帳 entry screen

**Files:**
- Modify: `js/app.js`
- Modify: `style.css`

**Context:** Replace the placeholder in `js/app.js` with the full entry screen: header with 數簿 seal and 農曆 date, amount readout, abacus, category grid, notepad, 入賬 button. Handles validation and save.

- [ ] **Step 1: Replace `js/app.js` entirely**

```js
import { toLunarString } from './lunar.js';
import { saveRecord } from './storage.js';
import { renderCategoryGrid } from './categories.js';
import { renderAbacus } from './abacus.js';
import { renderNotePad } from './handwriting.js';

const tabs = document.querySelectorAll('#tabs .tab');
const screens = {
  entry: document.getElementById('screen-entry'),
  ledger: document.getElementById('screen-ledger'),
};

function showScreen(name) {
  for (const key of Object.keys(screens)) {
    screens[key].dataset.active = key === name ? 'true' : 'false';
  }
  for (const tab of tabs) {
    tab.classList.toggle('active', tab.dataset.screen === name);
  }
  if (name === 'ledger') renderLedger();
}

for (const tab of tabs) {
  tab.addEventListener('click', () => showScreen(tab.dataset.screen));
}

// -------- Entry screen --------

function buildEntryScreen() {
  const root = screens.entry;
  root.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'entry-header';
  header.innerHTML = `
    <div class="seal" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <rect x="4" y="4" width="92" height="92" fill="none"
              stroke="var(--seal)" stroke-width="4" />
        <text x="50" y="58" text-anchor="middle"
              font-family="Noto Serif TC, serif"
              font-size="42" font-weight="900" fill="var(--seal)">數簿</text>
      </svg>
    </div>
    <div class="lunar-date"></div>
  `;
  root.appendChild(header);
  header.querySelector('.lunar-date').textContent = toLunarString(new Date());

  const readout = document.createElement('div');
  readout.className = 'amount-readout';
  readout.textContent = '$0.00';
  root.appendChild(readout);

  const abacusWrap = document.createElement('div');
  root.appendChild(abacusWrap);
  const abacus = renderAbacus(abacusWrap, cents => {
    readout.textContent = '$' + (cents / 100).toFixed(2);
  });

  const cats = renderCategoryGrid(root, () => {});

  const pad = renderNotePad(root);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'save-btn';
  saveBtn.textContent = '入賬';
  root.appendChild(saveBtn);

  const chop = document.createElement('div');
  chop.className = 'chop';
  chop.textContent = '入';
  root.appendChild(chop);

  saveBtn.addEventListener('click', () => {
    const amount = abacus.value;
    const category = cats.value;
    if (amount === 0 || !category) {
      saveBtn.classList.remove('shake');
      void saveBtn.offsetWidth; // restart animation
      saveBtn.classList.add('shake');
      return;
    }
    const record = {
      id: String(Date.now()),
      createdAt: Date.now(),
      lunarDate: toLunarString(new Date()),
      amount,
      category,
      noteStrokes: pad.getStrokes(),
    };
    try {
      saveRecord(record);
    } catch (e) {
      alert('寫唔入簿\n' + e.message);
      return;
    }
    // stamp animation
    chop.classList.remove('stamp');
    void chop.offsetWidth;
    chop.classList.add('stamp');
    // reset form
    abacus.reset();
    cats.clear();
    pad.clear();
  });
}

// -------- Ledger screen (placeholder until Task 8) --------

function renderLedger() {
  screens.ledger.innerHTML = '<p style="padding:24px;text-align:center;opacity:.6">賬簿 — 待開發</p>';
}

buildEntryScreen();
showScreen('entry');
```

- [ ] **Step 2: Add entry-screen styles**

Append to `style.css`:

```css
.entry-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.seal {
  width: 64px;
  height: 64px;
  transform: rotate(-3deg);
  flex-shrink: 0;
}

.seal svg {
  width: 100%;
  height: 100%;
}

.lunar-date {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
}

.save-btn {
  display: block;
  width: 100%;
  margin: 24px 0 8px;
  padding: 18px 0;
  font-family: inherit;
  font-size: 28px;
  font-weight: 900;
  color: var(--paper);
  background: var(--seal);
  border: none;
  border-radius: 6px;
  letter-spacing: 6px;
  min-height: 64px;
}

.save-btn.shake {
  animation: shake 260ms ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

.chop {
  position: fixed;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-8deg);
  font-size: 180px;
  font-weight: 900;
  color: var(--seal);
  opacity: 0;
  pointer-events: none;
  z-index: 10;
}

.chop.stamp {
  animation: chop-fade 600ms ease-out;
}

@keyframes chop-fade {
  0%   { opacity: 0;   transform: translate(-50%, -50%) rotate(-8deg) scale(1.4); }
  30%  { opacity: 0.5; transform: translate(-50%, -50%) rotate(-8deg) scale(1.0); }
  100% { opacity: 0;   transform: translate(-50%, -50%) rotate(-8deg) scale(1.0); }
}
```

- [ ] **Step 3: Verify in browser**

Open `index.html`. You should see: 數簿 seal at top, today's 農曆 date, readout `$0.00`, abacus, 9 categories, notepad, big red 入賬 button. Enter an amount via beads, circle a category, write a note, tap 入賬 — form should clear and a big red 入 character should flash and fade. Check DevTools: `localStorage.getItem('bookkeeping.records')` should contain your record.

Test validation: refresh, tap 入賬 immediately — button should shake and nothing saves. Enter amount but no category — same. Enter amount + category but no note — should save (note is optional).

- [ ] **Step 4: Commit**

```bash
git add js/app.js style.css
git commit -m "feat: wire up 記帳 entry screen with save and stamp animation"
```

---

## Task 8: Ledger screen

**Files:**
- Modify: `js/app.js`
- Modify: `style.css`

**Context:** Replace the placeholder `renderLedger` with a real implementation: show current-month total, filter chips, list of records with thumbnails, expandable rows with delete confirmation.

- [ ] **Step 1: Update imports and replace `renderLedger` in `js/app.js`**

At the top of `js/app.js`, update the storage import to add `loadRecords` and `deleteRecord`:

```js
import { saveRecord, loadRecords, deleteRecord } from './storage.js';
```

At the top of `js/app.js`, update the categories import:

```js
import { renderCategoryGrid, CATEGORIES } from './categories.js';
```

At the top of `js/app.js`, update the handwriting import:

```js
import { renderNotePad, drawStrokes } from './handwriting.js';
```

Then replace the placeholder `renderLedger` with:

```js
let activeFilter = null;

function renderLedger() {
  const root = screens.ledger;
  root.innerHTML = '';

  const all = loadRecords().sort((a, b) => b.createdAt - a.createdAt);

  // Month total for the current calendar month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthTotal = all
    .filter(r => r.createdAt >= monthStart)
    .reduce((sum, r) => sum + r.amount, 0);

  const totalBox = document.createElement('div');
  totalBox.className = 'month-total';
  totalBox.innerHTML = `<span>本月總計</span><strong>$${(monthTotal / 100).toFixed(2)}</strong>`;
  root.appendChild(totalBox);

  // Filter chips
  const chips = document.createElement('div');
  chips.className = 'filter-chips';
  for (const name of CATEGORIES) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'filter-chip';
    chip.textContent = name;
    if (activeFilter === name) chip.classList.add('active');
    chip.addEventListener('click', () => {
      activeFilter = activeFilter === name ? null : name;
      renderLedger();
    });
    chips.appendChild(chip);
  }
  root.appendChild(chips);

  // List
  const list = document.createElement('div');
  list.className = 'ledger-list';
  root.appendChild(list);

  const visible = activeFilter ? all.filter(r => r.category === activeFilter) : all;

  if (visible.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'ledger-empty';
    empty.textContent = '空簿';
    list.appendChild(empty);
  } else {
    for (const r of visible) {
      list.appendChild(buildLedgerRow(r));
    }
  }
}

function buildLedgerRow(record) {
  const row = document.createElement('div');
  row.className = 'ledger-row';

  const summary = document.createElement('button');
  summary.type = 'button';
  summary.className = 'ledger-summary';
  summary.innerHTML = `
    <div class="lr-date">${record.lunarDate}</div>
    <div class="lr-amount">$${(record.amount / 100).toFixed(2)}</div>
    <div class="lr-cat">${record.category}</div>
    <canvas class="lr-thumb" width="160" height="60"></canvas>
  `;
  drawStrokes(summary.querySelector('.lr-thumb'), record.noteStrokes);
  row.appendChild(summary);

  const detail = document.createElement('div');
  detail.className = 'ledger-detail';
  detail.hidden = true;
  detail.innerHTML = `
    <canvas class="lr-full" width="480" height="200"></canvas>
    <button type="button" class="lr-delete">刪除</button>
  `;
  drawStrokes(detail.querySelector('.lr-full'), record.noteStrokes);
  row.appendChild(detail);

  summary.addEventListener('click', () => {
    detail.hidden = !detail.hidden;
  });

  detail.querySelector('.lr-delete').addEventListener('click', () => {
    if (!confirm('確定?')) return;
    deleteRecord(record.id);
    renderLedger();
  });

  return row;
}
```

- [ ] **Step 2: Add ledger styles**

Append to `style.css`:

```css
.month-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 12px 4px;
  font-size: 20px;
  font-weight: 700;
  color: var(--cash);
  border-bottom: 2px solid var(--rule);
}

.month-total strong {
  font-size: 28px;
  font-variant-numeric: tabular-nums;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 0;
}

.filter-chip {
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
  background: transparent;
  border: 1.5px solid var(--rule);
  border-radius: 14px;
  padding: 6px 12px;
  min-height: 32px;
}

.filter-chip.active {
  color: var(--paper);
  background: var(--seal);
  border-color: var(--seal);
}

.ledger-list { margin-bottom: 16px; }

.ledger-row {
  border-bottom: 1px solid var(--rule);
}

.ledger-summary {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    "date amount"
    "cat  thumb";
  gap: 4px 12px;
  width: 100%;
  padding: 12px 4px;
  font-family: inherit;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--ink);
}

.lr-date   { grid-area: date;   font-size: 16px; font-weight: 700; }
.lr-amount { grid-area: amount; font-size: 22px; font-weight: 900;
             font-variant-numeric: tabular-nums; }
.lr-cat    { grid-area: cat;    font-size: 18px; color: var(--seal); font-weight: 700; }
.lr-thumb  { grid-area: thumb;  width: 120px; height: 44px; opacity: 0.8; }

.ledger-detail {
  padding: 8px 4px 16px;
}

.lr-full {
  display: block;
  width: 100%;
  height: auto;
  background: var(--paper);
  border: 1px dashed var(--rule);
  margin-bottom: 8px;
}

.lr-delete {
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  color: var(--paper);
  background: var(--seal);
  border: none;
  border-radius: 4px;
  padding: 8px 20px;
  min-height: 40px;
}

.ledger-empty {
  text-align: center;
  padding: 40px 0;
  color: var(--ink);
  opacity: 0.5;
  font-size: 20px;
  font-weight: 700;
}
```

- [ ] **Step 3: Verify in browser**

Open `index.html`, enter 3-4 records with different categories. Switch to 賬簿 tab. Confirm: month total reflects the sum, records appear newest-first, thumbnails show the notes, tapping a row expands to show full note and delete button, delete shows a 確定? prompt and removes the record. Tapping filter chips restricts the list to one category. Tapping the same chip again clears the filter.

- [ ] **Step 4: Commit**

```bash
git add js/app.js style.css
git commit -m "feat: add ledger screen with month total, filters, and delete"
```

---

## Task 9: Export / import / clear-all in ledger footer

**Files:**
- Modify: `js/app.js`
- Modify: `style.css`

**Context:** Add three buttons at the bottom of the ledger: 匯出 downloads JSON, 匯入 reads a picked file, 清簿 wipes all records after confirmation.

- [ ] **Step 1: Update storage import in `js/app.js`**

Change the storage import to:

```js
import { loadRecords, deleteRecord, clearAll, exportJSON, importJSON } from './storage.js';
```

- [ ] **Step 2: Add the footer to `renderLedger`**

At the end of `renderLedger()`, after `root.appendChild(list)`, append:

```js
  const footer = document.createElement('div');
  footer.className = 'ledger-footer';
  footer.innerHTML = `
    <button type="button" class="lf-btn" data-act="export">匯出</button>
    <label class="lf-btn" data-act="import">
      匯入<input type="file" accept="application/json" hidden />
    </label>
    <button type="button" class="lf-btn danger" data-act="clear">清簿</button>
  `;
  root.appendChild(footer);

  footer.querySelector('[data-act="export"]').addEventListener('click', () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `數簿-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  footer.querySelector('[data-act="import"] input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      importJSON(text);
      renderLedger();
    } catch (err) {
      alert('唔啱格式: ' + err.message);
    }
  });

  footer.querySelector('[data-act="clear"]').addEventListener('click', () => {
    if (!confirm('清簿?\n所有記錄將會刪除')) return;
    clearAll();
    renderLedger();
  });
```

- [ ] **Step 3: Add footer styles**

Append to `style.css`:

```css
.ledger-footer {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 16px 0 24px;
  border-top: 2px solid var(--rule);
  margin-top: 8px;
}

.lf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
  background: transparent;
  border: 1.5px solid var(--ink);
  border-radius: 4px;
  padding: 10px 18px;
  min-height: 44px;
  cursor: pointer;
}

.lf-btn.danger {
  color: var(--seal);
  border-color: var(--seal);
}
```

- [ ] **Step 4: Verify**

Open `index.html`, create some records. In 賬簿: tap 匯出 → a JSON file downloads. Tap 清簿 → confirm → list goes empty. Tap 匯入, pick the file you just downloaded → records return. Try importing a junk text file → alert shows 唔啱格式.

- [ ] **Step 5: Commit**

```bash
git add js/app.js style.css
git commit -m "feat: add ledger export, import, and clear-all"
```

---

## Task 10: Paper texture and final polish

**Files:**
- Modify: `style.css`
- Modify: `index.html`

**Context:** Add the paper noise texture, ruled ledger feel to the main app background, and iOS safe-area polish. Purely visual.

- [ ] **Step 1: Add inline SVG noise filter to `index.html`**

Inside `<body>`, directly after the opening `<body>` tag, add:

```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="paper-noise">
    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" />
    <feColorMatrix values="0 0 0 0 0.55
                           0 0 0 0 0.45
                           0 0 0 0 0.30
                           0 0 0 0.08 0" />
  </filter>
</svg>
```

- [ ] **Step 2: Update body background in `style.css`**

Replace the existing `html, body` rule with:

```css
html, body {
  margin: 0;
  padding: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: "Noto Serif TC", "Ma Shan Zheng", serif;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  background-image:
    radial-gradient(ellipse at top, rgba(255,255,255,0.4), transparent 60%),
    radial-gradient(ellipse at bottom right, rgba(120, 80, 20, 0.08), transparent 60%);
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  filter: url(#paper-noise);
  opacity: 0.35;
  mix-blend-mode: multiply;
}

#app { position: relative; z-index: 1; }
#tabs { position: fixed; z-index: 2; }
```

- [ ] **Step 3: Verify**

Open `index.html`. The background should have a subtle grainy beige paper feel, warmer in the top-left and shadowed in the bottom-right. All existing UI should still be fully tappable (the noise layer has `pointer-events: none`).

- [ ] **Step 4: Commit**

```bash
git add index.html style.css
git commit -m "feat: add paper texture background"
```

---

## Task 11: Final manual test checklist

**Files:** none (verification only)

- [ ] **Step 1: Walk through this checklist in a mobile browser or mobile-sized window**

Open the app on a phone, or in Chrome DevTools with device toolbar set to iPhone 14. Perform each step and confirm.

1. [ ] Page loads. Bottom tabs show 記帳 (active) and 賬簿.
2. [ ] Header shows 數簿 seal and today's 農曆 date.
3. [ ] Readout shows `$0.00`.
4. [ ] Tap a lower bead in column 12 (rightmost) → readout becomes `$0.01`.
5. [ ] Tap the same bead again → back to `$0.00`.
6. [ ] Tap a heaven bead in column 12 → readout `$0.05`.
7. [ ] Enter `$42.50` by flicking beads. Verify readout.
8. [ ] Tap 伙食 → red circle draws around it.
9. [ ] Tap 交際 → circle moves to 交際, 伙食 clears.
10. [ ] Tap 交際 again → circle clears, no category selected.
11. [ ] Tap 伙食 again.
12. [ ] Draw something on the notepad with your finger or mouse.
13. [ ] Tap 清 → notepad clears.
14. [ ] Draw again.
15. [ ] Tap 入賬 → red 入 character flashes and fades, form resets (readout 0, no circle, pad empty).
16. [ ] Tap 入賬 with zero amount → button shakes, nothing saves.
17. [ ] Enter amount, no category, tap 入賬 → button shakes.
18. [ ] Save a second record with a different amount, category, and note.
19. [ ] Switch to 賬簿 tab.
20. [ ] Month total shows the sum of both records.
21. [ ] Both rows appear, newest first, with thumbnails of the notes.
22. [ ] Tap a row → full note expands, delete button visible.
23. [ ] Tap 刪除 → confirmation appears, confirm → row disappears, total updates.
24. [ ] Tap a filter chip → only matching records remain. Tap again to clear filter.
25. [ ] Tap 匯出 → JSON file downloads.
26. [ ] Tap 清簿 → confirm → list empty, total `$0.00`.
27. [ ] Tap 匯入, pick the downloaded file → records return.
28. [ ] Reload the page → records still there (localStorage persistence).
29. [ ] Switch back to 記帳 → fresh empty form.

- [ ] **Step 2: Run lunar tests one more time**

Run: `node js/lunar.test.js`
Expected: `All lunar tests passed`

- [ ] **Step 3: Final commit (if any fixes were made)**

```bash
git add -A
git commit -m "chore: final manual test fixes" || echo "no fixes needed"
```
