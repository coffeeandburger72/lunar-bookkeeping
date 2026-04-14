export function renderNotePad(container) {
  const wrap = document.createElement('div');
  wrap.className = 'notepad';

  const tag = document.createElement('span');
  tag.className = 'notepad-label';
  tag.textContent = '備註';
  wrap.appendChild(tag);

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'notepad-open';
  wrap.appendChild(openBtn);

  const hint = document.createElement('span');
  hint.className = 'notepad-hint';
  hint.textContent = '✎  點此寫備註';
  openBtn.appendChild(hint);

  const preview = document.createElement('canvas');
  preview.className = 'notepad-preview';
  preview.width = 600;
  preview.height = 220;
  openBtn.appendChild(preview);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.textContent = '清';
  clearBtn.className = 'notepad-clear';
  wrap.appendChild(clearBtn);

  container.appendChild(wrap);

  let strokes = [];

  function renderPreview() {
    const has = strokes.length > 0;
    wrap.dataset.has = has ? 'true' : 'false';
    if (has) drawStrokes(preview, strokes);
    else {
      const ctx = preview.getContext('2d');
      ctx.clearRect(0, 0, preview.width, preview.height);
    }
  }

  openBtn.addEventListener('click', () => {
    openDrawSheet(strokes, (newStrokes) => {
      strokes = newStrokes;
      renderPreview();
    });
  });

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    strokes = [];
    renderPreview();
  });

  renderPreview();

  return {
    getStrokes: () => strokes.map(s => s.slice()),
    clear: () => { strokes = []; renderPreview(); },
  };
}

function openDrawSheet(initialStrokes, onDone) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';

  const sheet = document.createElement('div');
  sheet.className = 'draw-sheet';

  const grip = document.createElement('div');
  grip.className = 'sheet-grip';
  sheet.appendChild(grip);

  const header = document.createElement('div');
  header.className = 'draw-sheet-header';
  const title = document.createElement('span');
  title.className = 'draw-sheet-title';
  title.textContent = '備註';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'draw-sheet-clear';
  clearBtn.textContent = '清';
  const doneBtn = document.createElement('button');
  doneBtn.type = 'button';
  doneBtn.className = 'draw-sheet-done';
  doneBtn.textContent = '完成';
  header.appendChild(title);
  header.appendChild(clearBtn);
  header.appendChild(doneBtn);
  sheet.appendChild(header);

  const canvas = document.createElement('canvas');
  canvas.className = 'draw-sheet-canvas';
  const W = 600;
  const H = 600;
  canvas.width = W;
  canvas.height = H;
  sheet.appendChild(canvas);

  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => {
    backdrop.dataset.open = 'true';
    sheet.dataset.open = 'true';
  });

  const ctx = canvas.getContext('2d');
  const strokes = initialStrokes.map(s => s.slice());
  let current = null;
  let startT = 0;

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function pointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const t = Date.now() - startT;
    return [clamp01(x), clamp01(y), t];
  }

  function drawPoint(p, prev) {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = Math.max(2, W / 150);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (prev) ctx.moveTo(prev[0] * W, prev[1] * H);
    else ctx.moveTo(p[0] * W, p[1] * H);
    ctx.lineTo(p[0] * W, p[1] * H);
    ctx.stroke();
  }

  drawStrokes(canvas, strokes);

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

  function close(save) {
    backdrop.dataset.open = 'false';
    sheet.dataset.open = 'false';
    setTimeout(() => {
      document.body.classList.remove('sheet-open');
      backdrop.remove();
      sheet.remove();
      if (save) onDone(strokes);
    }, 280);
  }

  doneBtn.addEventListener('click', () => close(true));
  backdrop.addEventListener('click', () => close(true));
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
