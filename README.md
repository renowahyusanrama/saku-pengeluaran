# Saku

Website sederhana untuk mencatat pengeluaran pribadi dalam rupiah. Dibuat khusus dengan HTML, CSS, dan JavaScript; menggunakan Vite untuk pengembangan dan build.

## Menjalankan

Gunakan Node.js 20.19 atau lebih baru.

```sh
npm install
npm run dev
```

Buka alamat yang muncul di terminal, biasanya http://127.0.0.1:5173.

```sh
npm run build
npm run preview
```

Hasil build ada di `dist/` dan bisa diunggah ke hosting statis. Jalankan lewat server web; membuka `index.html` langsung sebagai file tidak didukung.

## Fitur

- Input nominal rupiah, keperluan, kategori, dan tanggal.
- Ringkasan dan riwayat harian, mingguan, serta bulanan, termasuk periode sebelumnya.
- Minggu dimulai Senin; rata-rata dihitung dari seluruh hari dalam periode yang dipilih.
- Grafik pengeluaran, pencarian catatan, ubah, hapus, dan urungkan penghapusan selama 12 detik.
- Penyimpanan otomatis di browser, termasuk pembaruan antartab.
- Cadangan JSON, pemulihan cadangan, dan ekspor CSV melalui tombol **Data saya**.
- Pemulihan menambahkan catatan yang belum ada. ID yang sudah ada dilewati agar catatan terbaru tidak tertimpa dan impor berulang tidak menggandakan data.
- Tampilan responsif. Form berada paling atas pada ponsel agar cepat dipakai.

## Penyimpanan

Secara default, data memakai `localStorage` dengan kunci `saku.expenses.v1` agar aplikasi tetap bisa dipakai tanpa server. Catatan terikat pada browser, perangkat, dan alamat website yang digunakan. Menghapus data browser dapat menghapus catatan. Unduh cadangan JSON melalui **Data saya** sebelum pindah browser/perangkat atau membersihkan penyimpanan. Font disertakan dalam hasil build sehingga tidak dimuat dari layanan pihak ketiga.

Halaman dimulai dengan data kosong. Tidak ada transaksi contoh yang dimasukkan ke catatan pribadi.

## Sinkronisasi tanpa login

Aplikasi juga mendukung mode cloud berbasis Firebase agar data bisa dibuka dari perangkat lain tanpa form login. Mode ini aktif otomatis saat variabel `VITE_FIREBASE_*` tersedia di file `.env`.

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Saat mode cloud aktif, aplikasi memakai Firebase Anonymous Authentication dan menyimpan data di dokumen `shared/expenses` di Firestore. Ini berarti semua browser yang membuka app dengan konfigurasi Firebase yang sama akan melihat data yang sama.

## Pengujian

```sh
npm test
npm run test:browser
```

Tes unit memeriksa perhitungan tanggal, batas periode, total, grafik, serta validasi. Tes browser memakai Microsoft Edge yang terpasang di Windows; konfigurasi ada di `playwright.config.js`.
