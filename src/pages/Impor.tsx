import { useState } from 'react';
import { Btn, Card, Pesan } from '../components/ui';
import { importSiswa } from '../services/api';
import { bacaFileImpor, eksporSiswaExcel, unduhTemplateSiswa, type BarisImpor } from '../utils/excel';
import type { PageProps } from './PageProps';

export default function Impor({ data, refresh }: PageProps) {
  const [baris, setBaris] = useState<BarisImpor[]>([]);
  const [pesan, setPesan] = useState('');
  const [jenis, setJenis] = useState<'info' | 'sukses' | 'error'>('info');
  const [sibuk, setSibuk] = useState(false);

  const valid = baris.filter((b) => b.masalah.length === 0);
  const bermasalah = baris.filter((b) => b.masalah.length > 0);

  async function pilihFile(f: File) {
    try {
      const hasil = await bacaFileImpor(f);
      setBaris(hasil);
      setPesan(`${hasil.length} baris dibaca. ${hasil.filter((b) => b.masalah.length === 0).length} valid, ${hasil.filter((b) => b.masalah.length > 0).length} bermasalah. Periksa pratinjau, lalu klik Simpan Impor.`);
      setJenis('info');
    } catch (e) { setPesan(e instanceof Error ? e.message : 'Gagal membaca file.'); setJenis('error'); }
  }

  async function simpan() {
    if (valid.length === 0) { setPesan('Tidak ada baris valid untuk diimpor.'); setJenis('error'); return; }
    if (!window.confirm(`Impor ${valid.length} siswa valid? Data lama TIDAK dihapus/ditimpa; NIS/NISN duplikat akan dilewati oleh server.`)) return;
    setSibuk(true);
    try {
      const hasil = await importSiswa(valid.map((b) => ({ ...b })));
      setPesan(`Impor selesai: ${hasil.ditambah} ditambah, ${hasil.dilewati.length} dilewati di server. ${hasil.dilewati.map((d) => `Baris ${d.baris}: ${d.alasan}`).join(' ')}`);
      setJenis('sukses');
      setBaris([]);
      await refresh();
    } catch (e) { setPesan(e instanceof Error ? e.message : 'Gagal mengimpor.'); setJenis('error'); }
    setSibuk(false);
  }

  return (
    <div>
      <Card title="Impor Excel" aksi={<div className="flex gap-2"><Btn warna="putih" onClick={unduhTemplateSiswa}>Unduh Template Excel</Btn><Btn warna="putih" onClick={() => eksporSiswaExcel(data.siswa)}>Ekspor Data ke Excel</Btn></div>}>
        <Pesan teks={pesan} jenis={jenis} />
        <p className="text-sm text-slate-600 mb-3">Langkah: unduh template → isi di Excel → simpan sebagai .xlsx → pilih file di bawah → periksa pratinjau → klik Simpan Impor. Data lama tidak dihapus dan tidak ditimpa otomatis.</p>
        <input type="file" accept=".xlsx,.xls,.csv" className="block text-sm" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pilihFile(f); }} />
        {baris.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold mb-2">Pratinjau: {valid.length} valid, {bermasalah.length} bermasalah</p>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left border-b"><th className="py-2 pr-2">Nama</th><th className="py-2 pr-2">NIS</th><th className="py-2 pr-2">Kelas</th><th className="py-2">Keterangan</th></tr></thead>
                <tbody>
                  {baris.map((b, i) => (
                    <tr key={i} className="border-b border-slate-100"><td className="py-1 pr-2">{b.nama || '(kosong)'}</td><td className="py-1 pr-2">{b.nis}</td><td className="py-1 pr-2">{b.kelas}</td><td className="py-1">{b.masalah.length ? <span className="text-red-600">{b.masalah.join('; ')}</span> : <span className="text-emerald-700">Valid</span>}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex gap-2">
              <Btn onClick={simpan} disabled={sibuk}>{sibuk ? 'Mengimpor...' : `Simpan Impor (${valid.length})`}</Btn>
              <Btn warna="abu" onClick={() => setBaris([])}>Batal</Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
