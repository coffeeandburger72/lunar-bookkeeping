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
