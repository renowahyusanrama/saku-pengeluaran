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

Data memakai `localStorage` dengan kunci `saku.expenses.v1`, tanpa akun atau server. Catatan terikat pada browser, perangkat, dan alamat website yang digunakan. Menghapus data browser dapat menghapus catatan. Unduh cadangan JSON melalui **Data saya** sebelum pindah browser/perangkat atau membersihkan penyimpanan. Font disertakan dalam hasil build sehingga tidak dimuat dari layanan pihak ketiga.

Halaman dimulai dengan data kosong. Tidak ada transaksi contoh yang dimasukkan ke catatan pribadi.

## Pengujian

```sh
npm test
npm run test:browser
```

Tes unit memeriksa perhitungan tanggal, batas periode, total, grafik, serta validasi. Tes browser memakai Microsoft Edge yang terpasang di Windows; konfigurasi ada di `playwright.config.js`.
