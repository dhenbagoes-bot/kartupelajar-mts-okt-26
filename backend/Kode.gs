/**
 * BACKEND — Kartu Pelajar MTs AL ISLAM NGLESES (wwn-kartu-80)
 * Google Apps Script + Google Sheets + Google Drive
 *
 * PENTING (baca dulu, bosku):
 *  1. Buat Google Spreadsheet baru (mis. "Database Kartu Pelajar").
 *  2. Dari DALAM spreadsheet itu: menu Extensions > Apps Script.
 *     JANGAN buat project di script.google.com langsung (standalone),
 *     karena getActiveSpreadsheet() akan null dan semua aksi gagal.
 *  3. HAPUS seluruh isi editor, lalu PASTE seluruh isi file ini. Simpan.
 *  4. Project Settings (roda gigi) > centang "Show appsscript.json
 *     manifest file in editor", lalu GANTI isi appsscript.json dengan
 *     file backend/appsscript.json dari repo ini (izin Drive diperlukan
 *     untuk unggah foto/logo/tanda tangan/stempel).
 *  5. Jalankan fungsi "authorizeDriveAccess" dari editor, setujui izin.
 *  6. Deploy > New deployment > Web app: Execute as Me, Who has access
 *     Anyone. Setiap perubahan kode: Deploy > Manage deployments >
 *     New version (BUKAN New deployment baru).
 *  7. Salin URL /exec ke menu Konfigurasi aplikasi, klik Uji Koneksi,
 *     lalu klik Inisialisasi Database.
 *
 * Sheet yang dibuat (5, sesuai permintaan): Pengaturan, Siswa,
 * Pengguna, LogAktivitas, VerifikasiKartu. Header dibuat HANYA bila
 * sheet kosong; data yang sudah ada TIDAK PERNAH dihapus/di-reset
 * oleh initDatabase.
 *
 * KONTRAK API:
 *  - POST JSON { action, token?, ...params } dengan
 *    Content-Type text/plain (hindari preflight CORS).
 *  - Envelope SELALU: { success, message?, data?, error? }.
 *  - Tanggal di wire: yyyy-MM-dd; datetime: yyyy-MM-dd HH:mm:ss.
 *  - Password TIDAK PERNAH disimpan plaintext: SHA-256(garam+password).
 *    Hash/garam/token TIDAK PERNAH dikirim ke frontend.
 *  - Token sesi kedaluwarsa 7 hari; logout menghapus token.
 *  - Akun bawaan (dibuat HANYA saat sheet Pengguna masih kosong):
 *    admin / admin123 (admin), operator / operator123 (operator).
 *    SEGERA ganti kata sandi setelah inisialisasi! Halaman login
 *    TIDAK menampilkan kredensial ini.
 *  - Verifikasi publik HANYA mengembalikan: status valid, nama siswa,
 *    nomor kartu, nama madrasah. TIDAK PERNAH alamat, tanggal lahir
 *    lengkap, atau data orang tua.
 */

var APP_VERSION = '1.0.0';

var SHEET_PENGATURAN = 'Pengaturan';
var SHEET_SISWA = 'Siswa';
var SHEET_PENGGUNA = 'Pengguna';
var SHEET_LOG = 'LogAktivitas';
var SHEET_VERIF = 'VerifikasiKartu';

var SEMUA_SHEET = [SHEET_PENGATURAN, SHEET_SISWA, SHEET_PENGGUNA,
  SHEET_LOG, SHEET_VERIF];

var HEADERS = {};
HEADERS[SHEET_PENGATURAN] = ['Kunci', 'Nilai'];
HEADERS[SHEET_SISWA] = ['ID', 'NomorKartu', 'NIS', 'NISN', 'Nama',
  'JenisKelamin', 'TempatLahir', 'TanggalLahir', 'Kelas', 'Alamat',
  'OrangTua', 'FotoUrl', 'Status', 'TahunPelajaran', 'Dicetak',
  'TanggalTerbit', 'DibuatPada', 'DiubahPada'];
HEADERS[SHEET_PENGGUNA] = ['ID', 'Nama', 'Username', 'PasswordHash',
  'PasswordSalt', 'Peran', 'Aktif', 'Token', 'TokenKedaluwarsa'];
HEADERS[SHEET_LOG] = ['ID', 'Waktu', 'Username', 'Aksi', 'Detail'];
HEADERS[SHEET_VERIF] = ['ID', 'Waktu', 'NomorKartu', 'Hasil', 'Keterangan'];

var DEFAULT_PENGATURAN = [
  ['namaMadrasah', 'MTs AL ISLAM NGLESES'],
  ['alamatMadrasah', 'Jl. Raya Karangsono-Gundih Pengkol Ngleses, Juwangi, Boyolali 57391'],
  ['teleponMadrasah', ''],
  ['kepalaMadrasah', 'Mustaghfirin, S.E.'],
  ['tahunPelajaran', '2026/2027'],
  ['logoKemenagUrl', ''],
  ['logoMaarifUrl', ''],
  ['ttdUrl', ''],
  ['stempelUrl', ''],
  ['verifikasiPublik', '1'],
  ['qrAktif', '1'],
  ['kartuBelakangAktif', '1'],
  ['desainJson', '']
];

var KUNCI_PENGATURAN = ['namaMadrasah', 'alamatMadrasah',
  'teleponMadrasah', 'kepalaMadrasah', 'tahunPelajaran',
  'logoKemenagUrl', 'logoMaarifUrl', 'ttdUrl', 'stempelUrl',
  'verifikasiPublik', 'qrAktif', 'kartuBelakangAktif', 'desainJson'];

var PERAN_RANK = { operator: 1, admin: 2 };
var TOKEN_MASA_BERLAKU_MS = 7 * 24 * 60 * 60 * 1000;
var KELAS_VALID = ['VII', 'VIII', 'IX'];
var JENIS_UPLOAD = ['foto', 'logoKemenag', 'logoMaarif', 'ttd', 'stempel'];
var FOLDER_DRIVE = 'Kartu Pelajar MTs Al Islam Ngleses';

// ---------------- Util dasar ----------------

function str(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd');
  return String(v);
}
function strCell(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  return String(v);
}
function sekarang() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
}
function hariIni() {
  return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
}
function hashPassword(password, salt) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    String(salt) + String(password), Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var h = (bytes[i] & 0xff).toString(16);
    hex += h.length === 1 ? '0' + h : h;
  }
  return hex;
}
function bacaBaris(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    if (str(vals[i][0]).trim() !== '') out.push(vals[i]);
  }
  return out;
}
function cariBaris(sheet, kolomIdx, nilai) {
  if (!sheet || sheet.getLastRow() < 2) return -1;
  var vals = sheet.getRange(2, kolomIdx + 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (str(vals[i][0]) === String(nilai)) return i + 2;
  }
  return -1;
}
function hapusBarisList(sheet, nomorBaris) {
  nomorBaris.sort(function (a, b) { return b - a; });
  for (var i = 0; i < nomorBaris.length; i++) sheet.deleteRow(nomorBaris[i]);
}
function pastikanSheet(ss, nama) {
  var sheet = ss.getSheetByName(nama);
  if (!sheet) {
    sheet = ss.insertSheet(nama);
    sheet.getRange(1, 1, 1, HEADERS[nama].length).setValues([HEADERS[nama]]);
    return sheet;
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS[nama].length).setValues([HEADERS[nama]]);
  }
  return sheet;
}
function catatLog(ss, username, aksi, detail) {
  try {
    var sheet = pastikanSheet(ss, SHEET_LOG);
    sheet.appendRow([Utilities.getUuid(), sekarang(), username || '-', aksi, detail || '']);
  } catch (e) { /* log tidak boleh menggagalkan aksi utama */ }
}
function bacaPengaturan(ss) {
  var sheet = pastikanSheet(ss, SHEET_PENGATURAN);
  var rows = bacaBaris(sheet);
  var out = {};
  for (var i = 0; i < rows.length; i++) out[str(rows[i][0])] = strCell(rows[i][1]);
  return out;
}
function tulisPengaturan(ss, kunci, nilai) {
  var sheet = pastikanSheet(ss, SHEET_PENGATURAN);
  var rn = cariBaris(sheet, 0, kunci);
  if (rn > 0) sheet.getRange(rn, 2).setValue(nilai);
  else sheet.appendRow([kunci, nilai]);
}

// ---------------- Auth ----------------

function getUserFromToken(ss, token) {
  token = str(token);
  if (!token) return null;
  var sheet = ss.getSheetByName(SHEET_PENGGUNA);
  if (!sheet) return null;
  var rows = bacaBaris(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (str(rows[i][7]) === token) {
      var exp = Number(rows[i][8]) || 0;
      if (exp < Date.now()) return null;
      if (str(rows[i][6]) !== '1') return null;
      return { id: str(rows[i][0]), nama: str(rows[i][1]),
        username: str(rows[i][2]), peran: str(rows[i][5]), rowNum: i + 2 };
    }
  }
  return null;
}
function wajibAuth(ss, payload, peranMin) {
  var user = getUserFromToken(ss, payload && payload.token);
  if (!user) return { ok: false, message: 'Sesi berakhir, silakan login ulang.' };
  if (peranMin && (PERAN_RANK[user.peran] || 0) < (PERAN_RANK[peranMin] || 0)) {
    return { ok: false, message: 'Anda tidak memiliki hak akses untuk aksi ini.' };
  }
  return { ok: true, user: user };
}
function hapusToken(ss, token) {
  try {
    var sheet = ss.getSheetByName(SHEET_PENGGUNA);
    if (!sheet || !token) return;
    var rn = cariBaris(sheet, 7, str(token));
    if (rn > 0) sheet.getRange(rn, 8, 1, 2).setValues([['', '']]);
  } catch (e) {}
}

// ---------------- Pemetaan baris ----------------

function siswaKeObjek(r) {
  return { id: str(r[0]), nomorKartu: str(r[1]), nis: str(r[2]),
    nisn: str(r[3]), nama: str(r[4]), jenisKelamin: str(r[5]),
    tempatLahir: str(r[6]), tanggalLahir: str(r[7]), kelas: str(r[8]),
    alamat: str(r[9]), orangTua: str(r[10]), fotoUrl: str(r[11]),
    status: str(r[12]) || 'aktif', tahunPelajaran: str(r[13]),
    dicetak: str(r[14]) === '1' ? 1 : 0, tanggalTerbit: str(r[15]),
    dibuatPada: strCell(r[16]), diubahPada: strCell(r[17]) };
}
function semuaSiswa(ss) {
  var sheet = ss.getSheetByName(SHEET_SISWA);
  if (!sheet) return [];
  var rows = bacaBaris(sheet);
  var out = [];
  for (var i = 0; i < rows.length; i++) out.push(siswaKeObjek(rows[i]));
  return out;
}
function nomorKartuBerikutnya(ss, tahun) {
  var th = String(tahun || '').substring(0, 4);
  if (!/^\d{4}$/.test(th)) th = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy');
  var maks = 0;
  var list = semuaSiswa(ss);
  for (var i = 0; i < list.length; i++) {
    var m = /^KRT-(\d{4})-(\d+)$/.exec(list[i].nomorKartu || '');
    if (m && m[1] === th) maks = Math.max(maks, parseInt(m[2], 10) || 0);
  }
  var n = String(maks + 1);
  while (n.length < 4) n = '0' + n;
  return 'KRT-' + th + '-' + n;
}
function validasiSiswa(p, daftar, idLama) {
  var errs = [];
  if (!str(p.nis).trim()) errs.push('NIS wajib diisi.');
  if (!str(p.nama).trim()) errs.push('Nama lengkap wajib diisi.');
  if (KELAS_VALID.indexOf(str(p.kelas)) < 0) errs.push('Kelas harus VII, VIII, atau IX.');
  if (p.nisn && !/^\d+$/.test(str(p.nisn).trim())) errs.push('NISN harus berupa angka.');
  if (p.jenisKelamin && ['L', 'P'].indexOf(str(p.jenisKelamin)) < 0) errs.push('Jenis kelamin harus L atau P.');
  if (p.status && ['aktif', 'nonaktif'].indexOf(str(p.status)) < 0) errs.push('Status harus aktif atau nonaktif.');
  for (var i = 0; i < daftar.length; i++) {
    if (idLama && daftar[i].id === idLama) continue;
    if (str(p.nis).trim() && daftar[i].nis === str(p.nis).trim()) errs.push('NIS ' + p.nis + ' sudah dipakai oleh ' + daftar[i].nama + '.');
    if (str(p.nisn).trim() && daftar[i].nisn === str(p.nisn).trim()) errs.push('NISN ' + p.nisn + ' sudah dipakai oleh ' + daftar[i].nama + '.');
  }
  return errs;
}

// ---------------- Aksi ----------------

function actionInitDatabase(ss) {
  for (var i = 0; i < SEMUA_SHEET.length; i++) pastikanSheet(ss, SEMUA_SHEET[i]);
  var pengaturan = bacaPengaturan(ss);
  for (var j = 0; j < DEFAULT_PENGATURAN.length; j++) {
    if (!(DEFAULT_PENGATURAN[j][0] in pengaturan)) {
      tulisPengaturan(ss, DEFAULT_PENGATURAN[j][0], DEFAULT_PENGATURAN[j][1]);
    }
  }
  var sheetUser = ss.getSheetByName(SHEET_PENGGUNA);
  if (bacaBaris(sheetUser).length === 0) {
    var salt1 = Utilities.getUuid(), salt2 = Utilities.getUuid();
    sheetUser.appendRow([Utilities.getUuid(), 'Administrator', 'admin',
      hashPassword('admin123', salt1), salt1, 'admin', '1', '', '']);
    sheetUser.appendRow([Utilities.getUuid(), 'Operator', 'operator',
      hashPassword('operator123', salt2), salt2, 'operator', '1', '', '']);
  }
  return { success: true, message: 'Database berhasil diinisialisasi (data lama dipertahankan).',
    data: { sheets: SEMUA_SHEET } };
}

function actionLogin(ss, p) {
  var sheet = ss.getSheetByName(SHEET_PENGGUNA);
  if (!sheet) return { success: false, message: 'Database belum diinisialisasi. Jalankan Inisialisasi Database dulu.' };
  var rows = bacaBaris(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (str(rows[i][2]) === str(p.username).trim()) {
      if (str(rows[i][6]) !== '1') return { success: false, message: 'Akun tidak aktif. Hubungi admin.' };
      if (hashPassword(p.password || '', str(rows[i][4])) !== str(rows[i][3])) {
        return { success: false, message: 'Username atau kata sandi salah.' };
      }
      var token = Utilities.getUuid();
      var exp = Date.now() + TOKEN_MASA_BERLAKU_MS;
      sheet.getRange(i + 2, 8, 1, 2).setValues([[token, exp]]);
      catatLog(ss, str(rows[i][2]), 'login', 'Login berhasil');
      return { success: true, message: 'Login berhasil.',
        data: { token: token, nama: str(rows[i][1]), username: str(rows[i][2]), peran: str(rows[i][5]) } };
    }
  }
  return { success: false, message: 'Username atau kata sandi salah.' };
}

function actionGetAllData(ss, user) {
  var pengaturan = bacaPengaturan(ss);
  var sheetUser = ss.getSheetByName(SHEET_PENGGUNA);
  var pengguna = [];
  if (sheetUser) {
    var rows = bacaBaris(sheetUser);
    for (var i = 0; i < rows.length; i++) {
      pengguna.push({ id: str(rows[i][0]), nama: str(rows[i][1]),
        username: str(rows[i][2]), peran: str(rows[i][5]),
        aktif: str(rows[i][6]) === '1' ? 1 : 0 });
    }
  }
  var sheetLog = ss.getSheetByName(SHEET_LOG);
  var log = [];
  if (sheetLog) {
    var lrows = bacaBaris(sheetLog);
    for (var k = lrows.length - 1; k >= 0 && log.length < 50; k--) {
      log.push({ id: str(lrows[k][0]), waktu: strCell(lrows[k][1]),
        username: str(lrows[k][2]), aksi: str(lrows[k][3]), detail: str(lrows[k][4]) });
    }
  }
  return { success: true, data: { pengaturan: pengaturan, siswa: semuaSiswa(ss),
    pengguna: pengguna, log: log, version: APP_VERSION } };
}

function actionSavePengaturan(ss, user, p) {
  var obj = p.pengaturan || {};
  for (var i = 0; i < KUNCI_PENGATURAN.length; i++) {
    var k = KUNCI_PENGATURAN[i];
    if (k in obj) {
      if (k === 'desainJson' && str(obj[k]).trim()) {
        try { JSON.parse(str(obj[k])); } catch (e) {
          return { success: false, message: 'Desain tidak valid (bukan JSON).' };
        }
      }
      tulisPengaturan(ss, k, str(obj[k]));
    }
  }
  catatLog(ss, user.username, 'ubah-pengaturan', 'Pengaturan sistem diperbarui');
  return { success: true, message: 'Pengaturan tersimpan.' };
}

function actionSaveSiswa(ss, user, p) {
  var daftar = semuaSiswa(ss);
  var errs = validasiSiswa(p, daftar, p.id ? str(p.id) : '');
  if (errs.length) return { success: false, message: errs.join(' ') };
  var sheet = pastikanSheet(ss, SHEET_SISWA);
  var tahun = str(p.tahunPelajaran).trim() ||
    (bacaPengaturan(ss).tahunPelajaran || '');
  if (p.id) {
    var rn = cariBaris(sheet, 0, str(p.id));
    if (rn < 0) return { success: false, message: 'Siswa tidak ditemukan.' };
    var lama = siswaKeObjek(sheet.getRange(rn, 1, 1, 18).getValues()[0]);
    sheet.getRange(rn, 1, 1, 18).setValues([[lama.id, lama.nomorKartu,
      str(p.nis).trim(), str(p.nisn).trim(), str(p.nama).trim(),
      str(p.jenisKelamin || ''), str(p.tempatLahir || ''),
      str(p.tanggalLahir || ''), str(p.kelas), str(p.alamat || ''),
      str(p.orangTua || ''), str(p.fotoUrl || lama.fotoUrl || ''),
      str(p.status || 'aktif'), tahun, lama.dicetak,
      lama.tanggalTerbit, lama.dibuatPada, sekarang()]]);
    catatLog(ss, user.username, 'edit-siswa', 'Edit siswa ' + p.nama + ' (NIS ' + p.nis + ')');
    return { success: true, message: 'Data siswa diperbarui.', data: { id: lama.id, nomorKartu: lama.nomorKartu } };
  }
  var id = Utilities.getUuid();
  var nomor = nomorKartuBerikutnya(ss, tahun);
  sheet.appendRow([id, nomor, str(p.nis).trim(), str(p.nisn).trim(),
    str(p.nama).trim(), str(p.jenisKelamin || ''), str(p.tempatLahir || ''),
    str(p.tanggalLahir || ''), str(p.kelas), str(p.alamat || ''),
    str(p.orangTua || ''), str(p.fotoUrl || ''), str(p.status || 'aktif'),
    tahun, 0, '', sekarang(), sekarang()]);
  catatLog(ss, user.username, 'tambah-siswa', 'Tambah siswa ' + p.nama + ' (NIS ' + p.nis + ', kartu ' + nomor + ')');
  return { success: true, message: 'Siswa ditambahkan (nomor kartu ' + nomor + ').', data: { id: id, nomorKartu: nomor } };
}

function actionDeleteSiswa(ss, user, p) {
  var sheet = ss.getSheetByName(SHEET_SISWA);
  if (!sheet) return { success: false, message: 'Sheet Siswa tidak ditemukan.' };
  var rn = cariBaris(sheet, 0, str(p.id));
  if (rn < 0) return { success: false, message: 'Siswa tidak ditemukan.' };
  var nama = str(sheet.getRange(rn, 5).getValue());
  sheet.deleteRow(rn);
  catatLog(ss, user.username, 'hapus-siswa', 'Hapus siswa ' + nama);
  return { success: true, message: 'Siswa dihapus.' };
}

function actionImportSiswa(ss, user, p) {
  var rows = p.rows || [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: false, message: 'Tidak ada baris untuk diimpor.' };
  }
  var sheet = pastikanSheet(ss, SHEET_SISWA);
  var daftar = semuaSiswa(ss);
  var tahunDefault = bacaPengaturan(ss).tahunPelajaran || '';
  var ditambah = 0;
  var dilewati = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var errs = validasiSiswa(r, daftar, '');
    if (errs.length) { dilewati.push({ baris: i + 1, nama: str(r.nama), alasan: errs.join(' ') }); continue; }
    var id = Utilities.getUuid();
    var nomor = nomorKartuBerikutnya(ss, str(r.tahunPelajaran || tahunDefault));
    sheet.appendRow([id, nomor, str(r.nis).trim(), str(r.nisn || '').trim(),
      str(r.nama).trim(), str(r.jenisKelamin || ''), str(r.tempatLahir || ''),
      str(r.tanggalLahir || ''), str(r.kelas), str(r.alamat || ''),
      str(r.orangTua || ''), str(r.fotoUrl || ''), str(r.status || 'aktif'),
      str(r.tahunPelajaran || tahunDefault), 0, '', sekarang(), sekarang()]);
    daftar.push({ id: id, nis: str(r.nis).trim(), nisn: str(r.nisn || '').trim(), nama: str(r.nama).trim() });
    ditambah++;
  }
  catatLog(ss, user.username, 'impor-siswa', 'Impor massal: ' + ditambah + ' ditambah, ' + dilewati.length + ' dilewati');
  return { success: true, message: 'Impor selesai: ' + ditambah + ' ditambah, ' + dilewati.length + ' dilewati.',
    data: { ditambah: ditambah, dilewati: dilewati } };
}

function actionUploadFile(ss, user, p) {
  if (JENIS_UPLOAD.indexOf(str(p.jenis)) < 0) {
    return { success: false, message: 'Jenis unggahan tidak dikenal.' };
  }
  if (!p.dataBase64 || !p.mimeType || ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].indexOf(str(p.mimeType)) < 0) {
    return { success: false, message: 'File harus berupa gambar PNG/JPG/WebP.' };
  }
  var base64 = String(p.dataBase64);
  var koma = base64.indexOf(',');
  if (koma >= 0) base64 = base64.substring(koma + 1);
  if (base64.length > 8000000) {
    return { success: false, message: 'Ukuran foto terlalu besar (maksimal sekitar 5 MB).' };
  }
  try {
    var blob = Utilities.newBlob(Utilities.base64Decode(base64), p.mimeType,
      (str(p.namaFile) || p.jenis) + '-' + Date.now());
    var folders = DriveApp.getFoldersByName(FOLDER_DRIVE);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_DRIVE);
    try { folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e1) {}
    var file = folder.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) {}
    var url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    catatLog(ss, user.username, 'unggah-file', 'Unggah ' + p.jenis + ' (file ' + file.getId() + ')');
    return { success: true, message: 'File berhasil diunggah.', data: { url: url, fileId: file.getId() } };
  } catch (e) {
    return { success: false, message: 'Gagal mengunggah ke Drive: ' + e.message +
      ' (pastikan izin Drive sudah diotorisasi lewat authorizeDriveAccess).' };
  }
}

function actionSavePengguna(ss, user, p) {
  var sheet = pastikanSheet(ss, SHEET_PENGGUNA);
  var rows = bacaBaris(sheet);
  if (!str(p.nama).trim() || !str(p.username).trim()) {
    return { success: false, message: 'Nama dan username wajib diisi.' };
  }
  if (['admin', 'operator'].indexOf(str(p.peran)) < 0) {
    return { success: false, message: 'Peran harus admin atau operator.' };
  }
  for (var i = 0; i < rows.length; i++) {
    if (str(rows[i][2]) === str(p.username).trim() && (!p.id || str(rows[i][0]) !== str(p.id))) {
      return { success: false, message: 'Username sudah dipakai.' };
    }
  }
  if (p.id) {
    var rn = cariBaris(sheet, 0, str(p.id));
    if (rn < 0) return { success: false, message: 'Pengguna tidak ditemukan.' };
    var lama = sheet.getRange(rn, 1, 1, 9).getValues()[0];
    var hash = str(lama[3]), salt = str(lama[4]);
    if (str(p.password || '').length > 0) {
      if (str(p.password).length < 6) return { success: false, message: 'Kata sandi minimal 6 karakter.' };
      salt = Utilities.getUuid();
      hash = hashPassword(p.password, salt);
    }
    sheet.getRange(rn, 1, 1, 9).setValues([[str(lama[0]), str(p.nama).trim(),
      str(p.username).trim(), hash, salt, str(p.peran),
      p.aktif === 0 ? '0' : '1', '', '']]);
    catatLog(ss, user.username, 'edit-pengguna', 'Edit pengguna ' + p.username);
    return { success: true, message: 'Pengguna diperbarui.', data: { id: str(lama[0]) } };
  }
  if (!str(p.password) || str(p.password).length < 6) {
    return { success: false, message: 'Kata sandi baru minimal 6 karakter.' };
  }
  var saltBaru = Utilities.getUuid();
  var idBaru = Utilities.getUuid();
  sheet.appendRow([idBaru, str(p.nama).trim(), str(p.username).trim(),
    hashPassword(p.password, saltBaru), saltBaru, str(p.peran),
    p.aktif === 0 ? '0' : '1', '', '']);
  catatLog(ss, user.username, 'tambah-pengguna', 'Tambah pengguna ' + p.username + ' (' + p.peran + ')');
  return { success: true, message: 'Pengguna ditambahkan.', data: { id: idBaru } };
}

function actionDeletePengguna(ss, user, p) {
  var sheet = ss.getSheetByName(SHEET_PENGGUNA);
  if (!sheet) return { success: false, message: 'Sheet Pengguna tidak ditemukan.' };
  var rn = cariBaris(sheet, 0, str(p.id));
  if (rn < 0) return { success: false, message: 'Pengguna tidak ditemukan.' };
  if (str(sheet.getRange(rn, 3).getValue()) === user.username) {
    return { success: false, message: 'Akun sendiri tidak boleh dihapus.' };
  }
  var rows = bacaBaris(sheet);
  var adminAktif = 0;
  for (var i = 0; i < rows.length; i++) {
    if (str(rows[i][5]) === 'admin' && str(rows[i][6]) === '1') adminAktif++;
  }
  if (str(sheet.getRange(rn, 6).getValue()) === 'admin' && adminAktif <= 1) {
    return { success: false, message: 'Admin aktif terakhir tidak boleh dihapus.' };
  }
  var nama = str(sheet.getRange(rn, 3).getValue());
  sheet.deleteRow(rn);
  catatLog(ss, user.username, 'hapus-pengguna', 'Hapus pengguna ' + nama);
  return { success: true, message: 'Pengguna dihapus.' };
}

function actionResetPassword(ss, user, p) {
  var sheet = ss.getSheetByName(SHEET_PENGGUNA);
  if (!sheet) return { success: false, message: 'Sheet Pengguna tidak ditemukan.' };
  if (!str(p.passwordBaru) || str(p.passwordBaru).length < 6) {
    return { success: false, message: 'Kata sandi baru minimal 6 karakter.' };
  }
  var rn = cariBaris(sheet, 0, str(p.id));
  if (rn < 0) return { success: false, message: 'Pengguna tidak ditemukan.' };
  var salt = Utilities.getUuid();
  sheet.getRange(rn, 4, 1, 2).setValues([[hashPassword(p.passwordBaru, salt), salt]]);
  sheet.getRange(rn, 8, 1, 2).setValues([['', '']]);
  catatLog(ss, user.username, 'reset-password', 'Reset kata sandi pengguna ID ' + p.id);
  return { success: true, message: 'Kata sandi berhasil direset (pengguna harus login ulang).' };
}

function actionTandaiCetak(ss, user, p) {
  var ids = p.ids || [];
  if (!Array.isArray(ids) || ids.length === 0) {
    return { success: false, message: 'Tidak ada siswa yang dipilih.' };
  }
  var sheet = ss.getSheetByName(SHEET_SISWA);
  if (!sheet) return { success: false, message: 'Sheet Siswa tidak ditemukan.' };
  var n = 0;
  for (var i = 0; i < ids.length; i++) {
    var rn = cariBaris(sheet, 0, str(ids[i]));
    if (rn > 0) {
      var terbit = str(sheet.getRange(rn, 16).getValue());
      sheet.getRange(rn, 15).setValue(1);
      if (!terbit) sheet.getRange(rn, 16).setValue(hariIni());
      n++;
    }
  }
  catatLog(ss, user.username, 'tandai-cetak', n + ' kartu ditandai sudah dicetak');
  return { success: true, message: n + ' kartu ditandai sudah dicetak.', data: { jumlah: n } };
}

function actionVerifyKartu(ss, p) {
  var kode = str(p.kode || p.nomorKartu || '').trim();
  var pengaturan = bacaPengaturan(ss);
  var namaMadrasah = pengaturan.namaMadrasah || 'MTs AL ISLAM NGLESES';
  var sheetVerif = pastikanSheet(ss, SHEET_VERIF);
  function catat(hasil, ket) {
    try { sheetVerif.appendRow([Utilities.getUuid(), sekarang(), kode, hasil, ket]); } catch (e) {}
  }
  if (pengaturan.verifikasiPublik === '0') {
    catat('DINONAKTIFKAN', 'Verifikasi publik dinonaktifkan admin');
    return { success: true, data: { valid: false, nama: '', nomorKartu: kode,
      namaMadrasah: namaMadrasah, pesan: 'Verifikasi publik sedang dinonaktifkan oleh madrasah.' } };
  }
  if (!kode) return { success: false, message: 'Masukkan nomor kartu.' };
  var daftar = semuaSiswa(ss);
  for (var i = 0; i < daftar.length; i++) {
    if (daftar[i].nomorKartu === kode) {
      if (daftar[i].status !== 'aktif') {
        catat('TIDAK-AKTIF', 'Kartu ditemukan tetapi siswa nonaktif');
        return { success: true, data: { valid: false, nama: daftar[i].nama,
          nomorKartu: daftar[i].nomorKartu, namaMadrasah: namaMadrasah,
          pesan: 'Kartu ditemukan tetapi status siswa nonaktif.' } };
      }
      catat('VALID', 'Verifikasi berhasil');
      // HANYA data minimum yang dikembalikan ke publik.
      return { success: true, data: { valid: true, nama: daftar[i].nama,
        nomorKartu: daftar[i].nomorKartu, namaMadrasah: namaMadrasah,
        pesan: 'Kartu VALID.' } };
    }
  }
  catat('TIDAK-DITEMUKAN', 'Nomor kartu tidak ada di database');
  return { success: true, data: { valid: false, nama: '', nomorKartu: kode,
    namaMadrasah: namaMadrasah, pesan: 'Nomor kartu tidak ditemukan.' } };
}

// ---------------- Router ----------------

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = str(payload.action);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('Spreadsheet tidak terikat. Buat Apps Script dari dalam spreadsheet (Extensions > Apps Script).');

    if (action === 'ping') {
      return jsonOut({ success: true, data: { version: APP_VERSION, waktu: sekarang() } });
    }
    if (action === 'login') return jsonOut(actionLogin(ss, payload));
    if (action === 'verifyKartu') return jsonOut(actionVerifyKartu(ss, payload));
    if (action === 'logout') {
      hapusToken(ss, payload.token);
      return jsonOut({ success: true, message: 'Logout berhasil.' });
    }
    if (action === 'initDatabase') {
      // Boleh tanpa token HANYA saat Pengguna masih kosong (setup pertama).
      // Setelah ada pengguna, wajib admin — ini mencegah reset oleh sembarang orang.
      var sheetUser = ss.getSheetByName(SHEET_PENGGUNA);
      var kosong = !sheetUser || bacaBaris(sheetUser).length === 0;
      if (!kosong) {
        var cek = wajibAuth(ss, payload, 'admin');
        if (!cek.ok) return jsonOut({ success: false, message: cek.message });
      }
      return jsonOut(actionInitDatabase(ss));
    }

    // Semua aksi lain wajib login.
    var auth = wajibAuth(ss, payload, null);
    if (!auth.ok) return jsonOut({ success: false, message: auth.message });
    var user = auth.user;

    if (action === 'getAllData') return jsonOut(actionGetAllData(ss, user));
    if (action === 'savePengaturan') {
      var a1 = wajibAuth(ss, payload, 'admin');
      if (!a1.ok) return jsonOut({ success: false, message: a1.message });
      return jsonOut(actionSavePengaturan(ss, user, payload));
    }
    if (action === 'saveSiswa') return jsonOut(actionSaveSiswa(ss, user, payload));
    if (action === 'deleteSiswa') return jsonOut(actionDeleteSiswa(ss, user, payload));
    if (action === 'importSiswa') return jsonOut(actionImportSiswa(ss, user, payload));
    if (action === 'uploadFile') return jsonOut(actionUploadFile(ss, user, payload));
    if (action === 'tandaiCetak') return jsonOut(actionTandaiCetak(ss, user, payload));
    if (action === 'savePengguna' || action === 'deletePengguna' || action === 'resetPassword') {
      var a2 = wajibAuth(ss, payload, 'admin');
      if (!a2.ok) return jsonOut({ success: false, message: a2.message });
      if (action === 'savePengguna') return jsonOut(actionSavePengguna(ss, user, payload));
      if (action === 'deletePengguna') return jsonOut(actionDeletePengguna(ss, user, payload));
      return jsonOut(actionResetPassword(ss, user, payload));
    }
    if (action === 'backupData') {
      var a3 = wajibAuth(ss, payload, 'admin');
      if (!a3.ok) return jsonOut({ success: false, message: a3.message });
      var semua = actionGetAllData(ss, user);
      return jsonOut({ success: true, data: semua.data });
    }
    return jsonOut({ success: false, message: 'Aksi tidak dikenal: ' + action });
  } catch (err) {
    return jsonOut({ success: false, message: 'Terjadi kesalahan server. Coba lagi.', error: String(err && err.message ? err.message : err) });
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var p = (e && e.parameter) || {};
    if (p.action === 'verify' && p.kode) {
      return jsonOut(actionVerifyKartu(ss, { kode: p.kode }));
    }
    return jsonOut({ success: true, data: { version: APP_VERSION, waktu: sekarang() } });
  } catch (err) {
    return jsonOut({ success: false, message: 'Terjadi kesalahan server.', error: String(err && err.message ? err.message : err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Jalankan sekali dari editor Apps Script untuk memberi izin Drive. */
function authorizeDriveAccess() {
  DriveApp.getRootFolder();
  SpreadsheetApp.getActiveSpreadsheet();
}
