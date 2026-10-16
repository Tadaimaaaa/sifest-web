export interface BazaarTentInfo {
  id: string;
  block: string;
  label: string;
  position: string;
}

export const BAZAAR_TENTS: BazaarTentInfo[] = [
  // Blok A - Atas / Depan (8 Tenda)
  { id: "A1", block: "Blok A", position: "Atas / Depan", label: "Stand A1 - Blok A (Atas / Depan)" },
  { id: "A2", block: "Blok A", position: "Atas / Depan", label: "Stand A2 - Blok A (Atas / Depan)" },
  { id: "A3", block: "Blok A", position: "Atas / Depan", label: "Stand A3 - Blok A (Atas / Depan)" },
  { id: "A4", block: "Blok A", position: "Atas / Depan", label: "Stand A4 - Blok A (Atas / Depan)" },
  { id: "A5", block: "Blok A", position: "Atas / Depan", label: "Stand A5 - Blok A (Atas / Depan)" },
  { id: "A6", block: "Blok A", position: "Atas / Depan", label: "Stand A6 - Blok A (Atas / Depan)" },
  { id: "A7", block: "Blok A", position: "Atas / Depan", label: "Stand A7 - Blok A (Atas / Depan)" },
  { id: "A8", block: "Blok A", position: "Atas / Depan", label: "Stand A8 - Blok A (Atas / Depan)" },

  // Blok B - Bawah / Belakang (8 Tenda)
  { id: "B1", block: "Blok B", position: "Bawah / Belakang", label: "Stand B1 - Blok B (Bawah / Belakang)" },
  { id: "B2", block: "Blok B", position: "Bawah / Belakang", label: "Stand B2 - Blok B (Bawah / Belakang)" },
  { id: "B3", block: "Blok B", position: "Bawah / Belakang", label: "Stand B3 - Blok B (Bawah / Belakang)" },
  { id: "B4", block: "Blok B", position: "Bawah / Belakang", label: "Stand B4 - Blok B (Bawah / Belakang)" },
  { id: "B5", block: "Blok B", position: "Bawah / Belakang", label: "Stand B5 - Blok B (Bawah / Belakang)" },
  { id: "B6", block: "Blok B", position: "Bawah / Belakang", label: "Stand B6 - Blok B (Bawah / Belakang)" },
  { id: "B7", block: "Blok B", position: "Bawah / Belakang", label: "Stand B7 - Blok B (Bawah / Belakang)" },
  { id: "B8", block: "Blok B", position: "Bawah / Belakang", label: "Stand B8 - Blok B (Bawah / Belakang)" },

  // Blok C - Samping Kiri (2 Tenda)
  { id: "C1", block: "Blok C", position: "Samping Kiri", label: "Stand C1 - Blok C (Samping Kiri)" },
  { id: "C2", block: "Blok C", position: "Samping Kiri", label: "Stand C2 - Blok C (Samping Kiri)" },

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
  const found = BAZAAR_TENTS.find(t => t.id === clean);
  if (found) return found.label;
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
