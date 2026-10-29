"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMA_PRESET = exports.DESAIN_DEFAULT = void 0;
exports.parseDesain = parseDesain;
exports.desainEfektif = desainEfektif;
exports.DESAIN_DEFAULT = {
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
exports.TEMA_PRESET = {
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
function parseDesain(p) {
    if (!p || !p.desainJson)
        return { ...exports.DESAIN_DEFAULT };
    try {
        const d = JSON.parse(p.desainJson);
        return { ...exports.DESAIN_DEFAULT, ...d };
    }
    catch {
        return { ...exports.DESAIN_DEFAULT };
    }
}
function desainEfektif(p) {
    const d = parseDesain(p);
    // Toggle global di Pengaturan mengalahkan toggle desain untuk QR.
    if (p && p.qrAktif === '0')
        d.qrAktif = false;
    return d;
}
