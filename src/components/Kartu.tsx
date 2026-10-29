import type { Desain, Pengaturan, Siswa } from '../types';
import { urlVerifikasi } from '../services/api';
import { fmtTanggal } from '../utils/format';

interface Props {
  siswa: Siswa;
  pengaturan: Pengaturan;
  desain: Desain;
  sisi?: 'depan' | 'belakang';
}

/** Placeholder logo — BUKAN logo resmi. Logo resmi hanya tampil bila admin mengunggahnya. */
function LogoBox({ url, label, size }: { url: string; label: string; size: number }) {
  if (url) {
    return <img src={url} alt={label} style={{ width: size, height: size, objectFit: 'contain' }} />;
  }
  return (
    <div style={{ width: size, height: size, border: '1.5px dashed #94a3b8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, color: '#64748b', textAlign: 'center', lineHeight: 1.1 }}>
      {label}
    </div>
  );
}

function FotoBox({ siswa, desain }: { siswa: Siswa; desain: Desain }) {
  const w = desain.orientasi === 'portrait' ? 26 : 22;
  const h = Math.round((w * 4) / 3);
  if (siswa.fotoUrl) {
    return <img src={siswa.fotoUrl} alt={siswa.nama} style={{ width: `${w}mm`, height: `${h}mm`, objectFit: 'cover', borderRadius: 2, border: `1px solid ${desain.warnaAksen}` }} />;
  }
  const inisial = siswa.nama.split(' ').map((k) => k[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ width: `${w}mm`, height: `${h}mm`, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#475569', borderRadius: 2, border: `1px solid ${desain.warnaAksen}` }}>
      {inisial || '?'}
    </div>
  );
}

function QrBox({ siswa, desain }: { siswa: Siswa; desain: Desain }) {
  if (!desain.qrAktif) return null;
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(urlVerifikasi(siswa.nomorKartu))}`;
  return (
    <div style={{ textAlign: 'center', lineHeight: 1 }}>
      <img src={src} alt="QR verifikasi" style={{ width: 16, height: 16, display: 'block' }} />
      <div style={{ fontSize: 5, marginTop: 1 }}>Pindai untuk verifikasi</div>
    </div>
  );
}

export function KartuDepan({ siswa, pengaturan, desain }: Props) {
  const portrait = desain.orientasi === 'portrait';
  const w = portrait ? '55mm' : '85mm';
  const h = portrait ? '85mm' : '55mm';
  const fs = desain.ukuranTeks;
  const gelap = desain.tema !== 'hijau-putih' && desain.tema !== 'minimalis';
  const warnaTeks = gelap ? '#ffffff' : '#1f2937';
  const warnaTeksRedup = gelap ? '#d1fae5' : '#475569';
  const kiri = desain.posisiLogo === 'kiri-kanan' ? pengaturan.logoKemenagUrl : pengaturan.logoMaarifUrl;
  const kanan = desain.posisiLogo === 'kiri-kanan' ? pengaturan.logoMaarifUrl : pengaturan.logoKemenagUrl;
  const labelKiri = desain.posisiLogo === 'kiri-kanan' ? 'KEMENAG' : 'MAARIF';
  const labelKanan = desain.posisiLogo === 'kiri-kanan' ? 'MAARIF' : 'KEMENAG';
  const fotoKiri = desain.posisiFoto === 'kiri';

  const foto = <FotoBox siswa={siswa} desain={desain} />;
  const info = (
    <div style={{ flex: 1, minWidth: 0, color: warnaTeks }}>
      <div style={{ fontSize: `${4.2 * fs}mm`, fontWeight: 800, lineHeight: 1.15, textTransform: 'uppercase' }}>{siswa.nama}</div>
      <div style={{ fontSize: `${3 * fs}mm`, lineHeight: 1.35, marginTop: 1 }}>
        <div><b>NIS</b> : {siswa.nis || '-'}</div>
        <div><b>NISN</b> : {siswa.nisn || '-'}</div>
        <div><b>Kelas</b> : {siswa.kelas}</div>
        <div><b>TTL</b> : {siswa.tempatLahir ? `${siswa.tempatLahir}, ` : ''}{fmtTanggal(siswa.tanggalLahir)}</div>
        <div><b>Th. Pelajaran</b> : {siswa.tahunPelajaran || pengaturan.tahunPelajaran}</div>
      </div>
    </div>
  );

  return (
    <div className="kartu" style={{ width: w, height: h, background: desain.gradasi, border: desain.bingkai ? `1.5px solid ${desain.warnaAksen}` : '1px solid #cbd5e1', borderRadius: 3, overflow: 'hidden', position: 'relative', fontFamily: 'Arial, sans-serif', flexShrink: 0 }}>
      {desain.ornamen && <div style={{ position: 'absolute', inset: 0, opacity: 0.12, background: 'repeating-linear-gradient(45deg, transparent 0 6px, #ffffff 6px 7px)', pointerEvents: 'none' }} />}
      <div style={{ position: 'relative', padding: '2.5mm 3mm', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
          <LogoBox url={kiri} label={labelKiri} size={portrait ? 28 : 32} />
          <div style={{ flex: 1, textAlign: 'center', color: warnaTeks }}>
            <div style={{ fontSize: `${4.5 * fs}mm`, fontWeight: 900, lineHeight: 1.1 }}>{pengaturan.namaMadrasah || 'MTs AL ISLAM NGLESES'}</div>
            <div style={{ fontSize: `${2.2 * fs}mm`, color: warnaTeksRedup, lineHeight: 1.2 }}>{pengaturan.alamatMadrasah}</div>
          </div>
          <LogoBox url={kanan} label={labelKanan} size={portrait ? 28 : 32} />
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.5mm' }}>
          <span style={{ background: desain.warnaAksen, color: desain.tema === 'hijau-putih' ? '#065f46' : '#111827', fontWeight: 900, fontSize: `${3.8 * fs}mm`, letterSpacing: 1.5, padding: '0.8mm 4mm', borderRadius: 2 }}>KARTU PELAJAR</span>
        </div>
        <div style={{ display: 'flex', gap: '3mm', marginTop: '2.5mm', alignItems: 'flex-start', flex: 1 }}>
          {portrait ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2mm', width: '100%' }}>
              {foto}
              <div style={{ width: '100%' }}>{info}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end' }}>
                <div style={{ fontSize: `${2.4 * fs}mm`, color: warnaTeksRedup }}>No. Kartu: <b style={{ color: warnaTeks }}>{siswa.nomorKartu}</b></div>
                <QrBox siswa={siswa} desain={desain} />
              </div>
            </div>
          ) : (
            <>
              {fotoKiri ? foto : info}
              {fotoKiri ? info : foto}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
                <QrBox siswa={siswa} desain={desain} />
                <div style={{ fontSize: `${2.2 * fs}mm`, color: warnaTeksRedup, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{siswa.nomorKartu}</div>
              </div>
            </>
          )}
        </div>
        {!portrait && <div style={{ fontSize: `${2.4 * fs}mm`, color: warnaTeksRedup }}>No. Kartu: <b style={{ color: warnaTeks }}>{siswa.nomorKartu}</b></div>}
      </div>
    </div>
  );
}

export function KartuBelakang({ siswa, pengaturan, desain }: Props) {
  const portrait = desain.orientasi === 'portrait';
  const w = portrait ? '55mm' : '85mm';
  const h = portrait ? '85mm' : '55mm';
  const fs = desain.ukuranTeks;
  return (
    <div className="kartu" style={{ width: w, height: h, background: '#ffffff', border: desain.bingkai ? `1.5px solid ${desain.warnaAksen}` : '1px solid #cbd5e1', borderRadius: 3, overflow: 'hidden', position: 'relative', fontFamily: 'Arial, sans-serif', flexShrink: 0, color: '#1f2937' }}>
      <div style={{ background: desain.warnaUtama, color: '#fff', padding: '2mm 3mm', textAlign: 'center' }}>
        <div style={{ fontSize: `${3.8 * fs}mm`, fontWeight: 800 }}>{pengaturan.namaMadrasah || 'MTs AL ISLAM NGLESES'}</div>
        <div style={{ fontSize: `${2.2 * fs}mm` }}>{pengaturan.alamatMadrasah}{pengaturan.teleponMadrasah ? ` | Telp. ${pengaturan.teleponMadrasah}` : ''}</div>
      </div>
      <div style={{ padding: '2.5mm 3mm', fontSize: `${2.8 * fs}mm`, lineHeight: 1.4 }}>
        <div><b>Nama</b> : {siswa.nama} &nbsp;|&nbsp; <b>Kelas</b> : {siswa.kelas} &nbsp;|&nbsp; <b>No. Kartu</b> : {siswa.nomorKartu}</div>
        {siswa.alamat && <div><b>Alamat siswa</b> : {siswa.alamat}</div>}
        <div style={{ marginTop: '1mm' }}><b>Tata tertib singkat:</b> Kartu ini milik pemegang yang namanya tercantum; wajib dibawa saat di madrasah; bila hilang segera lapor ke madrasah; kartu tidak boleh dipinjamkan kepada orang lain; kartu yang ditemukan harap dikembalikan ke madrasah.</div>
        <div style={{ marginTop: '1mm' }}>Diterbitkan: {fmtTanggal(siswa.tanggalTerbit) === '-' ? '(tanggal terbit diisi saat kartu ditandai sudah dicetak)' : fmtTanggal(siswa.tanggalTerbit)}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2mm' }}>
          <div style={{ width: '28mm', height: '16mm', border: '1.5px dashed #94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, color: '#64748b', textAlign: 'center' }}>
            {pengaturan.stempelUrl ? <img src={pengaturan.stempelUrl} alt="Stempel" style={{ maxWidth: '26mm', maxHeight: '14mm', objectFit: 'contain' }} /> : 'Ruang Stempel'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: `${2.4 * fs}mm` }}>Kepala Madrasah</div>
            {pengaturan.ttdUrl ? <img src={pengaturan.ttdUrl} alt="Tanda tangan" style={{ height: 12, objectFit: 'contain' }} /> : <div style={{ height: 12 }} />}
            <div style={{ fontWeight: 700, borderTop: '1px solid #111', paddingTop: 1 }}>{pengaturan.kepalaMadrasah || 'Mustaghfirin, S.E.'}</div>
          </div>
          <QrBox siswa={siswa} desain={desain} />
        </div>
      </div>
    </div>
  );
}
