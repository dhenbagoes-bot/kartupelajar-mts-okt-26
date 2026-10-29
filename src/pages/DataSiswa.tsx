import { useMemo, useState } from 'react';
import { Btn, Card, Field, Input, Pesan, Select, Textarea } from '../components/ui';
import { deleteSiswa, saveSiswa, uploadFile } from '../services/api';
import { bacaGambar, validasiSiswaForm } from '../utils/format';
import type { Siswa } from '../types';
import type { PageProps } from './PageProps';

const KOSONG: Partial<Siswa> = { nis: '', nisn: '', nama: '', jenisKelamin: 'L', tempatLahir: '', tanggalLahir: '', kelas: 'VII', alamat: '', orangTua: '', fotoUrl: '', status: 'aktif' };

export default function DataSiswa({ data, refresh, setPesanGlobal }: PageProps) {
  const [cari, setCari] = useState('');
  const [kelas, setKelas] = useState('semua');
  const [status, setStatus] = useState('semua');
  const [form, setForm] = useState<Partial<Siswa> | null>(null);
  const [pratinjauFoto, setPratinjauFoto] = useState('');
  const [pesan, setPesan] = useState('');
  const [jenisPesan, setJenisPesan] = useState<'info' | 'sukses' | 'error'>('info');
  const [sibuk, setSibuk] = useState(false);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return data.siswa.filter((s) =>
      (kelas === 'semua' || s.kelas === kelas) &&
      (status === 'semua' || s.status === status) &&
      (!q || s.nama.toLowerCase().includes(q) || s.nis.includes(q) || s.nisn.includes(q) || s.kelas.toLowerCase().includes(q)));
  }, [data.siswa, cari, kelas, status]);

  function bukaForm(s?: Siswa) {
    setForm(s ? { ...s } : { ...KOSONG, tahunPelajaran: data.pengaturan.tahunPelajaran });
    setPratinjauFoto(s?.fotoUrl || '');
    setPesan('');
  }

  async function pilihFoto(f: File) {
    try {
      const g = await bacaGambar(f);
      setPratinjauFoto(g.dataUrl);
      setPesan('Foto dipilih — pratinjau di atas. Foto baru diunggah ke Drive saat Anda klik Simpan.');
      setJenisPesan('info');
      // Simpan dataUrl sementara di form lewat state terpisah (dipegang pratinjauFoto).
    } catch (e) { setPesan(e instanceof Error ? e.message : 'Gagal membaca foto.'); setJenisPesan('error'); }
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const errs = validasiSiswaForm({ nis: form.nis || '', nama: form.nama || '', kelas: form.kelas || '', nisn: form.nisn || '', jenisKelamin: form.jenisKelamin || '', status: form.status || 'aktif' });
    if (errs.length) { setPesan(errs.join(' ')); setJenisPesan('error'); return; }
    // Duplikat NIS/NISN dicek dulu di sisi depan (backend juga menolak).
    const dupe = data.siswa.find((s) => s.id !== form.id && ((form.nis && s.nis === form.nis) || (form.nisn && s.nisn === form.nisn)));
    if (dupe) { setPesan(`NIS/NISN sudah dipakai oleh ${dupe.nama}.`); setJenisPesan('error'); return; }
    setSibuk(true);
    try {
      let fotoUrl = form.fotoUrl || '';
      // Pratinjau baru = dataUrl -> unggah ke Drive dulu, baru simpan URL-nya.
      if (pratinjauFoto.startsWith('data:')) {
        const mime = pratinjauFoto.split(';')[0].split(':')[1] || 'image/jpeg';
        const up = await uploadFile('foto', pratinjauFoto, mime, `foto-${form.nis}`);
        fotoUrl = up.url;
      }
      const hasil = await saveSiswa({ ...form, fotoUrl });
      setPesanGlobal(hasil.nomorKartu ? `Tersimpan. Nomor kartu: ${hasil.nomorKartu}` : 'Tersimpan.', 'sukses');
      setForm(null);
      await refresh();
    } catch (err) { setPesan(err instanceof Error ? err.message : 'Gagal menyimpan.'); setJenisPesan('error'); }
    setSibuk(false);
  }

  async function hapus(s: Siswa) {
    if (!window.confirm(`Hapus siswa ${s.nama} (NIS ${s.nis})? Tindakan ini tidak bisa dibatalkan.`)) return;
    try { await deleteSiswa(s.id); setPesanGlobal('Siswa dihapus.', 'sukses'); await refresh(); }
    catch (err) { setPesanGlobal(err instanceof Error ? err.message : 'Gagal menghapus.', 'error'); }
  }

  return (
    <div>
      <Card title={`Data Siswa (${tersaring.length} dari ${data.siswa.length})`} aksi={<Btn onClick={() => bukaForm()}>+ Tambah Siswa</Btn>}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          <Input placeholder="Cari nama, NIS, NISN, kelas..." value={cari} onChange={(e) => setCari(e.target.value)} />
          <Select value={kelas} onChange={(e) => setKelas(e.target.value)}><option value="semua">Semua Kelas</option><option>VII</option><option>VIII</option><option>IX</option></Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="semua">Semua Status</option><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left border-b"><th className="py-2 pr-2">Nama</th><th className="py-2 pr-2">NIS / NISN</th><th className="py-2 pr-2">Kelas</th><th className="py-2 pr-2">No. Kartu</th><th className="py-2 pr-2">Status</th><th className="py-2">Aksi</th></tr></thead>
            <tbody>
              {tersaring.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2 font-semibold">{s.nama}</td>
                  <td className="py-2 pr-2">{s.nis} / {s.nisn || '-'}</td>
                  <td className="py-2 pr-2">{s.kelas}</td>
                  <td className="py-2 pr-2">{s.nomorKartu}</td>
                  <td className="py-2 pr-2">{s.status === 'aktif' ? 'Aktif' : 'Nonaktif'}{s.dicetak ? ' • Sudah cetak' : ''}</td>
                  <td className="py-2 whitespace-nowrap"><button className="text-emerald-700 font-semibold mr-3" onClick={() => bukaForm(s)}>Edit</button><button className="text-red-600 font-semibold" onClick={() => hapus(s)}>Hapus</button></td>
                </tr>
              ))}
              {tersaring.length === 0 && <tr><td colSpan={6} className="py-4 text-slate-500">Tidak ada siswa yang cocok.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {form && (
        <Card title={form.id ? 'Edit Siswa' : 'Tambah Siswa'}>
          <Pesan teks={pesan} jenis={jenisPesan} />
          <form onSubmit={simpan} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="NIS *"><Input value={form.nis || ''} onChange={(e) => setForm({ ...form, nis: e.target.value })} required /></Field>
            <Field label="NISN"><Input value={form.nisn || ''} onChange={(e) => setForm({ ...form, nisn: e.target.value })} /></Field>
            <Field label="Nama Lengkap *"><Input value={form.nama || ''} onChange={(e) => setForm({ ...form, nama: e.target.value })} required /></Field>
            <Field label="Jenis Kelamin"><Select value={form.jenisKelamin || 'L'} onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value })}><option value="L">Laki-laki (L)</option><option value="P">Perempuan (P)</option></Select></Field>
            <Field label="Tempat Lahir"><Input value={form.tempatLahir || ''} onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })} /></Field>
            <Field label="Tanggal Lahir"><Input type="date" value={form.tanggalLahir || ''} onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })} /></Field>
            <Field label="Kelas *"><Select value={form.kelas || 'VII'} onChange={(e) => setForm({ ...form, kelas: e.target.value })}><option>VII</option><option>VIII</option><option>IX</option></Select></Field>
            <Field label="Status"><Select value={form.status || 'aktif'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></Select></Field>
            <Field label="Tahun Pelajaran"><Input value={form.tahunPelajaran || ''} onChange={(e) => setForm({ ...form, tahunPelajaran: e.target.value })} /></Field>
            <Field label="Nama Orang Tua/Wali"><Input value={form.orangTua || ''} onChange={(e) => setForm({ ...form, orangTua: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Alamat Siswa"><Textarea rows={2} value={form.alamat || ''} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></Field></div>
            <div className="sm:col-span-2">
              <Field label="Foto Siswa (rasio 3:4, maks 5 MB)">
                <input type="file" accept="image/*" className="block text-sm" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pilihFoto(f); }} />
              </Field>
              {pratinjauFoto && <div className="mt-2"><img src={pratinjauFoto} alt="Pratinjau foto" style={{ width: 90, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1' }} /><p className="text-xs text-slate-500 mt-1">Pratinjau foto sebelum disimpan.</p></div>}
              {form.id && form.nomorKartu && <p className="text-sm text-slate-500 mt-2">Nomor kartu: <b>{form.nomorKartu}</b> (otomatis, tidak mengubah NIS).</p>}
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Btn type="submit" disabled={sibuk}>{sibuk ? 'Menyimpan...' : 'Simpan'}</Btn>
              <Btn warna="abu" onClick={() => setForm(null)}>Batal</Btn>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
