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
