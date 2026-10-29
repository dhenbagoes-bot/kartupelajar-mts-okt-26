"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEADER_SISWA = void 0;
exports.unduhTemplateSiswa = unduhTemplateSiswa;
exports.bacaFileImpor = bacaFileImpor;
exports.eksporSiswaExcel = eksporSiswaExcel;
const XLSX = __importStar(require("xlsx"));
/** Header template Excel — urutan ini yang dibaca saat impor. */
exports.HEADER_SISWA = ['NIS', 'NISN', 'Nama Lengkap', 'Jenis Kelamin (L/P)', 'Tempat Lahir', 'Tanggal Lahir (yyyy-mm-dd)', 'Kelas (VII/VIII/IX)', 'Alamat', 'Nama Orang Tua/Wali', 'Status (aktif/nonaktif)', 'Tahun Pelajaran'];
function unduhTemplateSiswa() {
    const ws = XLSX.utils.aoa_to_sheet([
        exports.HEADER_SISWA,
        ['12345', '0012345678', 'Ahmad Fauzi', 'L', 'Boyolali', '2013-05-10', 'VII', 'Ngleses, Juwangi', 'Budi Santoso', 'aktif', '2026/2027'],
    ]);
    ws['!cols'] = exports.HEADER_SISWA.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Siswa');
    XLSX.writeFile(wb, 'template-siswa-kartu-pelajar.xlsx');
}
function sel(v) {
    if (v === null || v === undefined)
        return '';
    if (v instanceof Date) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return String(v).trim();
}
/** Baca .xlsx/.csv -> baris terstruktur + masalah per baris (tanpa menyimpan apa pun). */
async function bacaFileImpor(file) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const out = [];
    for (let i = 1; i < aoa.length; i++) {
        const r = aoa[i];
        if (!r || r.every((c) => sel(c) === ''))
            continue;
        const b = {
            nis: sel(r[0]), nisn: sel(r[1]), nama: sel(r[2]), jenisKelamin: sel(r[3]).toUpperCase(),
            tempatLahir: sel(r[4]), tanggalLahir: sel(r[5]), kelas: sel(r[6]).toUpperCase(),
            alamat: sel(r[7]), orangTua: sel(r[8]),
            status: sel(r[9]).toLowerCase() || 'aktif', tahunPelajaran: sel(r[10]), masalah: [],
        };
        if (!b.nis)
            b.masalah.push('NIS kosong');
        if (!b.nama)
            b.masalah.push('Nama kosong');
        if (!['VII', 'VIII', 'IX'].includes(b.kelas))
            b.masalah.push('Kelas harus VII/VIII/IX');
        if (b.nisn && !/^\d+$/.test(b.nisn))
            b.masalah.push('NISN harus angka');
        if (b.jenisKelamin && !['L', 'P'].includes(b.jenisKelamin))
            b.masalah.push('Jenis kelamin harus L/P');
        if (!['aktif', 'nonaktif'].includes(b.status))
            b.masalah.push('Status harus aktif/nonaktif');
        out.push(b);
    }
    return out;
}
function eksporSiswaExcel(siswa) {
    const rows = siswa.map((s) => [s.nomorKartu, s.nis, s.nisn, s.nama, s.jenisKelamin, s.tempatLahir, s.tanggalLahir, s.kelas, s.alamat, s.orangTua, s.status, s.tahunPelajaran, s.dicetak ? 'Sudah' : 'Belum']);
    const ws = XLSX.utils.aoa_to_sheet([['Nomor Kartu', ...exports.HEADER_SISWA, 'Sudah Dicetak'], ...rows]);
    ws['!cols'] = [{ wch: 16 }, ...exports.HEADER_SISWA.map(() => ({ wch: 20 })), { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Siswa');
    XLSX.writeFile(wb, 'data-siswa-kartu-pelajar.xlsx');
}
