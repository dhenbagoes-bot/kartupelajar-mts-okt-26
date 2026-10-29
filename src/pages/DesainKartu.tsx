import { useState } from 'react';
import { Btn, Card, Field, Input, Pesan, Select } from '../components/ui';
import { KartuBelakang, KartuDepan } from '../components/Kartu';
import { savePengaturan } from '../services/api';
import { DESAIN_DEFAULT, TEMA_PRESET, desainEfektif, type Desain } from '../types';
import type { PageProps } from './PageProps';

export default function DesainKartu({ data, refresh }: PageProps) {
  const [desain, setDesain] = useState<Desain>(desainEfektif(data.pengaturan));
  const [pesan, setPesan] = useState('');
  const [jenis, setJenis] = useState<'info' | 'sukses' | 'error'>('info');
  const [sibuk, setSibuk] = useState(false);
  const contoh = data.siswa[0] || { id: 'contoh', nomorKartu: 'KRT-2026-0001', nis: '12345', nisn: '', nama: 'Nama Siswa Contoh', jenisKelamin: 'L', tempatLahir: 'Boyolali', tanggalLahir: '2013-05-10', kelas: 'VII', alamat: '', orangTua: '', fotoUrl: '', status: 'aktif', tahunPelajaran: data.pengaturan.tahunPelajaran, dicetak: 0, tanggalTerbit: '', dibuatPada: '', diubahPada: '' };
  const ubah = (p: Partial<Desain>) => setDesain((d) => ({ ...d, ...p }));

  async function simpan(d: Desain) {
    setSibuk(true);
    try {
      await savePengaturan({ desainJson: JSON.stringify(d), qrAktif: d.qrAktif ? '1' : '0', kartuBelakangAktif: '1' });
      setPesan('Desain tersimpan. Desain ini dipakai di pratinjau dan cetak.');
      setJenis('sukses');
      await refresh();
    } catch (e) { setPesan(e instanceof Error ? e.message : 'Gagal menyimpan desain.'); setJenis('error'); }
    setSibuk(false);
  }

  return (
    <div>
      <Card title="Desain Kartu">
        <Pesan teks={pesan} jenis={jenis} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Tema"><Select value={desain.tema} onChange={(e) => { const t = e.target.value as Desain['tema']; ubah({ tema: t, ...TEMA_PRESET[t] }); }}><option value="emerald-gold">Hijau Emerald + Emas</option><option value="hijau-putih">Hijau + Putih</option><option value="minimalis">Minimalis</option></Select></Field>
          <Field label="Warna Utama"><Input type="color" value={desain.warnaUtama} onChange={(e) => ubah({ warnaUtama: e.target.value })} /></Field>
          <Field label="Warna Aksen (emas/bingkai)"><Input type="color" value={desain.warnaAksen} onChange={(e) => ubah({ warnaAksen: e.target.value })} /></Field>
          <Field label="Posisi Logo"><Select value={desain.posisiLogo} onChange={(e) => ubah({ posisiLogo: e.target.value as Desain['posisiLogo'] })}><option value="kiri-kanan">Kemenag kiri, Maarif kanan</option><option value="kanan-kiri">Maarif kiri, Kemenag kanan</option></Select></Field>
          <Field label="Posisi Foto"><Select value={desain.posisiFoto} onChange={(e) => ubah({ posisiFoto: e.target.value as Desain['posisiFoto'] })}><option value="kiri">Kiri</option><option value="kanan">Kanan</option></Select></Field>
          <Field label="Orientasi Kartu"><Select value={desain.orientasi} onChange={(e) => ubah({ orientasi: e.target.value as Desain['orientasi'] })}><option value="landscape">Landscape (8,5 × 5,5 cm)</option><option value="portrait">Portrait (5,5 × 8,5 cm)</option></Select></Field>
          <Field label="Ukuran Teks"><Select value={String(desain.ukuranTeks)} onChange={(e) => ubah({ ukuranTeks: Number(e.target.value) })}><option value="0.85">Kecil (85%)</option><option value="1">Normal (100%)</option><option value="1.15">Besar (115%)</option><option value="1.3">Sangat Besar (130%)</option></Select></Field>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={desain.ornamen} onChange={(e) => ubah({ ornamen: e.target.checked })} /> Ornamen geometris halus</label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={desain.bingkai} onChange={(e) => ubah({ bingkai: e.target.checked })} /> Bingkai kartu</label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={desain.qrAktif} onChange={(e) => ubah({ qrAktif: e.target.checked })} /> QR Code verifikasi</label>
        </div>
        <div className="mt-4 flex gap-2">
          <Btn onClick={() => void simpan(desain)} disabled={sibuk}>{sibuk ? 'Menyimpan...' : 'Simpan Desain'}</Btn>
          <Btn warna="abu" onClick={() => { const d = { ...DESAIN_DEFAULT }; setDesain(d); void simpan(d); }}>Kembalikan Desain Default</Btn>
        </div>
        <p className="text-xs text-slate-500 mt-2">Tombol default hanya mereset desain, bukan data siswa.</p>
      </Card>
      <Card title="Pratinjau Langsung (depan & belakang)">
        <p className="text-xs text-slate-500 mb-3">{data.siswa.length ? 'Menggunakan siswa pertama sebagai contoh pratinjau.' : 'Belum ada siswa — pratinjau memakai contoh. Tambah siswa dulu agar pratinjau memakai data asli.'}</p>
        <div className="flex flex-wrap gap-4 overflow-x-auto pb-2">
          <div><p className="text-xs font-semibold mb-1">Depan</p><KartuDepan siswa={contoh} pengaturan={data.pengaturan} desain={desain} /></div>
          <div><p className="text-xs font-semibold mb-1">Belakang</p><KartuBelakang siswa={contoh} pengaturan={data.pengaturan} desain={desain} /></div>
        </div>
      </Card>
    </div>
  );
}
