const KEY = 'bookkeeping.records';

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
  return JSON.stringify(loadRecords(), null, 2);
}

export function importJSON(str) {
  const data = JSON.parse(str);
  if (!Array.isArray(data)) throw new Error('唔啱格式');
  for (const r of data) {
    if (typeof r.id !== 'string') throw new Error('唔啱格式');
    if (typeof r.amount !== 'number') throw new Error('唔啱格式');
    if (typeof r.category !== 'string') throw new Error('唔啱格式');
    if (typeof r.createdAt !== 'number') throw new Error('唔啱格式');
    if (!Array.isArray(r.noteStrokes)) throw new Error('唔啱格式');
    if (typeof r.lunarDate !== 'string') throw new Error('唔啱格式');
  }
  writeAll(data);
}

function writeAll(records) {
  localStorage.setItem(KEY, JSON.stringify(records));
}
