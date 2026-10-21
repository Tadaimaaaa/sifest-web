export interface BazaarTentInfo {
  id: string;
  block: string;
  label: string;
  position: string;
}

export const BAZAAR_TENTS: BazaarTentInfo[] = [
  // Blok A - Atas / Depan (9 Tenda)
  { id: "A1", block: "Blok A", position: "Atas / Depan", label: "Stand A1 - Blok A (Atas / Depan)" },
  { id: "A2", block: "Blok A", position: "Atas / Depan", label: "Stand A2 - Blok A (Atas / Depan)" },
  { id: "A3", block: "Blok A", position: "Atas / Depan", label: "Stand A3 - Blok A (Atas / Depan)" },
  { id: "A4", block: "Blok A", position: "Atas / Depan", label: "Stand A4 - Blok A (Atas / Depan)" },
  { id: "A5", block: "Blok A", position: "Atas / Depan", label: "Stand A5 - Blok A (Atas / Depan)" },
  { id: "A6", block: "Blok A", position: "Atas / Depan", label: "Stand A6 - Blok A (Atas / Depan)" },
  { id: "A7", block: "Blok A", position: "Atas / Depan", label: "Stand A7 - Blok A (Atas / Depan)" },
  { id: "A8", block: "Blok A", position: "Atas / Depan", label: "Stand A8 - Blok A (Atas / Depan)" },
  { id: "A9", block: "Blok A", position: "Atas / Depan", label: "Stand A9 - Blok A (Atas / Depan)" },

  // Blok B - Bawah / Belakang (9 Tenda)
  { id: "B1", block: "Blok B", position: "Bawah / Belakang", label: "Stand B1 - Blok B (Bawah / Belakang)" },
  { id: "B2", block: "Blok B", position: "Bawah / Belakang", label: "Stand B2 - Blok B (Bawah / Belakang)" },
  { id: "B3", block: "Blok B", position: "Bawah / Belakang", label: "Stand B3 - Blok B (Bawah / Belakang)" },
  { id: "B4", block: "Blok B", position: "Bawah / Belakang", label: "Stand B4 - Blok B (Bawah / Belakang)" },
  { id: "B5", block: "Blok B", position: "Bawah / Belakang", label: "Stand B5 - Blok B (Bawah / Belakang)" },
  { id: "B6", block: "Blok B", position: "Bawah / Belakang", label: "Stand B6 - Blok B (Bawah / Belakang)" },
  { id: "B7", block: "Blok B", position: "Bawah / Belakang", label: "Stand B7 - Blok B (Bawah / Belakang)" },
  { id: "B8", block: "Blok B", position: "Bawah / Belakang", label: "Stand B8 - Blok B (Bawah / Belakang)" },
  { id: "B9", block: "Blok B", position: "Bawah / Belakang", label: "Stand B9 - Blok B (Bawah / Belakang)" },

  // Blok C - Samping Kiri (3 Tenda)
  { id: "C1", block: "Blok C", position: "Samping Kiri", label: "Stand C1 - Blok C (Samping Kiri)" },
  { id: "C2", block: "Blok C", position: "Samping Kiri", label: "Stand C2 - Blok C (Samping Kiri)" },
  { id: "C3", block: "Blok C", position: "Samping Kiri", label: "Stand C3 - Blok C (Samping Kiri)" },

  // Blok D - Tengah Atas (6 Tenda)
  { id: "D1", block: "Blok D", position: "Tengah Atas", label: "Stand D1 - Blok D (Tengah Atas)" },
  { id: "D2", block: "Blok D", position: "Tengah Atas", label: "Stand D2 - Blok D (Tengah Atas)" },
  { id: "D3", block: "Blok D", position: "Tengah Atas", label: "Stand D3 - Blok D (Tengah Atas)" },
  { id: "D4", block: "Blok D", position: "Tengah Atas", label: "Stand D4 - Blok D (Tengah Atas)" },
  { id: "D5", block: "Blok D", position: "Tengah Atas", label: "Stand D5 - Blok D (Tengah Atas)" },
  { id: "D6", block: "Blok D", position: "Tengah Atas", label: "Stand D6 - Blok D (Tengah Atas)" },

  // Blok E - Tengah Bawah (6 Tenda)
  { id: "E1", block: "Blok E", position: "Tengah Bawah", label: "Stand E1 - Blok E (Tengah Bawah)" },
  { id: "E2", block: "Blok E", position: "Tengah Bawah", label: "Stand E2 - Blok E (Tengah Bawah)" },
  { id: "E3", block: "Blok E", position: "Tengah Bawah", label: "Stand E3 - Blok E (Tengah Bawah)" },
  { id: "E4", block: "Blok E", position: "Tengah Bawah", label: "Stand E4 - Blok E (Tengah Bawah)" },
  { id: "E5", block: "Blok E", position: "Tengah Bawah", label: "Stand E5 - Blok E (Tengah Bawah)" },
  { id: "E6", block: "Blok E", position: "Tengah Bawah", label: "Stand E6 - Blok E (Tengah Bawah)" },
];

export function getTentLocationLabel(tentId: string | null | undefined): string {
  if (!tentId || tentId === '-' || tentId === 'NONE' || tentId === 'Kosong') {
    return 'Belum Ditentukan';
  }
  const clean = tentId.trim().toUpperCase();
  return `Stand ${clean}`;
}

export function getTentBlockLabel(tentId: string | null | undefined): string {
  if (!tentId || tentId === '-' || tentId === 'NONE' || tentId === 'Kosong') {
    return '';
  }
  const clean = tentId.trim().toUpperCase();
  const found = BAZAAR_TENTS.find(t => t.id === clean);
  if (found) return `${found.block} (${found.position})`;
  return 'Area Bazaar';
}

export interface BazaarTenantFromSheet {
  id_tenda: string;
  nama_brand: string;
  pic: string;
  kontak: string | number;
  kategori?: string;
  status_bayar?: string;
}

export function cleanPhone(phone: string | number | null | undefined): string {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits.slice(-9);
}

export function cleanText(text: string | null | undefined): string {
  if (!text) return "";
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isTextSimilar(a: string | null | undefined, b: string | null | undefined): boolean {
  const ca = cleanText(a);
  const cb = cleanText(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  if (ca.includes(cb) || cb.includes(ca)) return true;

  // Toleransi typo kecil (1-2 huruf, misalnya tatilatu vs tatitatu)
  const maxLen = Math.max(ca.length, cb.length);
  const minLen = Math.min(ca.length, cb.length);
  if (Math.abs(ca.length - cb.length) > 2) return false;

  let dist = 0;
  for (let i = 0; i < minLen; i++) {
    if (ca[i] !== cb[i]) dist++;
  }
  dist += maxLen - minLen;
  return dist <= 2;
}

export function findMatchingBazaarTenant(
  tenants: BazaarTenantFromSheet[],
  criteria: {
    brandName?: string;
    picName?: string;
    whatsapp?: string;
  }
): BazaarTenantFromSheet | undefined {
  if (!Array.isArray(tenants) || tenants.length === 0) return undefined;

  const targetPhone = cleanPhone(criteria.whatsapp);
  const targetBrand = cleanText(criteria.brandName);
  const targetPic = cleanText(criteria.picName);

  // 1. Prioritas 1: Cocok nomor WhatsApp
  if (targetPhone) {
    const matchByPhone = tenants.find(t => {
      const tp = cleanPhone(t.kontak);
      return tp && (tp === targetPhone || tp.endsWith(targetPhone) || targetPhone.endsWith(tp));
    });
    if (matchByPhone) return matchByPhone;
  }

  // 2. Prioritas 2: Cocok Nama Brand / Usaha (termasuk toleransi typo)
  if (targetBrand) {
    const matchByBrand = tenants.find(t => isTextSimilar(t.nama_brand, criteria.brandName));
    if (matchByBrand) return matchByBrand;
  }

  // 3. Prioritas 3: Cocok Nama PIC
  if (targetPic) {
    const matchByPic = tenants.find(t => isTextSimilar(t.pic, criteria.picName));
    if (matchByPic) return matchByPic;
  }

  return undefined;
}

export async function fetchBazaarTenantsFromSheet(): Promise<BazaarTenantFromSheet[]> {
  try {
    const res = await fetch(
      "https://script.google.com/macros/s/AKfycbw4UVTeqWldKdfsCyfbfYBpepIjjm08PVSndA19MuCqrV30PktJ1y5-1oFD1lL2KYfgEg/exec?action=getBazaarTenants",
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (err) {
    console.error("Gagal mengambil daftar tenant dari Google Sheet:", err);
  }
  return [];
}

