import { loadSettings, DEFAULT_CATEGORIES } from './settings.js';

export { DEFAULT_CATEGORIES as CATEGORIES };

export function getCategories() {
  return loadSettings().categories;
}

export function renderCategoryGrid(container, onChange) {
  const grid = document.createElement('div');
  grid.className = 'cat-grid';

  let selected = null;
  const cells = [];

  const names = getCategories();

  for (let i = 0; i < names.length; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cat-cell';

    const label = document.createElement('span');
    label.className = 'cat-label';
    label.textContent = names[i];
    cell.appendChild(label);

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
      const name = label.textContent;
      if (selected === name) {
        selected = null;
        cell.classList.remove('selected');
      } else {
        if (selected) {
          const prev = cells.find(c => c.label.textContent === selected);
          if (prev) prev.cell.classList.remove('selected');
        }
        selected = name;
        cell.classList.add('selected');
      }
      onChange(selected);
    });

    cells.push({ cell, label });
    grid.appendChild(cell);
  }

  container.appendChild(grid);

  return {
    get value() { return selected; },
    clear() {
      if (selected) {
        const prev = cells.find(c => c.label.textContent === selected);
        if (prev) prev.cell.classList.remove('selected');
        selected = null;
      }
    },
    updateNames(newNames) {
      for (let i = 0; i < cells.length; i++) {
        const oldName = cells[i].label.textContent;
        const newName = newNames[i];
        cells[i].label.textContent = newName;
        if (selected === oldName) selected = newName;
      }
    },
  };
}
