import { Card } from '../components/ui';

const LANGKAH = [
  ['1. Login', 'Login dengan akun admin/operator. Bila lupa sandi, minta admin meresetnya di Manajemen Pengguna. Jangan bagikan kata sandi.'],
  ['2. Tambah Siswa', 'Menu Data Siswa → Tambah Siswa → isi NIS, nama, kelas → pilih foto (pratinjau dulu) → Simpan. Nomor kartu dibuat otomatis (KRT-tahun-urut) dan tidak mengubah NIS.'],
  ['3. Impor Massal', 'Menu Impor Excel → Unduh Template → isi di Excel → pilih file → periksa pratinjau (valid/bermasalah) → Simpan Impor. Duplikat NIS/NISN dilewati, data lama tidak ditimpa.'],
  ['4. Desain Kartu', 'Menu Desain Kartu → pilih tema, warna, posisi logo/foto, orientasi → lihat pratinjau langsung → Simpan. Tombol Kembalikan Desain Default hanya mereset desain.'],
  ['5. Unggah Logo Resmi', 'Menu Konfigurasi Sistem → unggah logo Kemenag, logo Maarif, tanda tangan, dan stempel milik madrasah → Simpan Konfigurasi. Aplikasi tidak membuat logo resmi palsu.'],
  ['6. Cetak Kartu', 'Menu Cetak Kartu → pilih kelas/siswa → atur kolom, baris, jarak, garis potong → Cetak / Ekspor PDF. Di dialog cetak: skala 100%, matikan Headers and footers, pilih Save as PDF untuk PDF. Setelah mencetak, klik Tandai Sudah Dicetak.'],
  ['7. Verifikasi', 'Pindai QR di kartu atau buka menu Verifikasi Kartu dan masukkan nomor kartu. Yang tampil hanya status, nama, nomor kartu, dan nama madrasah.'],
  ['8. Backup', 'Menu Backup → Unduh Backup (JSON) secara berkala dan simpan di tempat aman. Pemulihan hanya menambah data yang belum ada.'],
  ['9. Ganti Kata Sandi', 'Setelah setup pertama, segera ganti kata sandi bawaan di Manajemen Pengguna. Jangan biarkan kata sandi bawaan dipakai lama.'],
];

export default function Panduan() {
  return (
    <div>
      <Card title="Panduan Penggunaan">
        <ol className="space-y-3">
          {LANGKAH.map(([judul, isi]) => (
            <li key={judul} className="text-sm"><b>{judul}.</b> {isi}</li>
          ))}
        </ol>
        <p className="text-sm text-slate-600 mt-4">Ukuran kartu: 8,5 × 5,5 cm (landscape) atau 5,5 × 8,5 cm (portrait). Bila hasil cetak tidak pas, periksa skala printer (harus 100%, bukan Fit to page) dan margin (disarankan 10 mm).</p>
      </Card>
    </div>
  );
}
