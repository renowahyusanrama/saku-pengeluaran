export const STORAGE_KEY = 'saku.expenses.v1';

export const CATEGORIES = [
  { id: 'food', label: 'Makan & minum', color: '#e6a66d', icon: 'food' },
  { id: 'transport', label: 'Transportasi', color: '#90a7d4', icon: 'transport' },
  { id: 'shopping', label: 'Belanja', color: '#b3a0ca', icon: 'shopping' },
  { id: 'bills', label: 'Tagihan', color: '#d7bd78', icon: 'bills' },
  { id: 'fun', label: 'Hiburan', color: '#dc9ea8', icon: 'fun' },
  { id: 'health', label: 'Kesehatan', color: '#88b8a4', icon: 'health' },
  { id: 'other', label: 'Lainnya', color: '#a6aca5', icon: 'other' },
];

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const shortDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const numberFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export function localDate(date = new Date()) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Local noon avoids changes to the calendar day around daylight-saving transitions.
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function shiftDate(date, amount) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + amount);
  return shifted;
}

function fullDate(date) {
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function weekLabel(start, end) {
  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.getDate()} ${shortMonths[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${shortMonths[end.getMonth()]} ${end.getFullYear()}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${start.getDate()} ${shortMonths[start.getMonth()]} – ${end.getDate()} ${shortMonths[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()}–${end.getDate()} ${shortMonths[end.getMonth()]} ${end.getFullYear()}`;
}

export function formatMoney(value) {
  const amount = Number(value);
  return `Rp ${numberFormatter.format(Number.isFinite(amount) ? amount : 0)}`;
}

export function getPeriod(type, anchor = localDate()) {
  const date = parseDate(anchor);
  if (!date) throw new TypeError('Tanggal periode tidak valid.');
  if (!['day', 'week', 'month'].includes(type)) throw new TypeError('Jenis periode tidak valid.');

  let start = new Date(date);
  let end = new Date(date);
  let previousAnchor;
  let nextAnchor;
  let label;

  if (type === 'day') {
    previousAnchor = localDate(shiftDate(date, -1));
    nextAnchor = localDate(shiftDate(date, 1));
    label = fullDate(date);
  } else if (type === 'week') {
    start = shiftDate(date, -((date.getDay() + 6) % 7));
    end = shiftDate(start, 6);
    previousAnchor = localDate(shiftDate(date, -7));
    nextAnchor = localDate(shiftDate(date, 7));
    label = weekLabel(start, end);
  } else {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
    const previous = new Date(start);
    previous.setMonth(previous.getMonth() - 1);
    const next = new Date(start);
    next.setMonth(next.getMonth() + 1);
    previousAnchor = localDate(previous);
    nextAnchor = localDate(next);
    label = `${months[start.getMonth()]} ${start.getFullYear()}`;
  }

  return { start: localDate(start), end: localDate(end), label, previousAnchor, nextAnchor };
}

function timestamp(value) {
  return typeof value === 'number' ? value : Date.parse(value);
}

export function getPeriodExpenses(expenses, type, anchor = localDate()) {
  const { start, end } = getPeriod(type, anchor);
  return expenses
    .filter((expense) => expense.date >= start && expense.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date) || (timestamp(b.createdAt) || 0) - (timestamp(a.createdAt) || 0));
}

export function getChartData(expenses, type, anchor = localDate()) {
  const { start, end } = getPeriod(type, anchor);
  const selected = getPeriodExpenses(expenses, type, anchor);
  if (type === 'day') {
    return CATEGORIES.map((category) => ({
      label: category.label,
      fullLabel: category.label,
      amount: selected.reduce((sum, expense) => sum + (expense.category === category.id ? expense.amount : 0), 0),
      date: null,
    }));
  }
  const totals = new Map();
  for (const expense of selected) totals.set(expense.date, (totals.get(expense.date) || 0) + expense.amount);
  const result = [];
  for (let date = parseDate(start); localDate(date) <= end; date = shiftDate(date, 1)) {
    const key = localDate(date);
    result.push({
      label: type === 'week' ? shortDays[date.getDay()] : String(date.getDate()),
      fullLabel: fullDate(date),
      amount: totals.get(key) || 0,
      date: key,
    });
  }
  return result;
}

export function summarize(expenses, type, anchor = localDate()) {
  const selected = getPeriodExpenses(expenses, type, anchor);
  const { end } = getPeriod(type, anchor);
  const total = selected.reduce((sum, expense) => sum + expense.amount, 0);
  const dayCount = type === 'day' ? 1 : type === 'week' ? 7 : parseDate(end).getDate();
  const categoryTotals = CATEGORIES.map((category) => {
    const categoryExpenses = selected.filter((expense) => expense.category === category.id);
    return {
      ...category,
      amount: categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      count: categoryExpenses.length,
    };
  });
  return { total, count: selected.length, average: total / dayCount, categoryTotals };
}

export function validateExpense(expense) {
  if (!expense || typeof expense !== 'object') return 'Data pengeluaran tidak valid.';
  const { amount, description, date, category } = expense;
  if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0 || amount > 999999999999) {
    return 'Masukkan nominal antara Rp 1 dan Rp 999.999.999.999, tanpa desimal.';
  }
  if (typeof description !== 'string' || !description.trim()) return 'Isi keperluan pengeluaran terlebih dahulu.';
  if (description.trim().length > 120) return 'Keperluan maksimal 120 karakter.';
  if (!parseDate(date)) return 'Pilih tanggal yang valid.';
  if (date > localDate()) return 'Tanggal pengeluaran tidak boleh di masa depan.';
  if (!CATEGORIES.some((item) => item.id === category)) return 'Pilih kategori pengeluaran.';
  return null;
}

export function normalizeExpenses(input) {
  if (!Array.isArray(input)) throw new TypeError('File harus berisi daftar pengeluaran.');
  const seenIds = new Set();
  return input.map((expense, index) => {
    const error = validateExpense(expense);
    if (error) throw new TypeError(`Pengeluaran ke-${index + 1}: ${error}`);
    if (typeof expense.id !== 'string' || !expense.id.trim() || expense.id.length > 100 || seenIds.has(expense.id)) {
      throw new TypeError(`Pengeluaran ke-${index + 1}: ID tidak valid atau duplikat.`);
    }
    const createdAt = expense.createdAt;
    if (!['string', 'number'].includes(typeof createdAt) || !Number.isFinite(timestamp(createdAt)) || !Number.isFinite(new Date(timestamp(createdAt)).getTime())) {
      throw new TypeError(`Pengeluaran ke-${index + 1}: waktu pencatatan tidak valid.`);
    }
    seenIds.add(expense.id);
    return {
      id: expense.id,
      amount: expense.amount,
      description: expense.description.trim(),
      date: expense.date,
      category: expense.category,
      createdAt,
    };
  });
}
