import { useState } from 'react';
import { Btn, Card, Field, Input, Pesan } from '../components/ui';
import { getApiUrl, getUrlEfektif, initDatabase, ping, setApiUrl, setUrlEfektif } from '../services/api';

export default function Konfigurasi({ onKembali, onTersambung }: { onKembali: () => void; onTersambung: () => void }) {
  const [url, setUrl] = useState(getApiUrl() || getUrlEfektif());
  const [pesan, setPesan] = useState('');
  const [jenis, setJenis] = useState<'info' | 'sukses' | 'error'>('info');
  const [sibuk, setSibuk] = useState(false);

  // URL yang dipakai Uji/Inisialisasi: isi kolom dulu, bila kosong pakai
  // URL efektif dari schools.json. Tanpa fallback ini, tombol Uji di
  // perangkat baru selalu gagal ("belum dikonfigurasi") padahal login
  // sudah bisa tersambung otomatis lewat schools.json.

  function simpanUrl() {
    const u = url.trim();
    setApiUrl(u);
    setUrlEfektif(u);
    setPesan(u ? 'URL backend tersimpan di perangkat ini.' : 'URL backend dikosongkan.');
    setJenis('info');
  }

  async function uji() {
    setSibuk(true);
    try {
      const u = url.trim() || getUrlEfektif();
      if (!u) throw new Error('URL backend belum diisi dan tidak ada URL di schools.json.');
      setApiUrl(u); setUrlEfektif(u); setUrl(u);
      const h = await ping();
      setPesan(`Terhubung! Backend versi ${h.version}, waktu server ${h.waktu}.`);
      setJenis('sukses');
      onTersambung();
    } catch (e) { setPesan(e instanceof Error ? e.message : 'Gagal terhubung.'); setJenis('error'); }
    setSibuk(false);
  }

  async function init() {
    setSibuk(true);
    try {
      const u = url.trim() || getUrlEfektif();
      if (!u) throw new Error('URL backend belum diisi dan tidak ada URL di schools.json.');
      setApiUrl(u); setUrlEfektif(u); setUrl(u);
      const h = await initDatabase();
      setPesan(`Database diinisialisasi: ${h.sheets.join(', ')}. Data lama dipertahankan. Akun bawaan hanya dibuat bila sheet Pengguna masih kosong — segera ganti kata sandinya setelah login.`);
      setJenis('sukses');
      onTersambung();
    } catch (e) { setPesan(e instanceof Error ? e.message : 'Gagal menginisialisasi.'); setJenis('error'); }
    setSibuk(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Card title="Konfigurasi Backend">
          <Pesan teks={pesan} jenis={jenis} />
          <p className="text-sm text-slate-600 mb-3">Tempel URL Web App Google Apps Script (berakhiran <code>/exec</code>) di bawah. Halaman ini sengaja bisa dibuka tanpa login dan tanpa data — supaya Anda tidak terjebak bila URL-nya salah.</p>
          <Field label="URL Backend (/exec)"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" /></Field>
          <div className="flex flex-wrap gap-2 mt-3">
            <Btn onClick={simpanUrl}>Simpan URL</Btn>
            <Btn warna="putih" onClick={() => void uji()} disabled={sibuk}>Uji Koneksi</Btn>
            <Btn warna="emas" onClick={() => void init()} disabled={sibuk}>Inisialisasi Database</Btn>
            <Btn warna="abu" onClick={onKembali}>Kembali</Btn>
          </div>
          <div className="text-sm text-slate-600 mt-4 space-y-1">
            <p><b>Langkah backend (ringkas):</b> Buat Spreadsheet baru → dari dalam spreadsheet itu buka Extensions → Apps Script → hapus isi editor → tempel <code>backend/Kode.gs</code> → ganti <code>appsscript.json</code> dengan file dari repo → jalankan <code>authorizeDriveAccess</code> → Deploy → New deployment → Web app (Execute as Me, Anyone) → salin URL /exec ke sini.</p>
            <p><b>Jangan</b> membuat Apps Script dari script.google.com langsung — script harus dibuat dari dalam spreadsheet (container-bound), kalau tidak semua aksi gagal.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
