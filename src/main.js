import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import './style.css';
import { icon } from './icons.js';
import { CATEGORIES, STORAGE_KEY, localDate, formatMoney, getPeriod, getPeriodExpenses, getChartData, summarize, validateExpense, normalizeExpenses } from './expenses.js';

const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const dateText = (value, options = {}) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', ...options }).format(new Date(`${value}T12:00:00`));
let expenses = [];
let storageProblem = false;
let periodType = 'week';
let anchor = localDate();
let editingId = null;
let search = '';
let toastTimer;
let undoAction = null;
let dialogOpener;

try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) expenses = normalizeExpenses(JSON.parse(stored));
} catch {
  storageProblem = true;
}

$('#app').innerHTML = `
  <a class="skip-link" href="#main">Langsung ke catatan</a>
  <header class="site-header">
    <div class="header-inner">
      <a href="./" class="brand" aria-label="Saku, halaman utama"><span class="brand-mark">${icon('pocket')}</span>saku<span class="brand-dot">.</span></a>
      <span class="brand-caption">Ruang kecil untuk catatan uangmu.</span>
      <button class="button button-quiet data-button" id="open-data">${icon('download')}<span>Data saya</span></button>
    </div>
  </header>
  <main class="container" id="main">
    <section class="page-heading" aria-labelledby="page-title">
      <div><div class="eyebrow">SEDIKIT DICATAT, LEBIH TERATUR</div><h1 id="page-title">Pengeluaran saya<span>.</span></h1><p>Kenali ke mana uangmu pergi, satu catatan setiap hari.</p></div>
      <div class="today-label">${icon('calendar')}<span>${dateText(localDate(), { weekday: 'long', year: 'numeric' })}</span></div>
    </section>
    ${storageProblem ? '<div class="storage-warning" role="alert">Catatan tersimpan belum bisa dibaca. Penyimpanan dinonaktifkan agar data lama tetap aman. Buka Data saya untuk mengunduh salinannya.</div>' : ''}
    <div class="workspace">
      <div class="overview-column">
        <section class="overview panel" aria-label="Ringkasan pengeluaran">
          <div class="period-toolbar">
            <div class="period-tabs" role="group" aria-label="Periode riwayat">
              <button data-period="day" aria-pressed="false">Harian</button>
              <button data-period="week" class="active" aria-pressed="true">Mingguan</button>
              <button data-period="month" aria-pressed="false">Bulanan</button>
            </div>
            <button class="text-button current-period" id="go-today">Periode ini ${icon('arrow')}</button>
          </div>
          <div class="period-navigation">
            <button class="icon-button" id="previous-period" aria-label="Periode sebelumnya">${icon('left')}</button>
            <span id="period-label"></span>
            <button class="icon-button" id="next-period" aria-label="Periode berikutnya">${icon('right')}</button>
          </div>
          <div class="summary" id="summary"></div>
          <div class="chart-section"><div class="chart-heading"><h2 id="chart-title">Pengeluaran per hari</h2><span><i></i> Pengeluaran</span></div><div id="chart"></div></div>
        </section>
        <section class="history panel" aria-labelledby="history-title">
          <div class="history-heading"><div class="section-title"><h2 id="history-title">Riwayat pengeluaran</h2><span class="count-badge" id="history-count">0</span></div><button class="icon-button" id="toggle-search" aria-label="Cari pengeluaran" aria-expanded="false">${icon('search')}</button></div>
          <div class="search-box" id="search-box" hidden>${icon('search')}<input id="search" type="search" placeholder="Cari keperluan atau kategori…" aria-label="Cari keperluan atau kategori" /><button class="icon-button" id="close-search" aria-label="Tutup pencarian">${icon('close')}</button></div>
          <div id="history-list"></div>
          <div class="history-footer" id="history-footer"></div>
        </section>
      </div>
      <aside class="entry-column">
        <section class="entry-panel panel" aria-labelledby="form-title">
          <div class="entry-heading"><span class="entry-icon">${icon('edit')}</span><div><h2 id="form-title">Catat pengeluaran</h2><p>Habis untuk apa hari ini?</p></div></div>
          <form id="expense-form" novalidate>
            <div class="field amount-field"><label for="amount">Nominal</label><div class="amount-input"><span>Rp</span><input id="amount" name="amount" type="text" inputmode="numeric" autocomplete="off" placeholder="0" maxlength="16" aria-describedby="form-error" required /></div></div>
            <div class="field"><label for="description">Keperluan</label><input id="description" name="description" type="text" placeholder="Misalnya, makan siang" maxlength="120" autocomplete="off" required /></div>
            <div class="field"><label for="category">Kategori</label><div class="select-wrap"><span id="selected-category-icon">${icon('food')}</span><select id="category" name="category">${CATEGORIES.map(category => `<option value="${category.id}">${escapeHTML(category.label)}</option>`).join('')}</select>${icon('down')}</div></div>
            <div class="field"><label for="date">Tanggal <button class="text-button" type="button" id="date-today">Hari ini</button></label><input id="date" name="date" type="date" value="${localDate()}" max="${localDate()}" min="1900-01-01" required /></div>
            <p class="form-error" id="form-error" role="alert" hidden></p>
            <button class="button button-primary save-button" id="save-expense" type="submit">${icon('plus')}<span>Simpan pengeluaran</span></button>
            <button class="button cancel-edit" type="button" id="cancel-edit" hidden>Batal mengubah</button>
          </form>
          <div class="save-note">${icon('lock')}<span>Tersimpan di browser ini, hanya untukmu.</span></div>
        </section>
        <div class="little-note"><span class="note-icon">${icon('leaf')}</span><div><h3>Mulai dari yang kecil.</h3><p>Kopi pagi, ongkos jalan, atau belanja bulanan. Setiap catatan membantumu lebih paham.</p></div></div>
      </aside>
    </div>
    <footer class="site-footer"><span><span class="footer-brand">saku.</span> Uangmu, ceritamu.</span><span>Dibuat sederhana. Untuk sehari-hari.</span></footer>
  </main>
  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
  <dialog id="data-dialog" class="data-dialog" aria-labelledby="data-title"><div class="dialog-heading"><span class="entry-icon">${icon('file')}</span><button class="icon-button" id="close-data" aria-label="Tutup data saya">${icon('close')}</button></div><h2 id="data-title">Catatanmu, tetap milikmu.</h2><p>Data disimpan di browser dan perangkat ini. Unduh cadangan sebelum menghapus data browser atau pindah perangkat.</p><div class="data-count" id="data-count"></div><div class="data-actions"><button class="data-action" id="backup">${icon('download')}<span><strong>Unduh cadangan</strong><small>Semua catatan dalam file JSON</small></span>${icon('right')}</button><button class="data-action" id="export-csv">${icon('file')}<span><strong>Ekspor ke CSV</strong><small>Buka semua catatan di spreadsheet</small></span>${icon('right')}</button><button class="data-action" id="import-backup">${icon('upload')}<span><strong>Pulihkan cadangan</strong><small>Tambahkan catatan dari file JSON Saku</small></span>${icon('right')}</button></div><input type="file" id="import-file" accept=".json,application/json" hidden /><p class="dialog-note">Tidak perlu akun. Tidak ada data yang dikirim ke server.</p></dialog>
`;

function showToast(message, action = null) {
  clearTimeout(toastTimer);
  undoAction = action;
  $('#toast').innerHTML = `${icon('check')}<span>${escapeHTML(message)}</span>${action ? '<button id="undo-action">Urungkan</button>' : ''}<button id="close-toast" aria-label="Tutup pemberitahuan">${icon('close')}</button>`;
  $('#toast').hidden = false;
  $('#close-toast').onclick = () => { $('#toast').hidden = true; };
  if (action) $('#undo-action').onclick = () => { const undo = undoAction; undoAction = null; if (undo) undo(); };
  toastTimer = setTimeout(() => { $('#toast').hidden = true; undoAction = null; }, action ? 12000 : 4500);
}

function persist(next) {
  if (storageProblem) {
    showToast('Data lama belum bisa dibaca. Unduh salinannya lewat Data saya.');
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    expenses = next;
    return true;
  } catch {
    showToast('Belum tersimpan. Penyimpanan browser penuh atau tidak tersedia.');
    return false;
  }
}

function render() {
  const period = getPeriod(periodType, anchor);
  const stats = summarize(expenses, periodType, anchor);
  const current = getPeriod(periodType, localDate()).start === period.start;
  const periodName = { day: 'Hari ini', week: 'Minggu ini', month: 'Bulan ini' }[periodType];
  $('#period-label').textContent = period.label;
  $('#next-period').disabled = period.end >= localDate();
  $('#go-today').hidden = current;
  document.querySelectorAll('[data-period]').forEach(button => { const active = button.dataset.period === periodType; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  $('#summary').classList.toggle('large-total', stats.total >= 10000000);
  $('#summary').innerHTML = `<div class="total-block"><div class="summary-label">Total pengeluaran ${current ? `<span class="period-badge">${periodName}</span>` : ''}</div><div class="total-amount"><span>Rp</span> ${new Intl.NumberFormat('id-ID').format(stats.total)}</div></div><div class="summary-details"><div><span>Transaksi</span><strong>${stats.count}<small> catatan</small></strong></div><div><span>Rata-rata / hari</span><strong>${formatMoney(Math.round(stats.average))}</strong></div></div>`;
  renderChart();
  renderHistory();
}

function renderChart() {
  const chartData = getChartData(expenses, periodType, anchor);
  const maximum = Math.max(...chartData.map(item => item.amount), 0);
  const maxScale = maximum > 0 ? Math.ceil(maximum / (10 ** Math.floor(Math.log10(maximum)))) * (10 ** Math.floor(Math.log10(maximum))) : 100000;
  const compact = value => value >= 1000000000 ? `${Number((value / 1000000000).toFixed(1))} m` : value >= 1000000 ? `${Number((value / 1000000).toFixed(1))} jt` : value >= 1000 ? `${Number((value / 1000).toFixed(1))} rb` : String(value);
  $('#chart-title').textContent = periodType === 'day' ? 'Pengeluaran per kategori' : 'Pengeluaran per hari';
  $('#chart').innerHTML = `<div class="chart-area ${periodType === 'month' ? 'month-chart' : ''}"><div class="chart-axis" aria-hidden="true"><span>${compact(maxScale)}</span><span>${compact(maxScale / 2)}</span><span>0</span></div><div class="plot"><div class="gridlines" aria-hidden="true"><i></i><i></i><i></i></div>${!maximum ? '<div class="chart-empty"><span>Ruang untuk cerita pengeluaranmu.</span><small>Grafik terisi saat kamu mulai mencatat.</small></div>' : ''}<div class="chart-bars">${chartData.map((item, index) => `<div class="chart-column ${item.date === localDate() ? 'is-today' : ''}" tabindex="0" aria-label="${escapeHTML(item.fullLabel)}: ${formatMoney(item.amount)}"><div class="bar-space"><div class="bar ${!item.amount ? 'zero' : ''}" style="height:${item.amount ? Math.max((item.amount / maxScale) * 100, 1) : 2}%"></div></div><span class="bar-label">${periodType === 'day' ? icon(CATEGORIES[index].icon) : (periodType === 'month' && index % 5 !== 0 && index !== chartData.length - 1 ? '' : escapeHTML(item.label))}</span><span class="chart-tooltip">${escapeHTML(item.fullLabel)}<strong>${formatMoney(item.amount)}</strong></span></div>`).join('')}</div></div></div>`;
}

function renderHistory() {
  const items = getPeriodExpenses(expenses, periodType, anchor);
  const filtered = items.filter(item => `${item.description} ${CATEGORIES.find(c => c.id === item.category)?.label}`.toLocaleLowerCase('id-ID').includes(search.toLocaleLowerCase('id-ID')));
  $('#history-count').textContent = items.length;
  $('#history-footer').innerHTML = `${icon('lock')}<span>Catatan pribadi. Tersimpan otomatis di perangkat ini.</span>`;
  if (!filtered.length) {
    $('#history-list').innerHTML = `<div class="empty-state"><span class="empty-icon">${icon(search ? 'search' : 'receipt')}</span><h3>${search ? 'Catatan tidak ditemukan' : 'Belum ada pengeluaran'}</h3><p>${search ? 'Coba kata lain atau pilih periode yang berbeda.' : 'Mulai dari pengeluaran kecil hari ini.<br>Catatanmu akan muncul di sini.'}</p>${!search ? `<button class="text-button" id="start-entry">Catat pengeluaran pertama ${icon('arrow')}</button>` : ''}</div>`;
    if ($('#start-entry')) $('#start-entry').onclick = focusForm;
    return;
  }
  const groups = new Map();
  filtered.forEach(item => { if (!groups.has(item.date)) groups.set(item.date, []); groups.get(item.date).push(item); });
  $('#history-list').innerHTML = [...groups].map(([date, rows]) => `<div class="day-group"><div class="day-heading"><span>${date === localDate() ? 'Hari ini' : dateText(date, { weekday: 'long' })}<small>${date === localDate() ? ` · ${dateText(date)}` : ` · ${date.slice(0, 4)}`}</small></span><span>${formatMoney(rows.reduce((sum, row) => sum + row.amount, 0))}</span></div>${rows.map(item => {
    const category = CATEGORIES.find(c => c.id === item.category);
    return `<div class="expense-row"><span class="category-icon category-${category.id}">${icon(category.icon)}</span><div class="expense-info"><strong>${escapeHTML(item.description)}</strong><span>${escapeHTML(category.label)}</span></div><div class="expense-amount">${formatMoney(item.amount)}</div><div class="row-actions"><button class="icon-button" data-edit="${escapeHTML(item.id)}" aria-label="Ubah ${escapeHTML(item.description)}">${icon('edit')}</button><button class="icon-button delete-button" data-delete="${escapeHTML(item.id)}" aria-label="Hapus ${escapeHTML(item.description)}">${icon('trash')}</button></div></div>`;
  }).join('')}</div>`).join('');
}

function focusForm() {
  $('.entry-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#amount').focus({ preventScroll: true });
}

function resetForm() {
  editingId = null;
  $('#expense-form').reset();
  $('#date').value = localDate();
  $('#date').max = localDate();
  $('#form-title').textContent = 'Catat pengeluaran';
  $('#save-expense').innerHTML = `${icon('plus')}<span>Simpan pengeluaran</span>`;
  $('#cancel-edit').hidden = true;
  $('#form-error').hidden = true;
  $('#selected-category-icon').innerHTML = icon(CATEGORIES[0].icon);
}

$('#expense-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test($('#amount').value)) {
    $('#form-error').textContent = 'Masukkan nominal rupiah utuh, misalnya 25000 atau 25.000. Tanpa minus atau desimal.';
    $('#form-error').hidden = false;
    $('#amount').focus();
    return;
  }
  const item = { amount: Number($('#amount').value.replaceAll('.', '')), description: $('#description').value.trim(), date: $('#date').value, category: $('#category').value };
  const error = validateExpense(item);
  if (error) {
    $('#form-error').textContent = error;
    $('#form-error').hidden = false;
    return;
  }
  const old = expenses.find(expense => expense.id === editingId);
  const entry = { ...item, id: old?.id || crypto.randomUUID(), createdAt: old?.createdAt || new Date().toISOString() };
  const next = old ? expenses.map(expense => expense.id === editingId ? entry : expense) : [...expenses, entry];
  if (!persist(next)) return;
  anchor = item.date;
  search = '';
  $('#search').value = '';
  resetForm();
  render();
  showToast(old ? 'Perubahan tersimpan.' : 'Pengeluaran berhasil dicatat.');
  $('#amount').focus({ preventScroll: true });
});

$('#amount').addEventListener('input', event => {
  const input = event.target;
  if (/[^\d.]/.test(input.value) || input.value.replaceAll('.', '').length > 12) {
    $('#form-error').textContent = 'Masukkan nominal rupiah utuh, tanpa minus atau desimal. Maksimal 12 digit.';
    $('#form-error').hidden = false;
    return;
  }
  const previousCursor = input.selectionStart;
  const beforeCursor = input.value.slice(0, previousCursor).replace(/\D/g, '').length;
  const digits = input.value.replaceAll('.', '');
  input.value = digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '';
  let position = 0;
  let count = 0;
  while (position < input.value.length && count < beforeCursor) { if (/\d/.test(input.value[position])) count++; position++; }
  input.setSelectionRange(position, position);
});
$('#amount').addEventListener('paste', event => {
  const pasted = event.clipboardData?.getData('text').trim();
  if (pasted && (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(pasted) || pasted.replaceAll('.', '').length > 12)) {
    event.preventDefault();
    $('#amount').value = pasted;
    $('#form-error').textContent = 'Nominal belum valid. Gunakan rupiah utuh, misalnya 25000 atau 25.000, maksimal 12 digit.';
    $('#form-error').hidden = false;
  }
});
$('#category').addEventListener('change', () => { $('#selected-category-icon').innerHTML = icon(CATEGORIES.find(category => category.id === $('#category').value).icon); });
$('#date-today').onclick = () => { $('#date').value = localDate(); $('#date').max = localDate(); };
$('#cancel-edit').onclick = resetForm;
document.querySelectorAll('[data-period]').forEach(button => { button.onclick = () => { periodType = button.dataset.period; render(); }; });
$('#previous-period').onclick = () => { anchor = getPeriod(periodType, anchor).previousAnchor; render(); };
$('#next-period').onclick = () => { anchor = getPeriod(periodType, anchor).nextAnchor; render(); };
$('#go-today').onclick = () => { anchor = localDate(); render(); };
$('#toggle-search').onclick = () => { const visible = $('#search-box').hidden; $('#search-box').hidden = !visible; $('#toggle-search').setAttribute('aria-expanded', String(visible)); if (visible) $('#search').focus(); else { search = ''; $('#search').value = ''; renderHistory(); } };
$('#close-search').onclick = () => { search = ''; $('#search').value = ''; $('#search-box').hidden = true; $('#toggle-search').setAttribute('aria-expanded', 'false'); renderHistory(); $('#toggle-search').focus(); };
$('#search').oninput = event => { search = event.target.value; renderHistory(); };

$('#history-list').addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit]');
  const deleteButton = event.target.closest('[data-delete]');
  if (editButton) {
    const item = expenses.find(expense => expense.id === editButton.dataset.edit);
    if (!item) return;
    editingId = item.id;
    $('#form-title').textContent = 'Ubah pengeluaran';
    $('#amount').value = new Intl.NumberFormat('id-ID').format(item.amount);
    $('#description').value = item.description;
    $('#category').value = item.category;
    $('#selected-category-icon').innerHTML = icon(CATEGORIES.find(c => c.id === item.category).icon);
    $('#date').value = item.date;
    $('#form-error').hidden = true;
    $('#cancel-edit').hidden = false;
    $('#save-expense').innerHTML = `${icon('check')}<span>Simpan perubahan</span>`;
    focusForm();
  }
  if (deleteButton) {
    const item = expenses.find(expense => expense.id === deleteButton.dataset.delete);
    if (!item || !persist(expenses.filter(expense => expense.id !== item.id))) return;
    if (editingId === item.id) resetForm();
    render();
    showToast('Catatan dihapus.', () => { if (persist([...expenses, item])) { render(); showToast('Catatan dikembalikan.'); } });
  }
});

$('#open-data').onclick = () => {
  dialogOpener = document.activeElement;
  $('#data-count').textContent = `${expenses.length} catatan tersimpan`;
  $('#export-csv').disabled = !expenses.length || storageProblem;
  $('#import-backup').disabled = storageProblem;
  $('#data-dialog').showModal();
};
$('#close-data').onclick = () => $('#data-dialog').close();
$('#data-dialog').addEventListener('close', () => dialogOpener?.focus());
$('#data-dialog').addEventListener('click', event => { if (event.target === $('#data-dialog')) { const box = $('#data-dialog').getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) $('#data-dialog').close(); } });

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('#backup').onclick = () => {
  if (storageProblem) {
    try { download(`saku-salinan-asli-${localDate()}.json`, localStorage.getItem(STORAGE_KEY) || '[]', 'application/json'); }
    catch { showToast('Browser belum mengizinkan akses ke data tersimpan.'); }
    return;
  }
  download(`saku-cadangan-${localDate()}.json`, JSON.stringify(expenses, null, 2), 'application/json');
};
$('#export-csv').onclick = () => {
  const csvCell = value => `"${String(value).replace(/^[=+@\-\t\r]/, match => `'${match}`).replaceAll('"', '""')}"`;
  const lines = [['Tanggal', 'Keperluan', 'Kategori', 'Nominal (Rp)'], ...[...expenses].sort((a, b) => b.date.localeCompare(a.date)).map(item => [item.date, item.description, CATEGORIES.find(c => c.id === item.category).label, item.amount])];
  download(`saku-pengeluaran-${localDate()}.csv`, '\ufeff' + lines.map(row => row.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
};
$('#import-backup').onclick = () => $('#import-file').click();
$('#import-file').onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5000000) throw new Error('File terlalu besar. Maksimal 5 MB.');
    const imported = normalizeExpenses(JSON.parse(await file.text()));
    const merged = [...expenses];
    let added = 0;
    imported.forEach(item => {
      const existing = merged.find(entry => entry.id === item.id);
      if (existing) return;
      merged.push(item);
      added++;
    });
    if (persist(merged)) { render(); $('#data-dialog').close(); showToast(added ? `${added} catatan berhasil dipulihkan.` : 'Semua catatan ini sudah ada.'); }
  } catch (error) {
    $('#data-dialog').close();
    showToast(error.message === 'File terlalu besar. Maksimal 5 MB.' ? error.message : 'File tidak valid. Pilih file cadangan JSON dari Saku.');
  } finally { event.target.value = ''; }
};

window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  try { expenses = event.newValue ? normalizeExpenses(JSON.parse(event.newValue)) : []; storageProblem = false; render(); showToast('Catatan diperbarui dari tab lain.'); }
  catch { storageProblem = true; showToast('Data dari tab lain tidak dapat dibaca. Muat ulang untuk memeriksa.'); }
});
window.addEventListener('focus', () => { $('#date').max = localDate(); });
render();
