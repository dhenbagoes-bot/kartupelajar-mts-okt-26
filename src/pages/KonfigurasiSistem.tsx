import { useState } from 'react';
import { Btn, Card, Field, Input, Pesan, Textarea } from '../components/ui';
import { savePengaturan, uploadFile } from '../services/api';
import { bacaGambar } from '../utils/format';
import type { PageProps } from './PageProps';

type JenisUpload = 'logoKemenag' | 'logoMaarif' | 'ttd' | 'stempel';

const LABEL: Record<JenisUpload, string> = {
  logoKemenag: 'Logo Kementerian Agama RI',
  logoMaarif: 'Logo LP MAARIF NU',
  ttd: 'Tanda Tangan Kepala Madrasah',
  stempel: 'Stempel Madrasah',
};

export default function KonfigurasiSistem({ data, refresh, user }: PageProps) {
  const p = data.pengaturan;
  const [form, setForm] = useState({ ...p });
  const [pesan, setPesan] = useState('');
  const [jenis, setJenis] = useState<'info' | 'sukses' | 'error'>('info');
  const [sibuk, setSibuk] = useState(false);
  const isAdmin = user.peran === 'admin';

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) { setPesan('Hanya admin yang boleh mengubah konfigurasi sistem.'); setJenis('error'); return; }
    setSibuk(true);
    try {
      await savePengaturan(form);
      setPesan('Konfigurasi tersimpan.');
      setJenis('sukses');
      await refresh();
    } catch (err) { setPesan(err instanceof Error ? err.message : 'Gagal menyimpan.'); setJenis('error'); }
    setSibuk(false);
  }

  async function unggah(jenisUpload: JenisUpload, file: File) {
    try {
      const g = await bacaGambar(file);
      const up = await uploadFile(jenisUpload, g.dataUrl, g.mimeType, jenisUpload);
      const kunci = jenisUpload === 'logoKemenag' ? 'logoKemenagUrl' : jenisUpload === 'logoMaarif' ? 'logoMaarifUrl' : jenisUpload === 'ttd' ? 'ttdUrl' : 'stempelUrl';
      set(kunci, up.url);
      setPesan(`${LABEL[jenisUpload]} berhasil diunggah ke Drive. Klik Simpan Konfigurasi untuk menyimpan URL-nya.`);
      setJenis('sukses');
    } catch (err) { setPesan(err instanceof Error ? err.message : 'Gagal mengunggah.'); setJenis('error'); }
  }

  return (
    <div>
      {!isAdmin && <Pesan teks="Anda login sebagai operator: konfigurasi hanya bisa dibaca, tidak bisa diubah. Minta admin untuk mengubahnya." jenis="info" />}
      <Card title="Konfigurasi Sistem">
        <Pesan teks={pesan} jenis={jenis} />
        <form onSubmit={simpan} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nama Madrasah"><Input value={form.namaMadrasah || ''} onChange={(e) => set('namaMadrasah', e.target.value)} disabled={!isAdmin} /></Field>
          <Field label="Kepala Madrasah"><Input value={form.kepalaMadrasah || ''} onChange={(e) => set('kepalaMadrasah', e.target.value)} disabled={!isAdmin} /></Field>
          <div className="sm:col-span-2"><Field label="Alamat Madrasah"><Textarea rows={2} value={form.alamatMadrasah || ''} onChange={(e) => set('alamatMadrasah', e.target.value)} disabled={!isAdmin} /></Field></div>
          <Field label="Nomor Kontak Madrasah"><Input value={form.teleponMadrasah || ''} onChange={(e) => set('teleponMadrasah', e.target.value)} disabled={!isAdmin} placeholder="Kosongkan bila belum ada — tidak dikarang" /></Field>
          <Field label="Tahun Pelajaran"><Input value={form.tahunPelajaran || ''} onChange={(e) => set('tahunPelajaran', e.target.value)} disabled={!isAdmin} placeholder="2026/2027" /></Field>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.verifikasiPublik !== '0'} onChange={(e) => set('verifikasiPublik', e.target.checked ? '1' : '0')} disabled={!isAdmin} /> Verifikasi publik aktif</label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.qrAktif !== '0'} onChange={(e) => set('qrAktif', e.target.checked ? '1' : '0')} disabled={!isAdmin} /> QR Code aktif</label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.kartuBelakangAktif !== '0'} onChange={(e) => set('kartuBelakangAktif', e.target.checked ? '1' : '0')} disabled={!isAdmin} /> Bagian belakang kartu aktif</label>
          <div className="sm:col-span-2 flex gap-2"><Btn type="submit" disabled={!isAdmin || sibuk}>{sibuk ? 'Menyimpan...' : 'Simpan Konfigurasi'}</Btn></div>
        </form>
      </Card>
      <Card title="Unggah Logo, Tanda Tangan & Stempel Resmi">
        <p className="text-sm text-slate-600 mb-3">Aplikasi TIDAK membuat logo resmi palsu. Unggah logo resmi yang dimiliki madrasah di sini. Bila belum diunggah, kartu menampilkan kotak placeholder bertuliskan nama logo, bukan tiruan logo resmi.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.keys(LABEL) as JenisUpload[]).map((j) => {
            const kunci = j === 'logoKemenag' ? 'logoKemenagUrl' : j === 'logoMaarif' ? 'logoMaarifUrl' : j === 'ttd' ? 'ttdUrl' : 'stempelUrl';
            const url = form[kunci] || '';
            return (
              <div key={j} className="border rounded-lg p-3">
                <p className="font-semibold text-sm mb-2">{LABEL[j]}</p>
                {url ? <img src={url} alt={LABEL[j]} style={{ maxHeight: 80, objectFit: 'contain' }} /> : <p className="text-xs text-slate-500">Belum diunggah.</p>}
                <input type="file" accept="image/*" className="block text-sm mt-2" disabled={!isAdmin} onChange={(e) => { const f = e.target.files?.[0]; if (f) void unggah(j, f); }} />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
