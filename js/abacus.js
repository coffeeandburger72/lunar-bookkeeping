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
