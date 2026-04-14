import { saveRecord, loadRecords, deleteRecord, clearAll, exportJSON, importJSON, renameCategories } from './storage.js';
import { renderCategoryGrid, getCategories } from './categories.js';
import { renderAbacus } from './abacus.js';
import { renderNotePad, drawStrokes } from './handwriting.js';
import { loadSettings, saveSettings, formatDate, DEFAULT_CATEGORIES } from './settings.js';

const tabs = document.querySelectorAll('#tabs .tab');
const screens = {
  entry: document.getElementById('screen-entry'),
  ledger: document.getElementById('screen-ledger'),
};

let currentCats = null;
let currentDateEl = null;

function showScreen(name) {
  for (const key of Object.keys(screens)) {
    screens[key].dataset.active = key === name ? 'true' : 'false';
  }
  for (const tab of tabs) {
    tab.classList.toggle('active', tab.dataset.screen === name);
  }
  document.body.dataset.screen = name;
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
        <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
              font-family="Noto Serif TC, serif"
              font-size="38" font-weight="900" fill="var(--seal)">數簿</text>
      </svg>
    </div>
    <div class="lunar-date"></div>
    <button type="button" class="gear-btn" aria-label="設定">
      <svg viewBox="0 0 24 24" aria-hidden="true"
           fill="none" stroke="var(--ink)" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  `;
  root.appendChild(header);

  currentDateEl = header.querySelector('.lunar-date');
  refreshDate();

  header.querySelector('.gear-btn').addEventListener('click', openSettings);

  const amountCard = document.createElement('button');
  amountCard.type = 'button';
  amountCard.className = 'amount-card';
  amountCard.setAttribute('aria-expanded', 'false');
  amountCard.innerHTML = `
    <div class="amount-readout">$0.00</div>
    <span class="amount-hint">按此用算盤輸入</span>
  `;
  root.appendChild(amountCard);
  const readout = amountCard.querySelector('.amount-readout');

  function setReadout(cents) {
    const text = '$' + (cents / 100).toFixed(2);
    readout.textContent = text;
    const len = text.length;
    let size = 44;
    if (len > 8) size = 44 - (len - 8) * 3;
    if (size < 22) size = 22;
    readout.style.fontSize = size + 'px';
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.dataset.open = 'false';
  document.body.appendChild(backdrop);

  const sheet = document.createElement('div');
  sheet.className = 'abacus-sheet';
  sheet.dataset.open = 'false';
  sheet.innerHTML = `<div class="sheet-grip"></div>`;
  const sheetBody = document.createElement('div');
  sheetBody.className = 'sheet-body';
  sheet.appendChild(sheetBody);
  document.body.appendChild(sheet);
  const abacus = renderAbacus(sheetBody, setReadout);

  function openSheet() {
    sheet.dataset.open = 'true';
    backdrop.dataset.open = 'true';
    amountCard.setAttribute('aria-expanded', 'true');
    document.body.classList.add('sheet-open');
  }
  function closeSheet() {
    sheet.dataset.open = 'false';
    backdrop.dataset.open = 'false';
    amountCard.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('sheet-open');
  }

  amountCard.addEventListener('click', () => {
    if (sheet.dataset.open === 'true') closeSheet();
    else openSheet();
  });
  backdrop.addEventListener('click', closeSheet);
  sheet.addEventListener('click', e => e.stopPropagation());

  const cats = renderCategoryGrid(root, () => {});
  currentCats = cats;

  const pad = renderNotePad(root);

  const saveSlot = document.createElement('div');
  saveSlot.className = 'save-btn-slot';
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'save-btn';
  saveBtn.setAttribute('aria-label', '入賬確認');
  saveBtn.innerHTML = '<img src="assets/save-stamp.png" alt="入賬確認" draggable="false" />';
  saveSlot.appendChild(saveBtn);
  document.body.appendChild(saveSlot);

  const chop = document.createElement('div');
  chop.className = 'chop';
  chop.innerHTML = `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect x="4" y="4" width="92" height="92" rx="3" fill="var(--seal)" />
      <text x="50" y="74" text-anchor="middle"
            font-family="'Noto Serif TC','Ma Shan Zheng',serif"
            font-size="72" font-weight="900" fill="var(--paper)">入</text>
    </svg>
  `;
  chop.addEventListener('animationend', () => chop.classList.remove('stamp'));
  root.appendChild(chop);

  saveBtn.addEventListener('click', () => {
    const amount = abacus.value;
    const category = cats.value;
    if (amount === 0 || !category) {
      saveBtn.animate(
        [
          { transform: 'translate3d(0,0,0)' },
          { transform: 'translate3d(-8px,0,0)' },
          { transform: 'translate3d(8px,0,0)' },
          { transform: 'translate3d(-6px,0,0)' },
          { transform: 'translate3d(6px,0,0)' },
          { transform: 'translate3d(0,0,0)' },
        ],
        { duration: 300, easing: 'ease-in-out' }
      );
      return;
    }
    const record = {
      id: String(Date.now()),
      createdAt: Date.now(),
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
    chop.classList.remove('stamp');
    void chop.offsetWidth;
    chop.classList.add('stamp');
    abacus.reset();
    cats.clear();
    pad.clear();
    closeSheet();
  });
}

function refreshDate() {
  if (!currentDateEl) return;
  const mode = loadSettings().dateFormat;
  currentDateEl.textContent = formatDate(new Date(), mode);
}

// -------- Settings modal --------

function openSettings() {
  const settings = loadSettings();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal settings-modal';
  modal.innerHTML = `
    <header class="modal-header">
      <h2>設定</h2>
      <button type="button" class="modal-close" aria-label="關閉">✕</button>
    </header>
    <div class="modal-body">
      <section class="settings-section">
        <h3>日期</h3>
        <div class="segmented" role="radiogroup">
          <button type="button" class="seg-btn" data-mode="lunar">農曆</button>
          <button type="button" class="seg-btn" data-mode="solar">西曆</button>
        </div>
      </section>
      <section class="settings-section">
        <h3>分類</h3>
        <div class="cat-edit-grid"></div>
      </section>
    </div>
    <footer class="modal-footer">
      <button type="button" class="lf-btn" data-act="reset">還原</button>
      <button type="button" class="lf-btn primary" data-act="save">儲存</button>
    </footer>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('open'));

  const segBtns = modal.querySelectorAll('.seg-btn');
  let currentMode = settings.dateFormat;
  function paintSeg() {
    for (const b of segBtns) {
      b.classList.toggle('active', b.dataset.mode === currentMode);
    }
  }
  paintSeg();
  for (const b of segBtns) {
    b.addEventListener('click', () => {
      currentMode = b.dataset.mode;
      paintSeg();
    });
  }

  const catGrid = modal.querySelector('.cat-edit-grid');
  const catInputs = [];
  for (let i = 0; i < settings.categories.length; i++) {
    const row = document.createElement('label');
    row.className = 'cat-edit-row';
    const hint = document.createElement('span');
    hint.className = 'cat-edit-hint';
    hint.textContent = DEFAULT_CATEGORIES[i];
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 6;
    input.className = 'cat-edit-input';
    input.value = settings.categories[i];
    row.appendChild(hint);
    row.appendChild(input);
    catGrid.appendChild(row);
    catInputs.push(input);
  }

  function close() {
    backdrop.classList.remove('open');
    setTimeout(() => backdrop.remove(), 220);
  }

  modal.querySelector('.modal-close').addEventListener('click', close);
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) close();
  });

  modal.querySelector('[data-act="reset"]').addEventListener('click', () => {
    for (let i = 0; i < catInputs.length; i++) {
      catInputs[i].value = DEFAULT_CATEGORIES[i];
    }
    currentMode = 'lunar';
    paintSeg();
  });

  modal.querySelector('[data-act="save"]').addEventListener('click', () => {
    const oldCats = settings.categories.slice();
    const newCats = catInputs.map((inp, i) => {
      const v = inp.value.trim();
      return v || oldCats[i];
    });
    const seen = new Set();
    for (let i = 0; i < newCats.length; i++) {
      let base = newCats[i];
      let name = base;
      let n = 2;
      while (seen.has(name)) name = base + n++;
      newCats[i] = name;
      seen.add(name);
    }
    const renames = [];
    for (let i = 0; i < oldCats.length; i++) {
      if (oldCats[i] !== newCats[i]) {
        renames.push({ from: oldCats[i], to: newCats[i] });
      }
    }
    saveSettings({ categories: newCats, dateFormat: currentMode });
    if (renames.length) {
      renameCategories(renames);
      const map = new Map(renames.map(r => [r.from, r.to]));
      if (activeFilter && map.has(activeFilter)) activeFilter = map.get(activeFilter);
    }
    if (currentCats) currentCats.updateNames(newCats);
    refreshDate();
    if (screens.ledger.dataset.active === 'true') renderLedger();
    close();
  });
}

// -------- Ledger screen --------

let activeFilter = null;

function renderLedger() {
  const root = screens.ledger;
  root.innerHTML = '';

  const settings = loadSettings();
  const all = loadRecords().sort((a, b) => b.createdAt - a.createdAt);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthTotal = all
    .filter(r => r.createdAt >= monthStart)
    .reduce((sum, r) => sum + r.amount, 0);

  const totalBox = document.createElement('div');
  totalBox.className = 'month-total';
  totalBox.innerHTML = `<span>本月總計</span><strong>$${(monthTotal / 100).toFixed(2)}</strong>`;
  root.appendChild(totalBox);

  const chips = document.createElement('div');
  chips.className = 'filter-chips';
  for (const name of settings.categories) {
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
      list.appendChild(buildLedgerRow(r, settings.dateFormat));
    }
  }

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
      const fresh = loadSettings();
      if (currentCats) currentCats.updateNames(fresh.categories);
      activeFilter = null;
      refreshDate();
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
}

function buildLedgerRow(record, mode) {
  const row = document.createElement('div');
  row.className = 'ledger-row';

  const dateStr = formatDate(new Date(record.createdAt), mode);

  const summary = document.createElement('button');
  summary.type = 'button';
  summary.className = 'ledger-summary';
  summary.innerHTML = `
    <div class="lr-date">${dateStr}</div>
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

buildEntryScreen();
showScreen('entry');
