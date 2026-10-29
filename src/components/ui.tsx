import type { ReactNode } from 'react';

export function Btn({ children, onClick, warna = 'hijau', type = 'button', disabled }: { children: ReactNode; onClick?: () => void; warna?: 'hijau' | 'putih' | 'merah' | 'emas' | 'abu'; type?: 'button' | 'submit'; disabled?: boolean }) {
  const cls = warna === 'hijau' ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
    : warna === 'merah' ? 'bg-red-600 hover:bg-red-700 text-white'
    : warna === 'emas' ? 'bg-yellow-500 hover:bg-yellow-600 text-slate-900'
    : warna === 'abu' ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
    : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-800';
  return <button type={type} disabled={disabled} onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 ${cls}`}>{children}</button>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm"><span className="block font-semibold text-slate-700 mb-1">{label}</span>{children}</label>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />;
}

export function Card({ title, children, aksi }: { title: string; children: ReactNode; aksi?: ReactNode }) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="font-bold text-slate-800">{title}</h2>
        {aksi}
      </div>
      {children}
    </section>
  );
}

export function Pesan({ teks, jenis = 'info' }: { teks: string; jenis?: 'info' | 'sukses' | 'error' }) {
  if (!teks) return null;
  const cls = jenis === 'sukses' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : jenis === 'error' ? 'bg-red-50 text-red-800 border-red-200'
    : 'bg-blue-50 text-blue-800 border-blue-200';
  return <div className={`border rounded-lg px-3 py-2 text-sm mb-3 ${cls}`}>{teks}</div>;
}
