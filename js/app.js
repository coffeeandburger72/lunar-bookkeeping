import { toLunarString } from './lunar.js';
import { saveRecord, loadRecords, deleteRecord } from './storage.js';
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
