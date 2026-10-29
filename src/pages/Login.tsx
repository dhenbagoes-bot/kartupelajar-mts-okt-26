import { useState } from 'react';
import { Btn, Field, Input, Pesan } from '../components/ui';
import { login } from '../services/api';
import type { UserSesi } from '../types';

export default function Login({ onLogin, goKonfigurasi }: { onLogin: (u: UserSesi) => void; goKonfigurasi: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pesan, setPesan] = useState('');
  const [sibuk, setSibuk] = useState(false);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setSibuk(true); setPesan('');
    try {
      const u = await login(username, password);
      onLogin(u);
    } catch (err) { setPesan(err instanceof Error ? err.message : 'Login gagal.'); }
    setSibuk(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h1 className="text-xl font-black text-emerald-800 text-center">KARTU PELAJAR</h1>
        <p className="text-center text-sm text-slate-600 mb-4">MTs AL ISLAM NGLESES<br />Juwangi, Boyolali</p>
        <Pesan teks={pesan} jenis="error" />
        <form onSubmit={kirim} className="space-y-3">
          <Field label="Username"><Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required /></Field>
          <Field label="Kata Sandi"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
          <Btn type="submit" disabled={sibuk}>{sibuk ? 'Memeriksa...' : 'Masuk'}</Btn>
        </form>
        <div className="flex flex-col gap-2 mt-4 text-sm text-center">
          <button className="text-emerald-700 font-semibold" onClick={goKonfigurasi}>Atur URL Backend (Konfigurasi)</button>
          <a className="text-slate-500" href="#/verifikasi">Verifikasi Kartu (tanpa login)</a>
        </div>
      </div>
    </div>
  );
}
