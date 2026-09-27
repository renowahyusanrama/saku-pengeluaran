import { test, expect } from '@playwright/test';

const STORAGE_KEY = 'saku.expenses.v1';
const today = '2026-09-23';

function record(id, description, amount, date = today, category = 'food') {
  return { id, description, amount, date, category, createdAt: `${date}T05:00:00.000Z` };
}

async function openApp(page, records = []) {
  await page.clock.install({ time: new Date('2026-09-23T05:00:00.000Z') });
  // Seed only the first page load so reload assertions exercise real persistence.
  await page.addInitScript(({ key, entries }) => {
    if (!sessionStorage.getItem('test-seeded')) {
      localStorage.setItem(key, JSON.stringify(entries));
      sessionStorage.setItem('test-seeded', 'true');
    }
  }, { key: STORAGE_KEY, entries: records });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pengeluaran saya.' })).toBeVisible();
}

async function savedRecords(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
}

async function addExpense(page, amount, description) {
  await page.getByLabel('Nominal', { exact: true }).fill(String(amount));
  await page.getByLabel('Keperluan', { exact: true }).fill(description);
  await page.getByRole('button', { name: 'Simpan pengeluaran', exact: true }).click();
}

async function importBackup(page, entries) {
  await page.getByRole('button', { name: 'Data saya', exact: true }).click();
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Pulihkan cadangan/ }).click();
  const chooser = await fileChooserPromise;
  await chooser.setFiles({ name: 'saku-cadangan.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(entries)) });
  await expect(page.getByRole('dialog')).not.toBeVisible();
}

test('add, reload, edit, delete and undo keep the expense and totals consistent', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText('Belum ada pengeluaran', { exact: true })).toBeVisible();
  await addExpense(page, 25000, 'Makan siang');
  await expect(page.locator('.expense-row')).toHaveCount(1);
  await expect(page.locator('.total-amount')).toHaveText('Rp 25.000');
  await expect(page.locator('#amount')).toHaveValue('');
  await page.reload();
  await expect(page.locator('.expense-row')).toContainText('Makan siang');
  await expect(page.locator('.expense-row')).toContainText('Rp 25.000');

  await page.getByRole('button', { name: 'Ubah Makan siang', exact: true }).click();
  await expect(page.getByLabel('Nominal', { exact: true })).toHaveValue('25.000');
  await page.getByLabel('Nominal', { exact: true }).fill('30000');
  await page.getByLabel('Keperluan', { exact: true }).fill('Belanja dapur');
  await page.getByLabel('Kategori', { exact: true }).selectOption('shopping');
  await page.getByRole('button', { name: 'Simpan perubahan', exact: true }).click();
  await expect(page.locator('.expense-row')).toHaveCount(1);
  await expect(page.locator('.expense-row')).toContainText('Belanja dapur');
  await expect(page.locator('.total-amount')).toHaveText('Rp 30.000');
  expect(await savedRecords(page)).toEqual([expect.objectContaining({ description: 'Belanja dapur', amount: 30000, category: 'shopping' })]);

  await page.getByRole('button', { name: 'Hapus Belanja dapur', exact: true }).click();
  await expect(page.locator('.expense-row')).toHaveCount(0);
  await expect(page.locator('.total-amount')).toHaveText('Rp 0');
  expect(await savedRecords(page)).toHaveLength(0);
  await page.getByRole('button', { name: 'Urungkan', exact: true }).click();
  await expect(page.locator('.expense-row')).toContainText('Belanja dapur');
  await page.reload();
  await expect(page.locator('.total-amount')).toHaveText('Rp 30.000');
  expect(await savedRecords(page)).toHaveLength(1);
});

test('day, week and month histories include the right records and navigate to earlier periods', async ({ page }) => {
  await openApp(page, [
    record('today', 'Kopi hari ini', 10000),
    record('yesterday', 'Ongkos kemarin', 20000, '2026-09-22', 'transport'),
    record('previous-week', 'Makan minggu lalu', 30000, '2026-09-16'),
    record('start-month', 'Tagihan awal bulan', 40000, '2026-09-01', 'bills'),
    record('previous-month', 'Belanja bulan lalu', 50000, '2026-08-29', 'shopping'),
  ]);
  await expect(page.locator('.expense-row')).toHaveCount(2);
  await expect(page.locator('.total-amount')).toHaveText('Rp 30.000');
  await expect(page.getByRole('button', { name: 'Periode berikutnya', exact: true })).toBeDisabled();

  await page.getByRole('button', { name: 'Harian', exact: true }).click();
  await expect(page.locator('.expense-row')).toHaveCount(1);
  await expect(page.locator('.expense-row')).toContainText('Kopi hari ini');
  await expect(page.locator('.total-amount')).toHaveText('Rp 10.000');
  await page.getByRole('button', { name: 'Periode sebelumnya', exact: true }).click();
  await expect(page.locator('.expense-row')).toContainText('Ongkos kemarin');
  await expect(page.locator('.total-amount')).toHaveText('Rp 20.000');
  await page.getByRole('button', { name: 'Periode berikutnya', exact: true }).click();
  await expect(page.locator('.expense-row')).toContainText('Kopi hari ini');

  await page.getByRole('button', { name: 'Mingguan', exact: true }).click();
  await page.getByRole('button', { name: 'Periode sebelumnya', exact: true }).click();
  await expect(page.locator('.expense-row')).toHaveCount(1);
  await expect(page.locator('.expense-row')).toContainText('Makan minggu lalu');
  await expect(page.locator('.total-amount')).toHaveText('Rp 30.000');
  await page.getByRole('button', { name: 'Periode ini', exact: true }).click();

  await page.getByRole('button', { name: 'Bulanan', exact: true }).click();
  await expect(page.locator('.expense-row')).toHaveCount(4);
  await expect(page.locator('.total-amount')).toHaveText('Rp 100.000');
  await expect(page.locator('#period-label')).toHaveText('September 2026');
  await page.getByRole('button', { name: 'Periode sebelumnya', exact: true }).click();
  await expect(page.locator('.expense-row')).toHaveCount(1);
  await expect(page.locator('.expense-row')).toContainText('Belanja bulan lalu');
  await expect(page.locator('.total-amount')).toHaveText('Rp 50.000');
  await expect(page.locator('#period-label')).toHaveText('Agustus 2026');
  await page.getByRole('button', { name: 'Periode ini', exact: true }).click();
  await expect(page.locator('.expense-row')).toHaveCount(4);
});

test('search matches purpose and category without changing period totals', async ({ page }) => {
  await openApp(page, [record('coffee', 'Kopi pagi', 18000), record('bus', 'Bus kantor', 7000, today, 'transport')]);
  await page.getByRole('button', { name: 'Cari pengeluaran', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Cari keperluan atau kategori' });
  await search.fill('KOPI');
  await expect(page.locator('.expense-row')).toHaveCount(1);
  await expect(page.locator('.expense-row')).toContainText('Kopi pagi');
  await expect(page.locator('.total-amount')).toHaveText('Rp 25.000');
  await search.fill('transportasi');
  await expect(page.locator('.expense-row')).toContainText('Bus kantor');
  await search.fill('tidak ada');
  await expect(page.getByText('Catatan tidak ditemukan', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tutup pencarian', exact: true }).click();
  await expect(page.locator('.expense-row')).toHaveCount(2);
});

test('backup contains all records and repeated imports do not duplicate records', async ({ page }) => {
  const initial = record('existing', 'Kopi cadangan', 18000);
  const older = record('older', 'Belanja Agustus', 150000, '2026-08-29', 'shopping');
  await openApp(page, [initial, older]);
  await page.getByRole('button', { name: 'Data saya', exact: true }).click();
  await expect(page.getByText('2 catatan tersimpan', { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Unduh cadangan/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('saku-cadangan-2026-09-23.json');
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  expect(JSON.parse(Buffer.concat(chunks).toString('utf8'))).toEqual([initial, older]);
  await page.getByRole('button', { name: 'Tutup data saya', exact: true }).click();

  const imported = record('imported', 'Ongkos impor', 11000, today, 'transport');
  await importBackup(page, [initial, imported]);
  await expect(page.locator('.expense-row')).toHaveCount(2);
  await expect(page.locator('.total-amount')).toHaveText('Rp 29.000');
  expect(await savedRecords(page)).toHaveLength(3);
  await importBackup(page, [initial, imported]);
  await expect(page.getByRole('status')).toContainText('Semua catatan ini sudah ada.');
  expect(await savedRecords(page)).toHaveLength(3);
  await page.reload();
  await expect(page.locator('.expense-row')).toHaveCount(2);
});

test('invalid form values and malformed imports preserve saved records', async ({ page }) => {
  await openApp(page, [record('existing', 'Catatan aman', 10000)]);
  await page.getByRole('button', { name: 'Simpan pengeluaran', exact: true }).click();
  await expect(page.locator('#form-error')).toContainText('Masukkan nominal');
  await page.getByLabel('Nominal', { exact: true }).fill('1000');
  await page.getByRole('button', { name: 'Simpan pengeluaran', exact: true }).click();
  await expect(page.locator('#form-error')).toHaveText('Isi keperluan pengeluaran terlebih dahulu.');
  await page.getByLabel('Keperluan', { exact: true }).fill('Tanggal besok');
  await page.locator('#date').fill('2026-09-24');
  await page.getByRole('button', { name: 'Simpan pengeluaran', exact: true }).click();
  await expect(page.locator('#form-error')).toHaveText('Tanggal pengeluaran tidak boleh di masa depan.');
  expect(await savedRecords(page)).toHaveLength(1);
  await importBackup(page, [{ bad: 'data' }]);
  await expect(page.getByRole('status')).toContainText('File tidak valid.');
  expect(await savedRecords(page)).toHaveLength(1);
  await expect(page.locator('.expense-row')).toContainText('Catatan aman');
});

test('restoring an older backup repeatedly preserves an existing edited record', async ({ page }) => {
  const backup = record('same-id', 'Makan siang', 20000);
  await openApp(page, [backup]);
  await page.getByRole('button', { name: 'Ubah Makan siang', exact: true }).click();
  await page.getByLabel('Nominal', { exact: true }).fill('30000');
  await page.getByLabel('Keperluan', { exact: true }).fill('Makan siang dikoreksi');
  await page.getByRole('button', { name: 'Simpan perubahan', exact: true }).click();
  await importBackup(page, [backup]);
  await importBackup(page, [backup]);
  await expect(page.locator('.expense-row')).toHaveCount(1);
  await expect(page.locator('.expense-row')).toContainText('Makan siang dikoreksi');
  await expect(page.locator('.total-amount')).toHaveText('Rp 30.000');
  expect(await savedRecords(page)).toEqual([expect.objectContaining({ id: 'same-id', description: 'Makan siang dikoreksi', amount: 30000 })]);
});

test('pasting negative and decimal amounts cannot save a changed nominal', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openApp(page);
  await page.getByLabel('Keperluan', { exact: true }).fill('Nominal tempel');
  const amount = page.getByLabel('Nominal', { exact: true });
  for (const invalid of ['-25000', '12,50', '12.50']) {
    await amount.fill('');
    await amount.focus();
    await page.evaluate(text => navigator.clipboard.writeText(text), invalid);
    await page.keyboard.press('Control+V');
    await page.getByRole('button', { name: 'Simpan pengeluaran', exact: true }).click();
    await expect(page.locator('#form-error')).toBeVisible();
    expect(await savedRecords(page)).toHaveLength(0);
  }
  await amount.fill('');
  await amount.focus();
  await page.evaluate(() => navigator.clipboard.writeText('25.000'));
  await page.keyboard.press('Control+V');
  await page.getByRole('button', { name: 'Simpan pengeluaran', exact: true }).click();
  await expect(page.locator('.expense-row')).toContainText('Rp 25.000');
  expect(await savedRecords(page)).toEqual([expect.objectContaining({ amount: 25000 })]);
});

test('mobile form, history and month chart fit a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openApp(page);
  await addExpense(page, 999999999999, 'Belanja kebutuhan sehari-hari dengan catatan panjang untuk mengecek tampilan layar kecil');
  await page.getByRole('button', { name: 'Bulanan', exact: true }).click();
  await expect(page.locator('.expense-row')).toHaveCount(1);
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);
  expect(overflow.body).toBeLessThanOrEqual(overflow.viewport);
  await page.getByRole('button', { name: /^Ubah Belanja kebutuhan/ }).click();
  await expect(page.getByLabel('Nominal', { exact: true })).toHaveValue('999.999.999.999');
  await page.getByRole('button', { name: 'Batal mengubah', exact: true }).click();
  await page.getByRole('button', { name: 'Data saya', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const dialog = await page.getByRole('dialog').boundingBox();
  expect(dialog.x).toBeGreaterThanOrEqual(0);
  expect(dialog.x + dialog.width).toBeLessThanOrEqual(375);
});
