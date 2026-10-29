import type { AllData, HasilVerifikasi, Pengaturan, Siswa, UserSesi } from '../types';

// Klien API Google Apps Script. DATA siswa TIDAK PERNAH disimpan di
// localStorage — yang tersimpan di perangkat hanya: URL backend,
// token sesi, dan profil admin/operator ("tetap masuk", 7 hari).
// Semua data siswa selalu dibaca dari Google Sheets lewat backend.

const LS_API = 'wwn-kartu-80.apiUrl';
const LS_TOKEN = 'wwn-kartu-80.token';
const LS_USER = 'wwn-kartu-80.user';

let tokenMem = '';
try { tokenMem = localStorage.getItem(LS_TOKEN) || ''; } catch { /* abaikan */ }
let urlEfektif = '';

export function setUrlEfektif(url: string): void { urlEfektif = (url || '').trim(); }
export function getUrlEfektif(): string { return urlEfektif || getApiUrl(); }
export function getApiUrl(): string {
  try { return localStorage.getItem(LS_API) || ''; } catch { return ''; }
}
export function setApiUrl(url: string): void {
  try { if (url) localStorage.setItem(LS_API, url); else localStorage.removeItem(LS_API); } catch { /* abaikan */ }
}
export function getToken(): string { return tokenMem; }
export function isLoggedIn(): boolean { return !!tokenMem; }
export function bersihkanToken(): void {
  tokenMem = '';
  try { localStorage.removeItem(LS_TOKEN); localStorage.removeItem(LS_USER); } catch { /* abaikan */ }
}
export function getSesiTersimpan(): UserSesi | null {
  try {
    const s = localStorage.getItem(LS_USER);
    if (!s) return null;
    const u = JSON.parse(s) as UserSesi;
    if (u.peran !== 'admin' && u.peran !== 'operator') return null;
    return u;
  } catch { return null; }
}

export async function api<T>(action: string, params: object = {}): Promise<T> {
  const apiUrl = urlEfektif || getApiUrl();
  if (!apiUrl || !apiUrl.trim().startsWith('http')) {
    throw new Error('URL backend belum dikonfigurasi. Atur di menu Konfigurasi.');
  }
  let res: Response;
  try {
    res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(tokenMem ? { action, token: tokenMem, ...params } : { action, ...params }),
    });
  } catch {
    throw new Error('Gagal menghubungi backend. Periksa koneksi internet.');
  }
  if (!res.ok) throw new Error(`Server merespons HTTP ${res.status}.`);
  const json = await res.json();
  if (json.success === false) throw new Error(json.message || json.error || 'Backend melaporkan kegagalan.');
  return json.data as T;
}

export async function login(username: string, password: string): Promise<UserSesi> {
  const data = await api<{ token: string; nama: string; username: string; peran: 'admin' | 'operator' }>('login', { username: username.trim(), password });
  tokenMem = data.token;
  const u: UserSesi = { nama: data.nama, username: data.username, peran: data.peran };
  try {
    localStorage.setItem(LS_TOKEN, data.token);
    localStorage.setItem(LS_USER, JSON.stringify(u));
  } catch { /* abaikan */ }
  return u;
}

export async function logout(): Promise<void> {
  const t = tokenMem;
  bersihkanToken();
  if (t) { try { await api('logout', { token: t }); } catch { /* sesi lokal sudah dibersihkan */ } }
}

export function ping(): Promise<{ version: string; waktu: string }> { return api('ping'); }
export function initDatabase(): Promise<{ sheets: string[] }> { return api('initDatabase'); }
export function getAllData(): Promise<AllData> { return api('getAllData'); }
export function savePengaturan(pengaturan: Partial<Pengaturan>): Promise<unknown> { return api('savePengaturan', { pengaturan }); }
export function saveSiswa(item: Partial<Siswa> & { id?: string }): Promise<{ id: string; nomorKartu: string }> { return api('saveSiswa', item); }
export function deleteSiswa(id: string): Promise<unknown> { return api('deleteSiswa', { id }); }
export function importSiswa(rows: Partial<Siswa>[]): Promise<{ ditambah: number; dilewati: { baris: number; nama: string; alasan: string }[] }> { return api('importSiswa', { rows }); }
export function uploadFile(jenis: string, dataBase64: string, mimeType: string, namaFile?: string): Promise<{ url: string; fileId: string }> { return api('uploadFile', { jenis, dataBase64, mimeType, namaFile }); }
export function savePengguna(item: { id?: string; nama: string; username: string; peran: string; password?: string; aktif?: number }): Promise<{ id: string }> { return api('savePengguna', item); }
export function deletePengguna(id: string): Promise<unknown> { return api('deletePengguna', { id }); }
export function resetPassword(id: string, passwordBaru: string): Promise<unknown> { return api('resetPassword', { id, passwordBaru }); }
export function tandaiCetak(ids: string[]): Promise<{ jumlah: number }> { return api('tandaiCetak', { ids }); }
export function verifyKartu(kode: string): Promise<HasilVerifikasi> { return api('verifyKartu', { kode }); }
export function backupData(): Promise<AllData> { return api('backupData'); }

/** URL halaman verifikasi (dipakai QR). Hash-route agar SPA tetap bisa dibuka. */
export function urlVerifikasi(nomorKartu: string): string {
  return `${window.location.origin}${window.location.pathname}#/verifikasi?kode=${encodeURIComponent(nomorKartu)}`;
}
