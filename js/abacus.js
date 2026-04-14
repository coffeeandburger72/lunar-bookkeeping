const COLUMNS = 13;
const CENTS_COLUMNS = 2;
const NS = 'http://www.w3.org/2000/svg';

const COL_W = 26;
const FRAME_PAD = 14;
const HEAVEN_H = 42;
const BAR_Y = HEAVEN_H + 10;
const EARTH_H = 82;
const FRAME_H = BAR_Y + EARTH_H + FRAME_PAD;
const LABEL_H = 22;
const TOTAL_W = COLUMNS * COL_W + FRAME_PAD * 2;
const TOTAL_H = FRAME_H + LABEL_H;

const HEAVEN_DELTA = 9;
const EARTH_DELTA = -12;

const COL_LABELS = {
  2: '千萬',
  5: '萬',
  8: '百',
  9: '十',
  10: '元',
  11: '角',
  12: '分',
};

export function renderAbacus(container, onChange) {
  const state = Array.from({ length: COLUMNS }, () => ({
    heaven: [false, false],
    earth:  [false, false, false, false, false],
  }));

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${TOTAL_W} ${TOTAL_H}`);
  svg.setAttribute('class', 'abacus');

  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = `
    <radialGradient id="bead-grad" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#a67c52" />
      <stop offset="45%" stop-color="#5a3a20" />
      <stop offset="100%" stop-color="#1c0f06" />
    </radialGradient>
    <linearGradient id="wood-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8b5a32" />
      <stop offset="50%" stop-color="#6e4423" />
      <stop offset="100%" stop-color="#4a2d14" />
    </linearGradient>
    <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6e4423" />
      <stop offset="50%" stop-color="#3a2110" />
      <stop offset="100%" stop-color="#6e4423" />
    </linearGradient>
  `;
  svg.appendChild(defs);

  const frame = document.createElementNS(NS, 'rect');
  frame.setAttribute('x', 2);
  frame.setAttribute('y', 2);
  frame.setAttribute('width', TOTAL_W - 4);
  frame.setAttribute('height', FRAME_H - 4);
  frame.setAttribute('rx', 8);
  frame.setAttribute('fill', 'none');
  frame.setAttribute('stroke', 'url(#wood-grad)');
  frame.setAttribute('stroke-width', 8);
  svg.appendChild(frame);

  const bar = document.createElementNS(NS, 'rect');
  bar.setAttribute('x', FRAME_PAD);
  bar.setAttribute('y', BAR_Y - 3);
  bar.setAttribute('width', COLUMNS * COL_W);
  bar.setAttribute('height', 6);
  bar.setAttribute('fill', 'url(#bar-grad)');
  svg.appendChild(bar);

  // Decimal separator between 元 (col 10) and 角 (col 11) — red tick
  const decimalX = FRAME_PAD + 11 * COL_W;
  const tickTop = document.createElementNS(NS, 'circle');
  tickTop.setAttribute('cx', decimalX);
  tickTop.setAttribute('cy', BAR_Y - 8);
  tickTop.setAttribute('r', 2);
  tickTop.setAttribute('fill', 'var(--seal)');
  svg.appendChild(tickTop);
  const tickBot = document.createElementNS(NS, 'circle');
  tickBot.setAttribute('cx', decimalX);
  tickBot.setAttribute('cy', BAR_Y + 8);
  tickBot.setAttribute('r', 2);
  tickBot.setAttribute('fill', 'var(--seal)');
  svg.appendChild(tickBot);

  const beadEls = [];
  for (let c = 0; c < COLUMNS; c++) {
    const cx = FRAME_PAD + c * COL_W + COL_W / 2;

    const rod = document.createElementNS(NS, 'line');
    rod.setAttribute('x1', cx);
    rod.setAttribute('y1', FRAME_PAD);
    rod.setAttribute('x2', cx);
    rod.setAttribute('y2', FRAME_H - FRAME_PAD);
    rod.setAttribute('stroke', '#2a180a');
    rod.setAttribute('stroke-width', 1);
    rod.setAttribute('opacity', '0.55');
    svg.appendChild(rod);

    const colBeads = { heaven: [], earth: [] };

    for (let i = 0; i < 2; i++) {
      const cy = FRAME_PAD + 8 + i * 13;
      const bead = document.createElementNS(NS, 'ellipse');
      bead.setAttribute('cx', cx);
      bead.setAttribute('cy', cy);
      bead.setAttribute('rx', 10);
      bead.setAttribute('ry', 6.5);
      bead.setAttribute('fill', 'url(#bead-grad)');
      bead.setAttribute('class', 'bead');
      bead.dataset.col = c;
      bead.dataset.kind = 'heaven';
      bead.dataset.idx = i;
      svg.appendChild(bead);
      colBeads.heaven.push(bead);
    }
    for (let i = 0; i < 5; i++) {
      const cy = FRAME_H - FRAME_PAD - 8 - (4 - i) * 13;
      const bead = document.createElementNS(NS, 'ellipse');
      bead.setAttribute('cx', cx);
      bead.setAttribute('cy', cy);
      bead.setAttribute('rx', 10);
      bead.setAttribute('ry', 6.5);
      bead.setAttribute('fill', 'url(#bead-grad)');
      bead.setAttribute('class', 'bead');
      bead.dataset.col = c;
      bead.dataset.kind = 'earth';
      bead.dataset.idx = i;
      svg.appendChild(bead);
      colBeads.earth.push(bead);
    }

    if (COL_LABELS[c]) {
      const label = document.createElementNS(NS, 'text');
      label.setAttribute('x', cx);
      label.setAttribute('y', FRAME_H + 15);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('font-size', '11');
      label.setAttribute('font-weight', '700');
      label.setAttribute('font-family', 'Noto Serif TC, serif');
      label.setAttribute('fill', c >= 11 ? 'var(--seal)' : 'var(--ink)');
      label.setAttribute('opacity', '0.7');
      label.setAttribute('pointer-events', 'none');
      label.textContent = COL_LABELS[c];
      svg.appendChild(label);
    }

    beadEls.push(colBeads);
  }

  container.appendChild(svg);

  function layout() {
    for (let c = 0; c < COLUMNS; c++) {
      const s = state[c];
      for (let i = 0; i < 2; i++) {
        beadEls[c].heaven[i].style.transform =
          s.heaven[i] ? `translateY(${HEAVEN_DELTA}px)` : '';
      }
      for (let i = 0; i < 5; i++) {
        beadEls[c].earth[i].style.transform =
          s.earth[i] ? `translateY(${EARTH_DELTA}px)` : '';
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

  function handleBeadTap(t) {
    const c = Number(t.dataset.col);
    const idx = Number(t.dataset.idx);
    const kind = t.dataset.kind;
    const s = state[c];
    const arr = s[kind];
    const nowActive = !arr[idx];

    if (kind === 'heaven') {
      if (nowActive) for (let i = idx; i < 2; i++) arr[i] = true;
      else           for (let i = 0; i <= idx; i++) arr[i] = false;
    } else {
      if (nowActive) for (let i = 0; i <= idx; i++) arr[i] = true;
      else           for (let i = idx; i < 5; i++) arr[i] = false;
    }

    layout();
    onChange(totalCents());
  }

  svg.addEventListener('click', e => {
    const t = e.target.closest('.bead');
    if (!t) return;
    handleBeadTap(t);
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
