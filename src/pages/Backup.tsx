import { useState } from 'react';
import { Btn, Card, Pesan } from '../components/ui';
import { backupData, importSiswa } from '../services/api';
import { eksporSiswaExcel } from '../utils/excel';
import { unduhTeks } from '../utils/format';
import type { PageProps } from './PageProps';

export default function Backup({ data, refresh }: PageProps) {
  const [pesan, setPesan] = useState('');
  const [jenis, setJenis] = useState<'info' | 'sukses' | 'error'>('info');
  const [sibuk, setSibuk] = useState(false);

  async function unduhBackup() {
    setSibuk(true);
    try {
      const b = await backupData();
      unduhTeks(`backup-kartu-pelajar-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ aplikasi: 'wwn-kartu-80', diunduhPada: new Date().toISOString(), ...b }, null, 2));
      setPesan('Backup JSON berhasil diunduh. Simpan file ini di tempat aman (bukan hanya di HP yang sama).');
      setJenis('sukses');
    } catch (e) { setPesan(e instanceof Error ? e.message : 'Gagal mengunduh backup.'); setJenis('error'); }
    setSibuk(false);
  }

  async function pulihkanFile(file: File) {
    try {
      const teks = await file.text();
      const json = JSON.parse(teks) as { siswa?: { nis: string; nisn: string; nama: string; kelas: string; [k: string]: unknown }[] };
      const rows = Array.isArray(json.siswa) ? json.siswa : [];
      if (rows.length === 0) { setPesan('File backup tidak berisi data siswa.'); setJenis('error'); return; }
      if (!window.confirm(`Pulihkan ${rows.length} siswa dari backup? Data lama TIDAK dihapus/ditimpa; NIS/NISN duplikat dilewati.`)) return;
      const hasil = await importSiswa(rows.map((r) => ({
        nis: String(r.nis || ''), nisn: String(r.nisn || ''), nama: String(r.nama || ''),
        jenisKelamin: String(r.jenisKelamin || ''), tempatLahir: String(r.tempatLahir || ''),
        tanggalLahir: String(r.tanggalLahir || ''), kelas: String(r.kelas || ''),
        alamat: String(r.alamat || ''), orangTua: String(r.orangTua || ''),
        fotoUrl: String(r.fotoUrl || ''), status: String(r.status || 'aktif'),
        tahunPelajaran: String(r.tahunPelajaran || ''),
      })));
      setPesan(`Pemulihan selesai: ${hasil.ditambah} ditambah, ${hasil.dilewati.length} dilewati.`);
      setJenis('sukses');
      await refresh();
    } catch { setPesan('File backup tidak valid (bukan JSON backup aplikasi ini).'); setJenis('error'); }
  }

  return (
    <div>
      <Card title="Backup & Pemulihan">
        <Pesan teks={pesan} jenis={jenis} />
        <p className="text-sm text-slate-600 mb-3">Backup adalah salinan data dari Google Sheets. Pemulihan di sini AMAN: ia hanya menambahkan siswa yang belum ada, tidak menghapus dan tidak menimpa data lama. Foto tetap tersimpan di Google Drive (URL-nya ikut tersimpan di backup).</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <Btn onClick={() => void unduhBackup()} disabled={sibuk}>Unduh Backup (JSON)</Btn>
          <Btn warna="putih" onClick={() => eksporSiswaExcel(data.siswa)}>Unduh Data Siswa (Excel)</Btn>
        </div>
        <label className="block text-sm font-semibold mb-1">Pulihkan dari file backup JSON</label>
        <input type="file" accept=".json" className="block text-sm" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pulihkanFile(f); }} />
        <p className="text-xs text-slate-500 mt-3">Data saat ini: {data.siswa.length} siswa, {data.pengguna.length} pengguna, {data.log.length} aktivitas terbaru tersimpan di log.</p>
      </Card>
    </div>
  );
}
