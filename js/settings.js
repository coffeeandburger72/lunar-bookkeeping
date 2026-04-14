import { toLunarString } from './lunar.js';

const KEY = 'bookkeeping.settings';

export const DEFAULT_CATEGORIES = [
  '伙食', '買餸', '車費',
  '水電煤', '屋租', '衫褲',
  '交際', '雜項', '煙仔',
];

const DEFAULTS = {
  categories: [...DEFAULT_CATEGORIES],
  dateFormat: 'lunar',
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS, categories: [...DEFAULT_CATEGORIES] };
    const data = JSON.parse(raw);
    const cats = Array.isArray(data.categories) && data.categories.length === DEFAULT_CATEGORIES.length
      ? data.categories.map(v => String(v || '').trim() || DEFAULT_CATEGORIES[0])
      : [...DEFAULT_CATEGORIES];
    const mode = data.dateFormat === 'solar' ? 'solar' : 'lunar';
    return { categories: cats, dateFormat: mode };
  } catch {
    return { ...DEFAULTS, categories: [...DEFAULT_CATEGORIES] };
  }
}

export function saveSettings(s) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function formatDate(date, mode) {
  if (mode === 'solar') {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${y}年${m}月${d}日`;
  }
  return toLunarString(date);
}
