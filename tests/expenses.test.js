import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, localDate, formatMoney, getPeriod, getPeriodExpenses, getChartData, summarize, validateExpense, normalizeExpenses } from '../src/expenses.js';

function expense(overrides = {}) {
  return {
    id: 'one', amount: 20000, description: 'Makan siang', date: '2024-02-29',
    category: 'food', createdAt: '2024-02-29T12:00:00.000Z', ...overrides,
  };
}

test('localDate uses calendar fields and formatMoney formats Indonesian whole rupiah', () => {
  assert.equal(localDate(new Date(2024, 1, 29, 23, 59)), '2024-02-29');
  assert.equal(formatMoney(1234567), 'Rp 1.234.567');
  assert.equal(formatMoney(1250.6), 'Rp 1.251');
  assert.equal(formatMoney(0), 'Rp 0');
});

test('day navigation crosses month, leap-day, and year boundaries', () => {
  assert.equal(getPeriod('day', '2024-03-01').previousAnchor, '2024-02-29');
  assert.equal(getPeriod('day', '2023-03-01').previousAnchor, '2023-02-28');
  assert.equal(getPeriod('day', '2024-12-31').nextAnchor, '2025-01-01');
});

test('weeks begin on Monday, include Sunday, and can cross years', () => {
  const period = getPeriod('week', '2025-01-01');
  assert.equal(period.start, '2024-12-30');
  assert.equal(period.end, '2025-01-05');
  assert.equal(period.previousAnchor, '2024-12-25');
  assert.equal(period.nextAnchor, '2025-01-08');
  assert.equal(getPeriod('week', '2025-01-05').start, '2024-12-30');
  assert.equal(getPeriod('week', '2025-01-06').start, '2025-01-06');
});

test('month lengths and navigation handle leap years and month-end anchors', () => {
  assert.equal(getPeriod('month', '2024-02-01').end, '2024-02-29');
  assert.equal(getPeriod('month', '2023-02-01').end, '2023-02-28');
  assert.equal(getPeriod('month', '2100-02-01').end, '2100-02-28');
  assert.equal(getPeriod('month', '2024-01-31').nextAnchor, '2024-02-01');
  assert.equal(getPeriod('month', '2024-12-31').nextAnchor, '2025-01-01');
  assert.equal(getPeriod('month', '2024-01-01').previousAnchor, '2023-12-01');
  assert.throws(() => getPeriod('month', '2023-02-29'), /Tanggal/);
  assert.throws(() => getPeriod('year', '2024-02-29'), /Jenis/);
});

test('filtering includes both boundary days, sorts latest first, and leaves input untouched', () => {
  const input = [
    expense({ id: 'a', date: '2024-02-26' }),
    expense({ id: 'b', date: '2024-03-03', createdAt: '2024-03-03T10:00:00Z' }),
    expense({ id: 'c', date: '2024-03-03', createdAt: '2024-03-03T11:00:00Z' }),
    expense({ id: 'd', date: '2024-02-25' }),
    expense({ id: 'e', date: '2024-03-04' }),
  ];
  assert.deepEqual(getPeriodExpenses(input, 'week', '2024-02-29').map((item) => item.id), ['c', 'b', 'a']);
  assert.deepEqual(input.map((item) => item.id), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(getPeriodExpenses(input, 'day', '2024-02-26').map((item) => item.id), ['a']);
});

test('charts fill zero days and use category totals for a single day', () => {
  const input = [expense({ amount: 29000 }), expense({ id: 'two', amount: 12000, category: 'transport' })];
  const week = getChartData(input, 'week', '2024-02-29');
  assert.equal(week.length, 7);
  assert.equal(week[0].date, '2024-02-26');
  assert.equal(week[0].amount, 0);
  assert.equal(week[3].amount, 41000);
  assert.equal(week.at(-1).label, 'Min');
  const month = getChartData(input, 'month', '2024-02-29');
  assert.equal(month.length, 29);
  assert.equal(month.at(-1).amount, 41000);
  const day = getChartData(input, 'day', '2024-02-29');
  assert.equal(day.length, CATEGORIES.length);
  assert.equal(day[0].amount, 29000);
  assert.equal(day[1].amount, 12000);
  assert.equal(day[0].date, null);
});

test('summary averages include every day in the period, including days without spending', () => {
  const input = [expense({ amount: 29000 }), expense({ id: 'two', amount: 29000, category: 'transport' })];
  const month = summarize(input, 'month', '2024-02-29');
  assert.equal(month.total, 58000);
  assert.equal(month.count, 2);
  assert.equal(month.average, 2000);
  assert.equal(month.categoryTotals.find((item) => item.id === 'food').amount, 29000);
  assert.equal(summarize([], 'week', '2024-02-29').average, 0);
  assert.equal(summarize(input, 'day', '2024-02-29').average, 58000);
});

test('validation rejects unsafe amounts, impossible dates, missing descriptions, and unknown categories', () => {
  assert.equal(validateExpense(expense()), null);
  for (const amount of [0, -1, 0.5, NaN, Infinity, '20000', Number.MAX_SAFE_INTEGER, 1000000000000]) {
    assert.ok(validateExpense(expense({ amount })), `should reject amount ${amount}`);
  }
  for (const date of ['2023-02-29', '2024-02-30', '2024-13-01', '2024-00-10', '2024-2-01', 'not-a-date', '9999-01-01']) {
    assert.ok(validateExpense(expense({ date })), `should reject date ${date}`);
  }
  assert.ok(validateExpense(expense({ description: '   ' })));
  assert.ok(validateExpense(expense({ description: 'x'.repeat(121) })));
  assert.ok(validateExpense(expense({ category: 'missing' })));
  assert.equal(validateExpense(expense({ date: localDate() })), null);
});

test('import normalization preserves data and rejects malformed or duplicate records', () => {
  const source = expense({ description: ' Makan siang ', ignored: 'extra field' });
  assert.deepEqual(normalizeExpenses([source]), [expense()]);
  assert.equal(source.description, ' Makan siang ');
  assert.deepEqual(normalizeExpenses([]), []);
  assert.throws(() => normalizeExpenses({}), /daftar/);
  assert.throws(() => normalizeExpenses([expense(), expense()]), /duplikat/);
  assert.throws(() => normalizeExpenses([expense({ createdAt: 'bad timestamp' })]), /waktu/);
  assert.throws(() => normalizeExpenses([expense({ amount: -5000 })]), /nominal/);
  assert.throws(() => normalizeExpenses([expense({ id: '' })]), /ID/);
});
