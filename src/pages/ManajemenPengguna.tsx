import { useState } from 'react';
import { Btn, Card, Field, Input, Pesan, Select } from '../components/ui';
import { deletePengguna, resetPassword, savePengguna } from '../services/api';
import type { Pengguna } from '../types';
import type { PageProps } from './PageProps';

export default function ManajemenPengguna({ data, refresh, user }: PageProps) {
  const [form, setForm] = useState<{ id?: string; nama: string; username: string; peran: string; password: string; aktif: number } | null>(null);
  const [pesan, setPesan] = useState('');
  const [jenis, setJenis] = useState<'info' | 'sukses' | 'error'>('info');
  const [sibuk, setSibuk] = useState(false);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSibuk(true);
    try {
      await savePengguna({ id: form.id, nama: form.nama, username: form.username, peran: form.peran, password: form.password || undefined, aktif: form.aktif });
      setPesan('Pengguna tersimpan. Kosongkan kata sandi saat edit bila tidak ingin mengubahnya.');
      setJenis('sukses');
      setForm(null);
      await refresh();
    } catch (err) { setPesan(err instanceof Error ? err.message : 'Gagal menyimpan.'); setJenis('error'); }
    setSibuk(false);
  }

  async function hapus(u: Pengguna) {
    if (!window.confirm(`Hapus pengguna ${u.username}?`)) return;
    try { await deletePengguna(u.id); setPesan('Pengguna dihapus.'); setJenis('sukses'); await refresh(); }
    catch (err) { setPesan(err instanceof Error ? err.message : 'Gagal menghapus.'); setJenis('error'); }
  }

  async function reset(u: Pengguna) {
    const baru = window.prompt(`Kata sandi baru untuk ${u.username} (minimal 6 karakter):`);
    if (!baru) return;
    try { await resetPassword(u.id, baru); setPesan('Kata sandi direset. Pengguna harus login ulang.'); setJenis('sukses'); }
    catch (err) { setPesan(err instanceof Error ? err.message : 'Gagal mereset.'); setJenis('error'); }
  }

  return (
    <div>
      <Card title="Manajemen Pengguna (khusus admin)" aksi={<Btn onClick={() => setForm({ nama: '', username: '', peran: 'operator', password: '', aktif: 1 })}>+ Tambah Pengguna</Btn>}>
        <Pesan teks={pesan} jenis={jenis} />
        <p className="text-sm text-slate-600 mb-3">Admin: semua menu. Operator: data siswa + cetak kartu. Pemeriksaan hak akses dilakukan di backend, bukan hanya menyembunyikan menu.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left border-b"><th className="py-2 pr-2">Nama</th><th className="py-2 pr-2">Username</th><th className="py-2 pr-2">Peran</th><th className="py-2 pr-2">Aktif</th><th className="py-2">Aksi</th></tr></thead>
            <tbody>
              {data.pengguna.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2 font-semibold">{u.nama}{u.username === user.username ? ' (Anda)' : ''}</td>
                  <td className="py-2 pr-2">{u.username}</td>
                  <td className="py-2 pr-2">{u.peran}</td>
                  <td className="py-2 pr-2">{u.aktif ? 'Ya' : 'Tidak'}</td>
                  <td className="py-2 whitespace-nowrap">
                    <button className="text-emerald-700 font-semibold mr-3" onClick={() => setForm({ id: u.id, nama: u.nama, username: u.username, peran: u.peran, password: '', aktif: u.aktif })}>Edit</button>
                    <button className="text-amber-700 font-semibold mr-3" onClick={() => void reset(u)}>Reset Sandi</button>
                    <button className="text-red-600 font-semibold" onClick={() => void hapus(u)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {form && (
        <Card title={form.id ? 'Edit Pengguna' : 'Tambah Pengguna'}>
          <form onSubmit={simpan} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nama"><Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required /></Field>
            <Field label="Username"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></Field>
            <Field label="Peran"><Select value={form.peran} onChange={(e) => setForm({ ...form, peran: e.target.value })}><option value="admin">Admin</option><option value="operator">Operator</option></Select></Field>
            <Field label={form.id ? 'Kata Sandi Baru (kosongkan bila tidak diubah)' : 'Kata Sandi (min 6 karakter)'}><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.aktif === 1} onChange={(e) => setForm({ ...form, aktif: e.target.checked ? 1 : 0 })} /> Akun aktif</label>
            <div className="sm:col-span-2 flex gap-2"><Btn type="submit" disabled={sibuk}>{sibuk ? 'Menyimpan...' : 'Simpan'}</Btn><Btn warna="abu" onClick={() => setForm(null)}>Batal</Btn></div>
          </form>
        </Card>
      )}
    </div>
  );
}
