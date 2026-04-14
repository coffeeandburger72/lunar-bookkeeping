import { toLunarString } from './lunar.js';
import { saveRecord, loadRecords, deleteRecord, clearAll, exportJSON, importJSON } from './storage.js';
import { renderCategoryGrid, CATEGORIES } from './categories.js';
import { renderAbacus } from './abacus.js';
import { renderNotePad, drawStrokes } from './handwriting.js';

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
        <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
              font-family="Noto Serif TC, serif"
              font-size="38" font-weight="900" fill="var(--seal)">數簿</text>
      </svg>
    </div>
    <div class="lunar-date"></div>
  `;
  root.appendChild(header);
  header.querySelector('.lunar-date').textContent = toLunarString(new Date());

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

  const pad = renderNotePad(root);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'save-btn';
  saveBtn.textContent = '入賬';
  root.appendChild(saveBtn);

  const chop = document.createElement('div');
  chop.className = 'chop';
  chop.innerHTML = `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect x="4" y="4" width="92" height="92" rx="4" fill="var(--seal)" />
      <text x="50" y="52" text-anchor="middle" dominant-baseline="central"
            font-family="Noto Serif TC, serif"
            font-size="68" font-weight="900" fill="var(--paper)">入</text>
    </svg>
  `;
  chop.addEventListener('animationend', () => chop.classList.remove('stamp'));
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
    closeSheet();
  });
}


// -------- Ledger screen --------

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

buildEntryScreen();
showScreen('entry');
