import { useMemo, useState, type ReactNode } from 'react';
import { Btn, Card, Field, Input, Pesan, Select } from '../components/ui';
import { KartuBelakang, KartuDepan } from '../components/Kartu';
import { tandaiCetak } from '../services/api';
import { desainEfektif } from '../types';
import type { PageProps } from './PageProps';

export default function Cetak({ data, refresh }: PageProps) {
  const desain = desainEfektif(data.pengaturan);
  const belakangAktif = data.pengaturan.kartuBelakangAktif !== '0';
  const [kelas, setKelas] = useState('semua');
  const [hanyaBelum, setHanyaBelum] = useState(false);
  const [terpilih, setTerpilih] = useState<Set<string>>(new Set());
  const [sisi, setSisi] = useState<'depan' | 'belakang' | 'keduanya'>('keduanya');
  const [kolom, setKolom] = useState(2);
  const [baris, setBaris] = useState(4);
  const [jarak, setJarak] = useState(4);
  const [garisPotong, setGarisPotong] = useState(true);
  const [pesan, setPesan] = useState('');
  const [jenis, setJenis] = useState<'info' | 'sukses' | 'error'>('info');

  const daftar = useMemo(() => {
    let list = data.siswa.filter((s) => s.status === 'aktif');
    if (kelas !== 'semua') list = list.filter((s) => s.kelas === kelas);
    if (hanyaBelum) list = list.filter((s) => s.dicetak !== 1);
    return list;
  }, [data.siswa, kelas, hanyaBelum]);

  const kartuTerpilih = daftar.filter((s) => terpilih.has(s.id));
  const semuaTerpilih = daftar.length > 0 && daftar.every((s) => terpilih.has(s.id));

  function toggleSemua() {
    if (semuaTerpilih) setTerpilih(new Set());
    else setTerpilih(new Set(daftar.map((s) => s.id)));
  }

  function cetak() {
    if (kartuTerpilih.length === 0) { setPesan('Pilih minimal satu siswa dulu.'); setJenis('error'); return; }
    setPesan('Membuka dialog cetak browser — pilih "Save as PDF" untuk ekspor PDF, matikan Headers and footers, dan pastikan skala 100% agar ukuran 8,5 × 5,5 cm akurat.');
    setJenis('info');
    setTimeout(() => window.print(), 300);
  }

  async function tandai() {
    if (kartuTerpilih.length === 0) return;
    try {
      const h = await tandaiCetak([...terpilih]);
      setPesan(`${h.jumlah} kartu ditandai sudah dicetak.`);
      setJenis('sukses');
      await refresh();
    } catch (e) { setPesan(e instanceof Error ? e.message : 'Gagal menandai.'); setJenis('error'); }
  }

  const kartuLebar = desain.orientasi === 'portrait' ? '55mm' : '85mm';
  const kartuTinggi = desain.orientasi === 'portrait' ? '85mm' : '55mm';

  return (
    <div>
      <Card title="Cetak Kartu">
        <Pesan teks={pesan} jenis={jenis} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <Field label="Kelas"><Select value={kelas} onChange={(e) => setKelas(e.target.value)}><option value="semua">Semua Kelas (aktif)</option><option>VII</option><option>VIII</option><option>IX</option></Select></Field>
          <Field label="Sisi"><Select value={sisi} onChange={(e) => setSisi(e.target.value as typeof sisi)}><option value="keduanya">Depan + Belakang</option><option value="depan">Depan saja</option><option value="belakang">Belakang saja</option></Select></Field>
          <Field label="Kolom per lembar A4"><Input type="number" min={1} max={4} value={kolom} onChange={(e) => setKolom(Number(e.target.value) || 2)} /></Field>
          <Field label="Baris per lembar A4"><Input type="number" min={1} max={6} value={baris} onChange={(e) => setBaris(Number(e.target.value) || 4)} /></Field>
          <Field label="Jarak antar-kartu (mm)"><Input type="number" min={0} max={15} value={jarak} onChange={(e) => setJarak(Number(e.target.value) || 0)} /></Field>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={garisPotong} onChange={(e) => setGarisPotong(e.target.checked)} /> Garis potong</label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={hanyaBelum} onChange={(e) => setHanyaBelum(e.target.checked)} /> Hanya yang belum dicetak</label>
        </div>
        {!belakangAktif && sisi !== 'depan' && <p className="text-sm text-amber-700 mb-2">Bagian belakang sedang dinonaktifkan di Konfigurasi Sistem — yang tercetak hanya depan.</p>}
        <div className="flex flex-wrap gap-2 mb-3">
          <Btn warna="putih" onClick={toggleSemua}>{semuaTerpilih ? 'Batalkan Semua Pilihan' : `Pilih Semua (${daftar.length})`}</Btn>
          <Btn onClick={cetak}>Cetak / Ekspor PDF ({kartuTerpilih.length})</Btn>
          <Btn warna="emas" onClick={() => void tandai()}>Tandai Sudah Dicetak</Btn>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
          {daftar.map((s) => (
            <label key={s.id} className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm">
              <input type="checkbox" checked={terpilih.has(s.id)} onChange={() => { const n = new Set(terpilih); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); setTerpilih(n); }} />
              <span><b>{s.nama}</b> — {s.kelas} • {s.nomorKartu}{s.dicetak ? ' • Sudah cetak' : ''}</span>
            </label>
          ))}
          {daftar.length === 0 && <p className="text-sm text-slate-500">Tidak ada siswa aktif yang cocok.</p>}
        </div>
      </Card>

      <Card title="Pratinjau Cetak (yang dipilih)">
        <p className="text-xs text-slate-500 mb-3">Pratinjau di layar diperkecil; ukuran cetak tetap {desain.orientasi === 'portrait' ? '5,5 × 8,5 cm' : '8,5 × 5,5 cm'} per kartu. Saat cetak, hanya area cetak yang keluar — dashboard tidak ikut tercetak.</p>
        <div className="flex flex-wrap gap-4">
          {kartuTerpilih.slice(0, 12).map((s) => (
            <div key={s.id} className="flex flex-col gap-2">
              {(sisi === 'depan' || sisi === 'keduanya') && <KartuDepan siswa={s} pengaturan={data.pengaturan} desain={desain} />}
              {belakangAktif && (sisi === 'belakang' || sisi === 'keduanya') && <KartuBelakang siswa={s} pengaturan={data.pengaturan} desain={desain} />}
            </div>
          ))}
          {kartuTerpilih.length === 0 && <p className="text-sm text-slate-500">Pilih siswa di atas untuk melihat pratinjau.</p>}
          {kartuTerpilih.length > 12 && <p className="text-sm text-slate-500">Menampilkan 12 kartu pertama; semua {kartuTerpilih.length} kartu tetap tercetak.</p>}
        </div>
      </Card>

      {/* Area cetak — hanya terlihat saat print (lihat index.css).
          Kartu dipecah per halaman: kolom × baris kartu per lembar A4. */}
      <div id="print-area" style={{ display: 'none' }}>
        {(() => {
          const semua: ReactNode[] = kartuTerpilih.flatMap((s) => {
            const items: ReactNode[] = [];
            if (sisi === 'depan' || sisi === 'keduanya') items.push(<div key={`${s.id}-depan`} style={garisPotong ? { outline: '0.4mm dashed #94a3b8', outlineOffset: '1mm' } : undefined}><KartuDepan siswa={s} pengaturan={data.pengaturan} desain={desain} /></div>);
            if (belakangAktif && (sisi === 'belakang' || sisi === 'keduanya')) items.push(<div key={`${s.id}-belakang`} style={garisPotong ? { outline: '0.4mm dashed #94a3b8', outlineOffset: '1mm' } : undefined}><KartuBelakang siswa={s} pengaturan={data.pengaturan} desain={desain} /></div>);
            return items;
          });
          const perHalaman = Math.max(1, kolom * baris);
          const halaman: ReactNode[][] = [];
          for (let i = 0; i < semua.length; i += perHalaman) halaman.push(semua.slice(i, i + perHalaman));
          return halaman.map((h, idx) => (
            <div key={idx} className="print-page" style={{ display: 'grid', gridTemplateColumns: `repeat(${kolom}, ${kartuLebar})`, gridTemplateRows: `repeat(${baris}, ${kartuTinggi})`, gap: `${jarak}mm`, justifyContent: 'start', pageBreakAfter: idx < halaman.length - 1 ? 'always' : 'auto', breakAfter: idx < halaman.length - 1 ? 'page' : 'auto' }}>
              {h}
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
