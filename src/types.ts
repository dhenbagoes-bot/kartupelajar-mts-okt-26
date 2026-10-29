export type Peran = 'admin' | 'operator';
export type Kelas = 'VII' | 'VIII' | 'IX';

export interface Desain {
  tema: 'emerald-gold' | 'hijau-putih' | 'minimalis';
  warnaUtama: string;
  warnaKedua: string;
  warnaAksen: string;
  gradasi: string; // css gradient
  ukuranTeks: number; // skala 0.8 - 1.3
  posisiLogo: 'kiri-kanan' | 'kanan-kiri';
  posisiFoto: 'kiri' | 'kanan';
  ornamen: boolean;
  bingkai: boolean;
  qrAktif: boolean;
  orientasi: 'landscape' | 'portrait';
}

export const DESAIN_DEFAULT: Desain = {
  tema: 'emerald-gold',
  warnaUtama: '#047857',
  warnaKedua: '#065f46',
  warnaAksen: '#d4af37',
  gradasi: 'linear-gradient(135deg,#059669 0%,#047857 55%,#064e3b 100%)',
  ukuranTeks: 1,
  posisiLogo: 'kiri-kanan',
  posisiFoto: 'kiri',
  ornamen: true,
  bingkai: true,
  qrAktif: true,
  orientasi: 'landscape',
};

export const TEMA_PRESET: Record<Desain['tema'], Partial<Desain>> = {
  'emerald-gold': {
    warnaUtama: '#047857', warnaKedua: '#065f46', warnaAksen: '#d4af37',
    gradasi: 'linear-gradient(135deg,#059669 0%,#047857 55%,#064e3b 100%)',
  },
  'hijau-putih': {
    warnaUtama: '#15803d', warnaKedua: '#166534', warnaAksen: '#ffffff',
    gradasi: 'linear-gradient(135deg,#ffffff 0%,#dcfce7 60%,#bbf7d0 100%)',
  },
  minimalis: {
    warnaUtama: '#1f2937', warnaKedua: '#374151', warnaAksen: '#059669',
    gradasi: 'linear-gradient(135deg,#f9fafb 0%,#e5e7eb 100%)',
  },
};

export interface Pengaturan {
  namaMadrasah: string;
  alamatMadrasah: string;
  teleponMadrasah: string;
  kepalaMadrasah: string;
  tahunPelajaran: string;
  logoKemenagUrl: string;
  logoMaarifUrl: string;
  ttdUrl: string;
  stempelUrl: string;
  verifikasiPublik: string;
  qrAktif: string;
  kartuBelakangAktif: string;
  desainJson: string;
  [key: string]: string;
}

export interface Siswa {
  id: string;
  nomorKartu: string;
  nis: string;
  nisn: string;
  nama: string;
  jenisKelamin: string;
  tempatLahir: string;
  tanggalLahir: string;
  kelas: string;
  alamat: string;
  orangTua: string;
  fotoUrl: string;
  status: string;
  tahunPelajaran: string;
  dicetak: number;
  tanggalTerbit: string;
  dibuatPada: string;
  diubahPada: string;
}

export interface Pengguna {
  id: string;
  nama: string;
  username: string;
  peran: Peran;
  aktif: number;
}

export interface LogItem {
  id: string;
  waktu: string;
  username: string;
  aksi: string;
  detail: string;
}

export interface AllData {
  pengaturan: Pengaturan;
  siswa: Siswa[];
  pengguna: Pengguna[];
  log: LogItem[];
  version: string;
}

export interface UserSesi {
  nama: string;
  username: string;
  peran: Peran;
}

export interface HasilVerifikasi {
  valid: boolean;
  nama: string;
  nomorKartu: string;
  namaMadrasah: string;
  pesan: string;
}

export function parseDesain(p: Pengaturan | null | undefined): Desain {
  if (!p || !p.desainJson) return { ...DESAIN_DEFAULT };
  try {
    const d = JSON.parse(p.desainJson) as Partial<Desain>;
    return { ...DESAIN_DEFAULT, ...d };
  } catch {
    return { ...DESAIN_DEFAULT };
  }
}

export function desainEfektif(p: Pengaturan | null | undefined): Desain {
  const d = parseDesain(p);
  // Toggle global di Pengaturan mengalahkan toggle desain untuk QR.
  if (p && p.qrAktif === '0') d.qrAktif = false;
  return d;
}
