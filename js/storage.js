const KEY = 'bookkeeping.records';
const SETTINGS_KEY = 'bookkeeping.settings';

export function loadRecords() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

export function saveRecord(record) {
  const records = loadRecords();
  records.push(record);
  writeAll(records);
}

export function deleteRecord(id) {
  const records = loadRecords().filter(r => r.id !== id);
  writeAll(records);
}

export function clearAll() {
  writeAll([]);
}

export function exportJSON() {
  let settings = null;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) settings = JSON.parse(raw);
  } catch { /* ignore */ }
  return JSON.stringify({
    version: 2,
    records: loadRecords(),
    settings,
  }, null, 2);
}

export function importJSON(str) {
  const data = JSON.parse(str);
  let records;
  let settings = null;
  if (Array.isArray(data)) {
    records = data;
  } else if (data && Array.isArray(data.records)) {
    records = data.records;
    if (data.settings && typeof data.settings === 'object') settings = data.settings;
  } else {
    throw new Error('唔啱格式');
  }
  for (const r of records) {
    if (typeof r.id !== 'string') throw new Error('唔啱格式');
    if (typeof r.amount !== 'number') throw new Error('唔啱格式');
    if (typeof r.category !== 'string') throw new Error('唔啱格式');
    if (typeof r.createdAt !== 'number') throw new Error('唔啱格式');
    if (!Array.isArray(r.noteStrokes)) throw new Error('唔啱格式');
  }
  writeAll(records);
  if (settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function renameCategories(renames) {
  if (!renames.length) return;
  const map = new Map(renames.map(r => [r.from, r.to]));
  const records = loadRecords();
  let changed = false;
  for (const r of records) {
    if (map.has(r.category)) {
      r.category = map.get(r.category);
      changed = true;
    }
  }
  if (changed) writeAll(records);
}

function writeAll(records) {
  localStorage.setItem(KEY, JSON.stringify(records));
}
