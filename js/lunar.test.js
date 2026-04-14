import { toLunarString } from './lunar.js';

const cases = [
  // [year, month, day, expected]
  [2024, 2, 10, '甲辰年正月初一'],   // Lunar New Year 2024
  [2025, 1, 29, '乙巳年正月初一'],   // Lunar New Year 2025
  [2026, 2, 17, '丙午年正月初一'],   // Lunar New Year 2026
  [2024, 5, 15, '甲辰年四月初八'],
  [2024, 12, 31, '甲辰年臘月初一'],
];

let failed = 0;
for (const [y, m, d, expected] of cases) {
  const actual = toLunarString(new Date(y, m - 1, d));
  const pass = actual === expected;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${y}-${m}-${d} -> ${actual} (expected ${expected})`);
  if (!pass) failed++;
}

const fallbackCases = [
  [1899, 12, 31],
  [2101, 2, 1],
];
for (const [y, m, d] of fallbackCases) {
  const actual = toLunarString(new Date(y, m - 1, d));
  const pass = actual.endsWith(' ⚠');
  console.log(`${pass ? 'PASS' : 'FAIL'} ${y}-${m}-${d} -> ${actual} (expected ends with ⚠)`);
  if (!pass) failed++;
}

if (failed > 0) {
  console.log(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log('\nAll lunar tests passed');
