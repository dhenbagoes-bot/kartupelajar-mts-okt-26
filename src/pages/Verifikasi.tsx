import { useEffect, useState } from 'react';
import { Btn, Card, Field, Input, Pesan } from '../components/ui';
import { verifyKartu } from '../services/api';
import type { HasilVerifikasi } from '../types';

export default function Verifikasi() {
  const [kode, setKode] = useState('');
  const [hasil, setHasil] = useState<HasilVerifikasi | null>(null);
  const [pesan, setPesan] = useState('');
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    // QR mengarah ke #/verifikasi?kode=KRT-... — baca dari hash saat dibuka.
    const m = /[?#&]kode=([^&]+)/.exec(window.location.hash);
    if (m) {
      const k = decodeURIComponent(m[1]);
      setKode(k);
      void cek(k);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cek(k?: string) {
    const kodePakai = (k ?? kode).trim();
    if (!kodePakai) { setPesan('Masukkan nomor kartu dulu.'); return; }
    setSibuk(true); setPesan(''); setHasil(null);
    try {
      const h = await verifyKartu(kodePakai);
      setHasil(h);
    } catch (e) { setPesan(e instanceof Error ? e.message : 'Gagal memverifikasi.'); }
    setSibuk(false);
  }

  return (
    <div>
      <Card title="Verifikasi Kartu Pelajar">
        <p className="text-sm text-slate-600 mb-3">Masukkan nomor kartu (mis. KRT-2026-0001) atau pindai QR di kartu. Halaman ini hanya menampilkan status, nama, nomor kartu, dan nama madrasah — tidak menampilkan alamat, tanggal lahir, atau data orang tua.</p>
        <Pesan teks={pesan} jenis="error" />
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1"><Field label="Nomor Kartu"><Input value={kode} onChange={(e) => setKode(e.target.value)} placeholder="KRT-2026-0001" /></Field></div>
          <div className="flex items-end"><Btn onClick={() => void cek()} disabled={sibuk}>{sibuk ? 'Memeriksa...' : 'Verifikasi'}</Btn></div>
        </div>
        {hasil && (
          <div className={`mt-4 rounded-xl border p-4 ${hasil.valid ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
            <div className="text-lg font-black">{hasil.valid ? '✓ KARTU VALID' : '✗ KARTU TIDAK VALID'}</div>
            <p className="text-sm mt-1">{hasil.pesan}</p>
            {hasil.nama && <p className="text-sm mt-2"><b>Nama:</b> {hasil.nama}</p>}
            <p className="text-sm"><b>Nomor Kartu:</b> {hasil.nomorKartu}</p>
            <p className="text-sm"><b>Madrasah:</b> {hasil.namaMadrasah}</p>
            <p className="text-xs text-slate-500 mt-2">QR Code bukan bukti keamanan mutlak — validasi dilakukan server terhadap database madrasah.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
