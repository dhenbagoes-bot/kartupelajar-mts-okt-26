import { Btn, Card } from '../components/ui';
import { fmtWaktu } from '../utils/format';
import type { PageProps } from './PageProps';

export default function Dashboard({ data, go }: PageProps) {
  const siswa = data.siswa;
  const aktif = siswa.filter((s) => s.status === 'aktif');
  const sudah = aktif.filter((s) => s.dicetak === 1);
  const belum = aktif.filter((s) => s.dicetak !== 1);
  const perKelas = (k: string) => aktif.filter((s) => s.kelas === k).length;
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          ['Siswa Aktif', aktif.length],
          ['Kelas VII', perKelas('VII')],
          ['Kelas VIII', perKelas('VIII')],
          ['Kelas IX', perKelas('IX')],
        ].map(([label, n]) => (
          <div key={label as string} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-3xl font-black text-emerald-800">{n}</div>
            <div className="text-sm text-slate-500">{label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-emerald-700 text-white rounded-xl p-4"><div className="text-3xl font-black">{sudah.length}</div><div className="text-sm opacity-90">Kartu sudah dicetak</div></div>
        <div className="bg-amber-500 text-slate-900 rounded-xl p-4"><div className="text-3xl font-black">{belum.length}</div><div className="text-sm">Kartu belum dicetak</div></div>
      </div>
      <Card title="Aksi Cepat" aksi={<></>}>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => go('siswa')}>+ Tambah Siswa</Btn>
          <Btn warna="emas" onClick={() => go('cetak')}>Cetak Kartu</Btn>
          <Btn warna="putih" onClick={() => go('impor')}>Impor Excel</Btn>
          <Btn warna="putih" onClick={() => go('desain')}>Desain Kartu</Btn>
        </div>
      </Card>
      <Card title="Aktivitas Terbaru">
        {data.log.length === 0 ? <p className="text-sm text-slate-500">Belum ada aktivitas.</p> : (
          <ul className="text-sm divide-y divide-slate-100">
            {data.log.slice(0, 15).map((l) => (
              <li key={l.id} className="py-2 flex gap-3"><span className="text-slate-400 whitespace-nowrap">{fmtWaktu(l.waktu)}</span><span><b>{l.username}</b> — {l.aksi}: {l.detail}</span></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
