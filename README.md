# Kartu Pelajar MTs AL ISLAM NGLESES — wwn-kartu-80 v1.0.1

> **v1.0.1 (29 Okt 2026):** perbaikan kecil di halaman Konfigurasi —
> tombol Uji Koneksi & Inisialisasi Database kini memakai URL dari
> `schools.json` bila kolom URL kosong, jadi tidak lagi gagal di
> perangkat baru padahal login sudah tersambung otomatis. Backend tidak
> berubah (tetap v1.0.0).

Aplikasi web untuk membuat, mengelola, dan mencetak Kartu Pelajar
MTs AL ISLAM NGLESES, Juwangi, Boyolali. Data tersimpan di
Google Sheets, foto/logo/tanda tangan/stempel tersimpan di Google Drive,
frontend di-host di Vercel. **Bukan Firebase, bukan localStorage sebagai
database.** Yang tersimpan di perangkat hanya URL backend dan token sesi
login (7 hari) — data siswa selalu dibaca dari Sheets lewat backend.

> **Catatan teknologi (jujur):** Prompt awal menyebut HTML + Bootstrap 5.
> Versi ini dibangun dengan pola yang sama seperti 7 aplikasi madrasah
> sebelumnya (React 19 + Vite + TypeScript + Tailwind), karena itulah
> pola yang sudah terbukti jalan di GitHub web upload + Vercel Anda.
> Hasil akhirnya tetap situs web HTML/CSS/JS di Vercel, dan semua langkah
> upload/deploy di bawah sama persis seperti aplikasi sebelumnya.
> Bootstrap 5 / Font Awesome / SweetAlert2 tidak dipakai di v1.0.0 —
> ikon memakai teks/tombol bawaan, notifikasi memakai kotak pesan di
> dalam aplikasi.

## 1. Arsitektur

```
Browser (Vercel, React + Vite)
   │  POST JSON { action, token?, ... }  Content-Type: text/plain
   ▼
Google Apps Script Web App (/exec) ──► Google Spreadsheet (database)
   │                                     Google Drive (foto/logo/ttd/stempel)
   └─► Halaman verifikasi publik (hash-route #/verifikasi?kode=...)
        QR kartu mengarah ke halaman ini di domain Vercel Anda.
```

- Satu madrasah = satu spreadsheet + satu project Apps Script sendiri.
  **Jangan** memakai backend aplikasi lain (jurnal/bel/CBT) untuk aplikasi
  ini — aksi-aksinya berbeda dan login akan gagal.
- Kartu dirender HTML/CSS murni (bukan screenshot) dengan ukuran persis
  `85mm × 55mm` (landscape) atau `55mm × 85mm` (portrait), jadi tajam
  saat dicetak dan diekspor ke PDF lewat dialog cetak browser.

## 2. Struktur Google Spreadsheet (5 sheet)

Header dibuat **hanya bila sheet masih kosong**. `initDatabase` TIDAK
PERNAH menghapus, mereset, atau menduplikasi data yang sudah ada.

| Sheet | Header kolom |
|---|---|
| Pengaturan | Kunci, Nilai |
| Siswa | ID, NomorKartu, NIS, NISN, Nama, JenisKelamin, TempatLahir, TanggalLahir, Kelas, Alamat, OrangTua, FotoUrl, Status, TahunPelajaran, Dicetak, TanggalTerbit, DibuatPada, DiubahPada |
| Pengguna | ID, Nama, Username, PasswordHash, PasswordSalt, Peran, Aktif, Token, TokenKedaluwarsa |
| LogAktivitas | ID, Waktu, Username, Aksi, Detail |
| VerifikasiKartu | ID, Waktu, NomorKartu, Hasil, Keterangan |

Isi awal Pengaturan (bisa diubah di menu Konfigurasi Sistem, tanpa ubah
kode): nama `MTs AL ISLAM NGLESES`, alamat
`Jl. Raya Karangsono-Gundih Pengkol Ngleses, Juwangi, Boyolali 57391`,
kepala madrasah `Mustaghfirin, S.E.`, tahun pelajaran `2026/2027`,
verifikasi publik aktif, QR aktif, bagian belakang aktif.

Nomor kartu dibuat otomatis berurutan per tahun (`KRT-2026-0001`,
`KRT-2026-0002`, ...) dan **tidak mengubah NIS siswa**.

## 3. Fitur v1.0.0

- **Login 2 peran** (pemeriksaan hak akses di backend, bukan hanya
  menyembunyikan menu): Admin (semua menu) dan Operator (data siswa +
  cetak). Kata sandi disimpan sebagai SHA-256 + garam, tidak pernah
  plaintext, tidak pernah dikirim ke frontend. Halaman login sengaja
  **tidak menampilkan kredensial apa pun**.
- **Dashboard:** siswa aktif, per kelas VII/VIII/IX, kartu sudah/belum
  dicetak, aktivitas terbaru, tombol cepat.
- **Data Siswa:** tambah/edit/hapus (konfirmasi), cari nama/NIS/NISN/
  kelas, filter kelas & status, foto 3:4 dengan pratinjau sebelum
  simpan, deteksi duplikat NIS/NISN (depan + backend).
- **Impor Excel:** unduh template `.xlsx`, isi, unggah → pratinjau +
  jumlah valid/bermasalah → konfirmasi → simpan. Duplikat dilewati,
  data lama **tidak dihapus/ditimpa**. Ekspor data ke Excel juga ada.
- **Desain Kartu:** 3 tema (emerald-gold, hijau-putih, minimalis),
  warna/gradasi, posisi logo & foto, ukuran teks, ornamen, bingkai,
  QR on/off, orientasi landscape/portrait, pratinjau langsung.
  Tombol Kembalikan Desain Default hanya mereset desain.
- **Cetak Kartu:** satu kartu, pilihan siswa, satu kelas, semua aktif,
  depan/belakang, banyak kartu per lembar A4 (kolom × baris), jarak
  antar-kartu, garis potong opsional, pratinjau, ekspor PDF lewat
  dialog cetak browser, dan tombol Tandai Sudah Dicetak (mengisi
  tanggal terbit otomatis).
- **QR & Verifikasi:** QR unik per kartu mengarah ke halaman verifikasi
  di domain aplikasi. Yang ditampilkan ke publik HANYA: status valid,
  nama, nomor kartu, nama madrasah. Alamat, tanggal lahir lengkap, dan
  data orang tua **tidak pernah** ditampilkan. Verifikasi publik bisa
  dinonaktifkan dari Konfigurasi Sistem. Setiap cek dicatat di sheet
  VerifikasiKartu.
- **Konfigurasi Sistem:** nama, alamat, kontak, kepala madrasah, tahun
  pelajaran, toggle verifikasi/QR/bagian belakang, unggah logo resmi,
  tanda tangan, dan stempel. **Aplikasi tidak membuat logo resmi palsu:**
  bila logo belum diunggah, kartu menampilkan kotak placeholder
  bertuliskan KEMENAG/MAARIF, bukan tiruan logo resmi.
- **Manajemen Pengguna (admin):** tambah/edit/hapus/reset sandi,
  nonaktifkan akun, larangan hapus diri sendiri & admin aktif terakhir.
- **Backup & Pemulihan:** unduh backup JSON lengkap + ekspor Excel.
  Pemulihan hanya menambah siswa yang belum ada (aman, tidak menimpa).
- **Panduan** di dalam aplikasi + file ini.
- **Konfigurasi Backend** bisa dibuka tanpa login dan tanpa data, supaya
  Anda tidak terjebak layar error bila URL backend salah.

## 4. File dalam proyek

```
wwn-kartu-80/
├── index.html, vite.config.ts, tsconfig.json, vercel.json
├── package.json, package-lock.json   (dependensi: react, vite,
│                                      tailwindcss, lucide-react, xlsx)
├── public/schools.json               (apiUrl KOSONG sampai backend dibuat)
├── src/
│   ├── App.tsx                       (routing, sidebar, resolusi backend)
│   ├── main.tsx, index.css           (termasuk CSS @media print)
│   ├── types.ts                      (tipe + desain default)
│   ├── services/api.ts               (klien Apps Script)
│   ├── components/Kartu.tsx          (kartu depan/belakang 85×55 mm)
│   ├── components/ui.tsx
│   ├── utils/format.ts, utils/excel.ts
│   └── pages/                        (Dashboard, DataSiswa, Impor,
│       DesainKartu, Cetak, Verifikasi, KonfigurasiSistem,
│       ManajemenPengguna, Backup, Panduan, Login, Konfigurasi)
├── backend/
│   ├── Kode.gs                       (seluruh backend, 667 baris)
│   └── appsscript.json               (scope Sheets + Drive)
└── test/
    ├── smoke-backend.mjs             (38 uji backend, stub GAS)
    ├── frontend-logic.test.cjs       (11 uji logika frontend)
    └── dist-test-cjs/                (hasil kompilasi util untuk uji)
```

## 5. Langkah 1 — Buat Spreadsheet & Apps Script (PENTING!)

1. Buka https://sheets.google.com → **Blank spreadsheet** → beri nama
   misalnya `Database Kartu Pelajar`.
2. **Dari dalam spreadsheet itu**, klik menu **Extensions → Apps Script**.
   ⚠️ JANGAN buat project dari https://script.google.com langsung.
   Project standalone membuat `getActiveSpreadsheet()` bernilai null dan
   semua aksi gagal dengan error `Cannot read properties of null`.
3. Di editor Apps Script, **hapus seluruh isi editor** (Ctrl+A, Delete).
4. Buka file `backend/Kode.gs` dari arsip proyek → salin **seluruh**
   isinya → tempel ke editor → **Save** (Ctrl+S).
5. Klik ikon roda gigi **Project Settings** → centang
   **"Show appsscript.json manifest file in editor"**.
6. Di daftar file editor akan muncul `appsscript.json` → buka → hapus
   isinya → tempel seluruh isi `backend/appsscript.json` → Save.
   (Ini memberi izin Drive, kalau tidak upload foto akan ditolak.)
7. Di editor, pilih fungsi **`authorizeDriveAccess`** di dropdown atas →
   klik **Run** → pilih akun Google Anda → **Allow** (setujui izin).
   Bila muncul "This app isn't verified", klik Advanced → Go to
   (nama project) → Allow. Ini project Anda sendiri, aman.
8. Klik **Deploy → New deployment** → ikon roda gigi → pilih
   **Web app** → isi:
   - Execute as: **Me**
   - Who has access: **Anyone**
   → **Deploy** → **Authorize access** bila diminta → salin URL yang
   berakhiran `/exec`.

> Setiap ada perubahan kode backend: **Deploy → Manage deployments →
> ikon pensil → New version** (bukan New deployment baru). Bila versi
> tidak berubah, kode lama yang tetap jalan.

## 6. Langkah 2 — Hubungkan aplikasi

1. Buka aplikasi web (setelah deploy Vercel, langkah 3) → di halaman
   login klik **"Atur URL Backend (Konfigurasi)"**.
2. Tempel URL `/exec` dari langkah 1 → **Simpan URL** → **Uji Koneksi**
   (harus muncul "Terhubung!").
3. Klik **Inisialisasi Database**. Ini membuat 5 sheet + pengaturan awal
   + akun bawaan **hanya bila sheet Pengguna masih kosong**.
4. Kembali ke login dan masuk dengan akun bawaan di bawah, lalu
   **SEGERA ganti kata sandinya** di menu Manajemen Pengguna:

   - Admin: username `admin`, kata sandi `admin123`
   - Operator: username `operator`, kata sandi `operator123`

   ⚠️ Kredensial ini HANYA ada di README ini, tidak ditampilkan di
   halaman login. Jangan biarkan kata sandi bawaan dipakai lama.

## 7. Langkah 3 — Upload ke GitHub (web, tanpa git CLI)

1. Di https://github.com, buat repository baru bernama `wwn-kartu-80`
   (Public, tanpa README bawaan).
2. Klik **Add file → Upload files** → drag-and-drop **seluruh isi**
   folder proyek: folder `src`, `public`, `backend`, `test`, plus file
   `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`,
   `tsconfig.json`, `vercel.json`, `.gitignore`, `README.md`.
   ⚠️ Jangan sampai folder tertinggal (dulu aplikasi jurnal gagal deploy
   karena folder `src` tertinggal). **Jangan** upload `node_modules`
   dan `dist` — Vercel yang akan membangunnya.
3. Commit dengan pesan misalnya `v1.0.0 kartu pelajar`.
4. Buka repository di browser dan periksa pohon foldernya lengkap
   sebelum lanjut.

## 8. Langkah 4 — Deploy ke Vercel

1. Di https://vercel.com → **Add New → Project** → Import repository
   `wwn-kartu-80` → **Deploy** (tidak perlu ubah setting apa pun).
2. Buka URL Vercel yang diberikan (mis. `https://wwn-kartu-80.vercel.app`).
3. Lakukan Langkah 2 (hubungkan backend) di URL tersebut.
4. Bila nanti ada perubahan (mis. `public/schools.json` diisi URL
   backend agar langsung tersambung di perangkat mana pun): upload file
   yang berubah ke GitHub → Vercel redeploy otomatis.

## 9. Cara pakai sehari-hari

1. **Tambah siswa:** Data Siswa → Tambah Siswa → isi NIS, nama, kelas →
   pilih foto (lihat pratinjau) → Simpan. Nomor kartu otomatis.
2. **Impor massal:** Impor Excel → Unduh Template → isi → pilih file →
   periksa pratinjau → Simpan Impor.
3. **Logo resmi:** Konfigurasi Sistem → unggah logo Kemenag, logo
   Maarif, tanda tangan, stempel → Simpan Konfigurasi.
4. **Desain:** Desain Kartu → ubah tema/warna/posisi → lihat pratinjau →
   Simpan Desain.
5. **Cetak:** Cetak Kartu → pilih siswa/kelas → atur kolom/baris/jarak →
   Cetak / Ekspor PDF. Di dialog cetak browser: **skala 100%**
   (bukan Fit to page), **matikan Headers and footers**, margin 10 mm,
   pilih **Save as PDF** untuk PDF. Setelah cetak, klik
   **Tandai Sudah Dicetak**.
6. **Verifikasi:** pindai QR di kartu, atau menu Verifikasi Kartu.

## 10. Pengujian yang sudah dilakukan (sebelum diserahkan)

- `tsc --noEmit`: **0 error**.
- `vite build`: **sukses**.
- `node --check` pada `backend/Kode.gs`: **lolos**.
- `node test/smoke-backend.mjs`: **38/38 lolos** — login, hak akses
  admin/operator, CRUD siswa, duplikat, impor, cetak, pengaturan,
  upload, pengguna, verifikasi publik (tanpa data sensitif), logout,
  init idempotent.
- `node test/frontend-logic.test.cjs`: **11/11 lolos** — template Excel,
  baca impor, format tanggal, validasi, rasio kartu 85/55 = 1,545.
- Uji yang **belum bisa dilakukan di sini** (menunggu backend & situs
  live Anda): Uji Koneksi + Inisialisasi di URL `/exec` asli, upload
  foto sungguhan ke Drive, cetak fisik 8,5 × 5,5 cm dan ukur dengan
  penggaris, serta pindai QR dari kartu cetak. Lakukan 4 uji ini setelah
  deploy dan laporkan bila ada yang gagal.

## 11. Pemeliharaan & batasan yang perlu diketahui

- **QR memakai layanan gambar qrserver.com** (online). QR digambar saat
  kartu ditampilkan/dicetak dari domain Vercel Anda, sehingga QR
  mengarah ke domain itu. Bila sedang offline, gambar QR tidak muncul
  tetapi nomor kartu tetap tercetak. Versi berikutnya bisa memakai
  pustaka QR offline bila diperlukan.
- **Foto/logo dari Drive** memakai link `uc?export=view`. Bila suatu
  hari gambar tidak tampil di kartu cetak, pastikan file Drive-nya
  berizin "Anyone with the link — Viewer" (backend sudah mengaturnya
  saat upload).
- **Jangan edit sheet Siswa secara manual** dengan mengubah urutan
  kolom — backend membaca kolom berdasarkan posisi header di atas.
  Menambah baris manual boleh, selama urutannya sama.
- **Backup berkala:** menu Backup → Unduh Backup (JSON) → simpan di
  tempat aman. Sheet Google sendiri juga punya riwayat versi
  (File → Version history) bila terjadi salah hapus.
- **Keamanan:** jangan pernah menaruh kata sandi/API key di kode
  frontend atau di repo GitHub. Kredensial login hanya hidup di sheet
  Pengguna dalam bentuk hash.

## 12. Yang belum ada di v1.0.0 (jujur)

- Cetak langsung ke printer kartu PVC (aplikasi memakai printer &
  kertas biasa + dialog cetak browser; ukuran dijaga lewat CSS mm).
- QR offline tanpa internet, kamera pindai QR di dalam aplikasi,
  notifikasi WhatsApp, dan impor foto massal via ZIP. Bila dibutuhkan,
  itu bisa menjadi v1.1.0.
