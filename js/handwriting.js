export function renderNotePad(container) {
  const wrap = document.createElement('div');
  wrap.className = 'notepad';

  const tag = document.createElement('span');
  tag.className = 'notepad-label';
  tag.textContent = '備註';
  wrap.appendChild(tag);

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
