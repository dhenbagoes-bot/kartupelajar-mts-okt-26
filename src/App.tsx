import { useCallback, useEffect, useState } from 'react';
import { Btn, Pesan } from './components/ui';
import Dashboard from './pages/Dashboard';
import DataSiswa from './pages/DataSiswa';
import Impor from './pages/Impor';
import DesainKartu from './pages/DesainKartu';
import Cetak from './pages/Cetak';
import Verifikasi from './pages/Verifikasi';
import KonfigurasiSistem from './pages/KonfigurasiSistem';
import ManajemenPengguna from './pages/ManajemenPengguna';
import Backup from './pages/Backup';
import Panduan from './pages/Panduan';
import Login from './pages/Login';
import Konfigurasi from './pages/Konfigurasi';
import { getAllData, getApiUrl, getSesiTersimpan, isLoggedIn, logout, setUrlEfektif } from './services/api';
import type { AllData, UserSesi } from './types';

type Halaman = 'dashboard' | 'siswa' | 'impor' | 'desain' | 'cetak' | 'verifikasi' | 'konfigurasi-sistem' | 'pengguna' | 'backup' | 'panduan';

const MENU: { id: Halaman; label: string; adminSaja?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'siswa', label: 'Data Siswa' },
  { id: 'impor', label: 'Impor Excel' },
  { id: 'desain', label: 'Desain Kartu' },
  { id: 'cetak', label: 'Cetak Kartu' },
  { id: 'verifikasi', label: 'Verifikasi Kartu' },
  { id: 'konfigurasi-sistem', label: 'Konfigurasi Sistem' },
  { id: 'pengguna', label: 'Manajemen Pengguna', adminSaja: true },
  { id: 'backup', label: 'Backup dan Pemulihan', adminSaja: true },
  { id: 'panduan', label: 'Panduan Penggunaan' },
];

export default function App() {
  const [user, setUser] = useState<UserSesi | null>(null);
  const [data, setData] = useState<AllData | null>(null);
  const [page, setPage] = useState<Halaman>('dashboard');
  const [halamanKhusus, setHalamanKhusus] = useState<'login' | 'konfigurasi' | 'verifikasi-publik' | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [pesanGlobal, setPesanGlobal] = useState('');
  const [jenisGlobal, setJenisGlobal] = useState<'info' | 'sukses' | 'error'>('info');
  const [sidebarBuka, setSidebarBuka] = useState(false);

  const setPesan = useCallback((pesan: string, jenis: 'info' | 'sukses' | 'error' = 'info') => {
    setPesanGlobal(pesan); setJenisGlobal(jenis);
  }, []);

  const muatData = useCallback(async () => {
    try {
      const d = await getAllData();
      setData(d);
      setGalat('');
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Gagal memuat data.');
      throw e;
    }
  }, []);

  // Resolusi backend: ?school= + schools.json, override manual di localStorage menang.
  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const schoolId = params.get('school');
        if (window.location.hash.startsWith('#/verifikasi')) setHalamanKhusus('verifikasi-publik');
        const res = await fetch('/schools.json');
        const list = (await res.json()) as { id: string; nama: string; apiUrl: string }[];
        if (batal) return;
        const manual = getApiUrl();
        if (!manual && schoolId) {
          const s = list.find((x) => x.id === schoolId);
          if (s?.apiUrl) setUrlEfektif(s.apiUrl);
        } else if (!manual && list.length === 1 && list[0].apiUrl) {
          setUrlEfektif(list[0].apiUrl);
        }
      } catch { /* schools.json opsional; URL manual tetap bisa dipakai */ }
      if (batal) return;
      if (isLoggedIn()) {
        const sesi = getSesiTersimpan();
        if (sesi) setUser(sesi);
        try { await muatData(); } catch { /* token mati -> tetap di login, Konfigurasi tetap bisa dibuka */ }
      }
      setMemuat(false);
    })();
    return () => { batal = true; };
  }, [muatData]);

  async function keluar() {
    await logout();
    setUser(null); setData(null); setPage('dashboard');
  }

  function go(p: string) {
    if (p === 'keluar') { void keluar(); return; }
    setPage(p as Halaman);
    setSidebarBuka(false);
    setPesanGlobal('');
  }

  // Halaman khusus: Konfigurasi & Verifikasi publik SELALU bisa dirender
  // walau getAllData gagal — supaya pengguna tidak terjebak layar error.
  if (halamanKhusus === 'konfigurasi') {
    return <Konfigurasi onKembali={() => setHalamanKhusus(user ? null : 'login')} onTersambung={() => { if (user) void muatData(); }} />;
  }
  if (halamanKhusus === 'verifikasi-publik') {
    return (
      <div className="min-h-screen bg-slate-100 p-4">
        <div className="max-w-2xl mx-auto">
          <button className="text-emerald-700 font-semibold text-sm mb-3" onClick={() => { window.location.hash = ''; setHalamanKhusus(null); }}>← Kembali ke Login</button>
          <Verifikasi />
        </div>
      </div>
    );
  }

  if (memuat) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Memuat aplikasi...</div>;
  }

  if (!user) {
    return <Login onLogin={(u) => { setUser(u); setHalamanKhusus(null); void muatData().catch(() => undefined); }} goKonfigurasi={() => setHalamanKhusus('konfigurasi')} />;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-100 p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border p-5">
          <h1 className="font-bold mb-2">Belum bisa memuat data</h1>
          <Pesan teks={galat || 'Periksa URL backend di Konfigurasi, lalu coba lagi.'} jenis="error" />
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => setHalamanKhusus('konfigurasi')}>Buka Konfigurasi</Btn>
            <Btn warna="putih" onClick={() => void muatData().catch(() => undefined)}>Coba Lagi</Btn>
            <Btn warna="abu" onClick={() => void keluar()}>Keluar</Btn>
          </div>
        </div>
      </div>
    );
  }

  const props = { data, user, refresh: muatData, go, setPesanGlobal: setPesan };
  const isAdmin = user.peran === 'admin';

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
      <aside className={`no-print fixed inset-y-0 left-0 z-40 w-64 bg-emerald-900 text-white p-4 transform transition-transform lg:static lg:transform-none ${sidebarBuka ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="mb-4">
          <div className="font-black text-lg leading-tight">KARTU PELAJAR</div>
          <div className="text-emerald-200 text-sm">{data.pengaturan.namaMadrasah || 'MTs AL ISLAM NGLESES'}</div>
          <div className="text-emerald-300 text-xs mt-1">{data.pengaturan.alamatMadrasah}</div>
        </div>
        <nav className="space-y-1">
          {MENU.filter((m) => !m.adminSaja || isAdmin).map((m) => (
            <button key={m.id} onClick={() => go(m.id)} className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold ${page === m.id ? 'bg-emerald-700' : 'hover:bg-emerald-800'}`}>{m.label}</button>
          ))}
          <button onClick={() => setHalamanKhusus('konfigurasi')} className="block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-800">Konfigurasi Backend</button>
          <button onClick={() => void keluar()} className="block w-full text-left px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 mt-2">Keluar</button>
        </nav>
        <div className="text-xs text-emerald-300 mt-6">Masuk sebagai {user.nama} ({user.peran})</div>
      </aside>
      {sidebarBuka && <div className="no-print fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarBuka(false)} />}

      <div className="flex-1 min-w-0">
        <header className="no-print bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button className="lg:hidden text-2xl" onClick={() => setSidebarBuka(true)} aria-label="Buka menu">☰</button>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{data.pengaturan.namaMadrasah || 'MTs AL ISLAM NGLESES'}</div>
            <div className="text-xs text-slate-500 truncate">Tahun Pelajaran {data.pengaturan.tahunPelajaran || '-'} • {user.nama} ({user.peran})</div>
          </div>
          <Btn warna="putih" onClick={() => void muatData().catch(() => undefined)}>Muat Ulang</Btn>
        </header>
        <main className="p-4 max-w-6xl mx-auto">
          <Pesan teks={pesanGlobal} jenis={jenisGlobal} />
          {galat && <Pesan teks={galat} jenis="error" />}
          {page === 'dashboard' && <Dashboard {...props} />}
          {page === 'siswa' && <DataSiswa {...props} />}
          {page === 'impor' && <Impor {...props} />}
          {page === 'desain' && <DesainKartu {...props} />}
          {page === 'cetak' && <Cetak {...props} />}
          {page === 'verifikasi' && <Verifikasi />}
          {page === 'konfigurasi-sistem' && <KonfigurasiSistem {...props} />}
          {page === 'pengguna' && isAdmin && <ManajemenPengguna {...props} />}
          {page === 'backup' && isAdmin && <Backup {...props} />}
          {page === 'panduan' && <Panduan />}
        </main>
      </div>
    </div>
  );
}
