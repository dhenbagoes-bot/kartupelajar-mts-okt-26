export function fmtTanggal(iso: string): string {
  if (!iso) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return iso;
}

export function fmtWaktu(dt: string): string {
  if (!dt) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(dt);
  if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
  return dt;
}

/** Baca file gambar -> { dataUrl, mimeType } untuk pratinjau sebelum simpan. */
export function bacaGambar(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('File harus berupa gambar.')); return; }
    if (file.size > 5 * 1024 * 1024) { reject(new Error('Ukuran gambar maksimal 5 MB.')); return; }
    const r = new FileReader();
    r.onload = () => resolve({ dataUrl: String(r.result), mimeType: file.type });
    r.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    r.readAsDataURL(file);
  });
}

export function unduhTeks(namaFile: string, isi: string, tipe = 'application/json'): void {
  const blob = new Blob([isi], { type: tipe });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = namaFile; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function validasiSiswaForm(s: { nis: string; nama: string; kelas: string; nisn: string; jenisKelamin: string; status: string }): string[] {
  const errs: string[] = [];
  if (!s.nis.trim()) errs.push('NIS wajib diisi.');
  if (!s.nama.trim()) errs.push('Nama lengkap wajib diisi.');
  if (!['VII', 'VIII', 'IX'].includes(s.kelas)) errs.push('Kelas harus VII, VIII, atau IX.');
  if (s.nisn.trim() && !/^\d+$/.test(s.nisn.trim())) errs.push('NISN harus berupa angka.');
  if (s.jenisKelamin && !['L', 'P'].includes(s.jenisKelamin)) errs.push('Jenis kelamin harus L atau P.');
  if (!['aktif', 'nonaktif'].includes(s.status)) errs.push('Status harus aktif atau nonaktif.');
  return errs;
}
