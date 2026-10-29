// Smoke test backend Kode.gs (wwn-kartu-80) dengan stub Google Apps Script.
// Menjalankan Kode.gs ASLI di vm Node dan menguji action utama:
// ping, initDatabase (5 sheet + seed + idempotent + data lama dipertahankan),
// login (benar/salah), getAllData (wajib token, tanpa hash/token),
// saveSiswa (validasi, duplikat NIS/NISN ditolak, nomor kartu otomatis),
// importSiswa (duplikat dilewati, tidak menimpa), deleteSiswa,
// tandaiCetak, savePengaturan (whitelist + desainJson valid),
// uploadFile (tolak bukan gambar, terima gambar), savePengguna/deletePengguna
// (admin saja, tolak hapus diri/admin terakhir, reset password),
// verifyKartu publik (HANYA nama/nomorKartu/namaMadrasah — tanpa alamat/
// tanggal lahir/orang tua), logout, dan initDatabase kedua tanpa token ditolak
// setelah ada pengguna.
// Jalankan: node test/smoke-backend.mjs   (exit 0 = semua lolos)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'backend', 'Kode.gs'), 'utf8');

function makeSheet(name) {
  const grid = [[]];
  return {
    _name: name,
    getLastRow() { return grid.length === 1 && grid[0].length === 0 ? 0 : grid.length; },
    getLastColumn() { return grid[0].length; },
    getRange(r, c, nr = 1, nc = 1) {
      function ensure(rr, cc) {
        while (grid.length < rr) grid.push(new Array(grid[0].length).fill(''));
        for (const row of grid) while (row.length < cc) row.push('');
      }
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = [];
            for (let j = 0; j < nc; j++) { const gr = grid[r - 1 + i]; row.push(gr ? (gr[c - 1 + j] ?? '') : ''); }
            out.push(row);
          }
          return out;
        },
        getValue() { return this.getValues()[0][0]; },
        setValues(vals) { for (let i = 0; i < vals.length; i++) for (let j = 0; j < vals[i].length; j++) { ensure(r + i, c + j); grid[r - 1 + i][c - 1 + j] = vals[i][j]; } },
        setValue(v) { this.setValues([[v]]); },
      };
    },
    appendRow(row) { const h = grid[0].length; const full = row.slice(0, h); while (full.length < h) full.push(''); grid.push(full); },
    deleteRow(n) { grid.splice(n - 1, 1); },
  };
}
const sheets = new Map();
const SpreadsheetApp = {
  getActiveSpreadsheet() {
    return {
      getSheetByName(n) { return sheets.get(n) || null; },
      insertSheet(n) { const s = makeSheet(n); sheets.set(n, s); return s; },
    };
  },
};
const ContentService = { MimeType: { JSON: 'application/json' }, createTextOutput(t) { return { _t: String(t), getContent() { return this._t; }, setMimeType() { return this; } }; } };
const Utilities = {
  DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
  getUuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); }); },
  computeDigest(_a, s) { const h = createHash('sha256').update(String(s), 'utf8').digest(); return Array.from(h, (b) => (b > 127 ? b - 256 : b)); },
  formatDate(d, _tz, fmt) { const p = (n) => String(n).padStart(2, '0'); if (fmt === 'yyyy-MM-dd HH:mm:ss') return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; },
  base64Decode(s) { return Buffer.from(s, 'base64'); },
  newBlob(bytes, mime, name) { return { bytes, mime, name }; },
};
let driveFiles = 0;
const DriveApp = {
  Access: { ANYONE_WITH_LINK: 'ANYONE' }, Permission: { VIEW: 'VIEW' },
  getRootFolder() { return {}; },
  getFoldersByName() { return { hasNext: () => false, next: () => null }; },
  createFolder() { return { setSharing() {}, createFile: (blob) => { driveFiles++; return { getId: () => `file-${driveFiles}`, setSharing() {} }; } }; },
};

const sandbox = { SpreadsheetApp, ContentService, Utilities, DriveApp, console };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

function call(payload) {
  const out = sandbox.doPost({ postData: { contents: JSON.stringify(payload) } });
  return JSON.parse(out.getContent());
}
let lolos = 0, gagal = 0;
function cek(nama, kond, extra = '') {
  if (kond) { lolos++; console.log(`  OK  ${nama}`); }
  else { gagal++; console.log(`  GAGAL ${nama} ${extra}`); }
}

console.log('== ping & init ==');
cek('ping', call({ action: 'ping' }).success);
const init1 = call({ action: 'initDatabase' });
cek('initDatabase pertama', init1.success && init1.data.sheets.length === 5, JSON.stringify(init1));
cek('5 sheet dibuat', [...sheets.keys()].sort().join(',') === 'LogAktivitas,Pengaturan,Pengguna,Siswa,VerifikasiKartu', [...sheets.keys()].join(','));

console.log('== login & auth ==');
const loginSalah = call({ action: 'login', username: 'admin', password: 'salah' });
cek('login salah ditolak', !loginSalah.success);
const loginAdmin = call({ action: 'login', username: 'admin', password: 'admin123' });
cek('login admin berhasil', loginAdmin.success && loginAdmin.data.peran === 'admin', JSON.stringify(loginAdmin));
const token = loginAdmin.data?.token || '';
cek('getAllData tanpa token ditolak', !call({ action: 'getAllData' }).success);
const semua = call({ action: 'getAllData', token });
cek('getAllData dengan token', semua.success && semua.data.pengaturan.namaMadrasah === 'MTs AL ISLAM NGLESES');
cek('getAllData tidak membocorkan hash/token', JSON.stringify(semua).indexOf('PasswordHash') < 0 && !/token/i.test(JSON.stringify(semua.data.pengguna)));

console.log('== siswa ==');
const s1 = call({ action: 'saveSiswa', token, nis: '1001', nisn: '123', nama: 'Ahmad Fauzi', kelas: 'VII', status: 'aktif' });
cek('tambah siswa + nomor kartu otomatis', s1.success && /^KRT-\d{4}-0001$/.test(s1.data.nomorKartu), JSON.stringify(s1));
const dupe = call({ action: 'saveSiswa', token, nis: '1001', nama: 'Duplikat', kelas: 'VIII' });
cek('duplikat NIS ditolak', !dupe.success, JSON.stringify(dupe));
const sKelasSalah = call({ action: 'saveSiswa', token, nis: '1002', nama: 'X', kelas: 'X' });
cek('kelas invalid ditolak', !sKelasSalah.success);
const s2 = call({ action: 'saveSiswa', token, nis: '1002', nama: 'Siti Aminah', kelas: 'VIII', status: 'aktif' });
cek('siswa kedua nomor urut 0002', s2.success && s2.data.nomorKartu.endsWith('-0002'), JSON.stringify(s2));
const edit = call({ action: 'saveSiswa', token, id: s1.data.id, nis: '1001', nama: 'Ahmad Fauzi Edited', kelas: 'VII' });
cek('edit siswa mempertahankan nomor kartu', edit.success && edit.data.nomorKartu === s1.data.nomorKartu, JSON.stringify(edit));
const impor = call({ action: 'importSiswa', token, rows: [
  { nis: '1003', nama: 'Budi', kelas: 'IX' },
  { nis: '1001', nama: 'Duplikat Impor', kelas: 'VII' },
  { nis: '', nama: 'Tanpa NIS', kelas: 'VII' },
] });
cek('impor: 1 ditambah, 2 dilewati, tidak menimpa', impor.success && impor.data.ditambah === 1 && impor.data.dilewati.length === 2, JSON.stringify(impor));
const tandai = call({ action: 'tandaiCetak', token, ids: [s1.data.id] });
cek('tandai cetak', tandai.success && tandai.data.jumlah === 1);
const setelah = call({ action: 'getAllData', token }).data.siswa;
cek('data lama dipertahankan setelah impor+tandai (3 siswa)', setelah.length === 3, `jumlah=${setelah.length}`);
cek('siswa ditandai dicetak + tanggal terbit terisi', setelah.find((x) => x.id === s1.data.id)?.dicetak === 1 && !!setelah.find((x) => x.id === s1.data.id)?.tanggalTerbit);

console.log('== pengaturan, upload, pengguna ==');
cek('desainJson invalid ditolak', !call({ action: 'savePengaturan', token, pengaturan: { desainJson: '{bukan-json' } }).success);
cek('savePengaturan valid', call({ action: 'savePengaturan', token, pengaturan: { tahunPelajaran: '2026/2027', desainJson: '{"tema":"minimalis"}' } }).success);
cek('upload bukan gambar ditolak', !call({ action: 'uploadFile', token, jenis: 'foto', dataBase64: 'aGVsbG8=', mimeType: 'application/pdf' }).success);
const up = call({ action: 'uploadFile', token, jenis: 'foto', dataBase64: Buffer.from('fake-png').toString('base64'), mimeType: 'image/png', namaFile: 'foto-1001' });
cek('upload gambar ke Drive', up.success && up.data.url.includes('drive.google.com'), JSON.stringify(up));
const opBaru = call({ action: 'savePengguna', token, nama: 'Operator Dua', username: 'op2', peran: 'operator', password: 'op123456' });
cek('tambah operator (admin)', opBaru.success);
const loginOp = call({ action: 'login', username: 'op2', password: 'op123456' });
cek('login operator baru', loginOp.success && loginOp.data.peran === 'operator');
const tokenOp = loginOp.data?.token || '';
cek('operator dilarang savePengguna', !call({ action: 'savePengguna', token: tokenOp, nama: 'X', username: 'x1', peran: 'operator', password: 'xxxxxx' }).success);
cek('operator dilarang savePengaturan', !call({ action: 'savePengaturan', token: tokenOp, pengaturan: { tahunPelajaran: '2099' } }).success);
cek('operator boleh saveSiswa', call({ action: 'saveSiswa', token: tokenOp, nis: '1004', nama: 'Operator Siswa', kelas: 'VII' }).success);
cek('hapus diri sendiri ditolak', !call({ action: 'deletePengguna', token, id: call({ action: 'getAllData', token }).data.pengguna.find((u) => u.username === 'admin').id }).success);
cek('reset password operator', call({ action: 'resetPassword', token, id: opBaru.data.id, passwordBaru: 'baru1234' }).success);
cek('login operator dengan sandi baru', call({ action: 'login', username: 'op2', password: 'baru1234' }).success);

console.log('== verifikasi publik ==');
const verif = call({ action: 'verifyKartu', kode: s1.data.nomorKartu });
cek('verifikasi kartu valid', verif.success && verif.data.valid === true && verif.data.nama === 'Ahmad Fauzi Edited');
const verifJson = JSON.stringify(verif.data);
cek('verifikasi TIDAK membocorkan alamat/tanggal lahir/orang tua', !/alamat|tanggalLahir|orangTua|TempatLahir/i.test(verifJson), verifJson);
const verifSalah = call({ action: 'verifyKartu', kode: 'KRT-2099-9999' });
cek('verifikasi nomor tak dikenal = tidak valid', verifSalah.success && verifSalah.data.valid === false);
cek('verifikasi dicatat di sheet VerifikasiKartu', sheets.get('VerifikasiKartu').getLastRow() >= 3);

console.log('== logout & init kedua ==');
cek('logout', call({ action: 'logout', token }).success);
cek('token lama mati setelah logout', !call({ action: 'getAllData', token }).success);
const loginLagi = call({ action: 'login', username: 'admin', password: 'admin123' });
const init2 = call({ action: 'initDatabase' });
cek('initDatabase tanpa token setelah ada pengguna ditolak', !init2.success);
const init2Admin = call({ action: 'initDatabase', token: loginLagi.data.token });
cek('initDatabase kedua oleh admin berhasil & data tidak hilang', init2Admin.success && call({ action: 'getAllData', token: loginLagi.data.token }).data.siswa.length === 4);
const hapus = call({ action: 'deleteSiswa', token: loginLagi.data.token, id: s2.data.id });
cek('hapus siswa', hapus.success);

console.log(`\nHASIL: ${lolos} lolos, ${gagal} gagal`);
process.exit(gagal ? 1 : 0);
