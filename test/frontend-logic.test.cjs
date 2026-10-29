// Uji logika frontend (hasil kompilasi src/utils/*): template Excel,
// baca impor .xlsx (valid/bermasalah), format tanggal/waktu, validasi form.
// Jalankan: node test/frontend-logic.test.cjs  (exit 0 = semua lolos)
const XLSX = require('xlsx');
const { bacaFileImpor, HEADER_SISWA } = require('./dist-test-cjs/utils/excel.cjs');
const { fmtTanggal, fmtWaktu, validasiSiswaForm } = require('./dist-test-cjs/utils/format.cjs');

let lolos = 0, gagal = 0;
function cek(nama, kond, extra) {
  if (kond) { lolos++; console.log('  OK  ' + nama); }
  else { gagal++; console.log('  GAGAL ' + nama + ' ' + (extra || '')); }
}
function fileDariAoa(aoa) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Siswa');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return { arrayBuffer: async () => buf };
}

async function main() {
  cek('header template 11 kolom', HEADER_SISWA.length === 11 && HEADER_SISWA[0] === 'NIS');
  cek('fmtTanggal 2013-05-10 -> 10/05/2013', fmtTanggal('2013-05-10') === '10/05/2013');
  cek('fmtTanggal kosong -> -', fmtTanggal('') === '-');
  cek('fmtWaktu', fmtWaktu('2026-10-29 09:41:45') === '29/10/2026 09:41');
  cek('validasi: NIS kosong ditolak', validasiSiswaForm({ nis: '', nama: 'X', kelas: 'VII', nisn: '', jenisKelamin: 'L', status: 'aktif' }).length > 0);
  cek('validasi: kelas X ditolak', validasiSiswaForm({ nis: '1', nama: 'X', kelas: 'X', nisn: '', jenisKelamin: 'L', status: 'aktif' }).length > 0);
  cek('validasi: data benar lolos', validasiSiswaForm({ nis: '1', nama: 'X', kelas: 'VIII', nisn: '123', jenisKelamin: 'P', status: 'aktif' }).length === 0);

  const rows = await bacaFileImpor(fileDariAoa([
    HEADER_SISWA,
    ['1001', '111', 'Ahmad', 'L', 'Boyolali', '2013-05-10', 'VII', 'Ngleses', 'Budi', 'aktif', '2026/2027'],
    ['1002', 'abc', '', 'X', '', '', 'X', '', '', 'salah', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
  ]));
  cek('baca impor: baris kosong dilewati (2 baris)', rows.length === 2, 'jumlah=' + rows.length);
  cek('baris valid tanpa masalah', rows[0].masalah.length === 0 && rows[0].nama === 'Ahmad' && rows[0].kelas === 'VII');
  cek('baris bermasalah terdeteksi (>=4 masalah)', rows[1].masalah.length >= 4, rows[1].masalah.join('; '));
  cek('ukuran kartu: rasio 85/55 = 1,545', Math.abs(85 / 55 - 1.545) < 0.001);

  console.log('\nHASIL: ' + lolos + ' lolos, ' + gagal + ' gagal');
  process.exit(gagal ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
