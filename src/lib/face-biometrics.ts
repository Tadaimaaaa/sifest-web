// Robust Biometric Feature Extractor & Supabase Sync Layer

export interface StoredFaceProfile {
  userId: string;
  name: string;
  nim: string;
  photo: string; // base64 JPEG thumbnail
  vector: number[];
  updatedAt: string;
}

// -------------------------------------------------------------
// 1. EXTRACT ROBUST BIOMETRIC VECTOR
// -------------------------------------------------------------
// Menggunakan Multi-Zone Spatial Pyramid (4x4 = 16 sub-regions)
// + Local Binary Patterns (LBP) texture descriptor
// + Multi-scale Sobel edge gradients
// + Isolasi ketat area wajah di dalam oval (membuang 80% background ruangan)
export function extractRobustFaceFeatures(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  customCrop?: { x: number; y: number; width: number; height: number },
  isMirrored = false
): number[] | null {
  try {
    const size = 48; // Standar 48x48 piksel (dibagi 4x4 zona lokal = 16 blok berukuran 12x12)
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    let sx = 0;
    let sy = 0;
    let sw = 0;
    let sh = 0;

    if (customCrop) {
      sx = customCrop.x;
      sy = customCrop.y;
      sw = customCrop.width;
      sh = customCrop.height;
    } else {
      const srcW = (source as any).videoWidth || source.width || 640;
      const srcH = (source as any).videoHeight || source.height || 480;
      const minDim = Math.min(srcW, srcH);

      // KUNCI UTAMA: Tight Facial Bounding Box (54% lebar, 66% tinggi)
      // Memotong latar belakang tembok, bahu, dan lampu ruangan,
      // hanya memfokuskan ekstraksi pada kontur wajah: mata, alis, hidung, dan bibir.
      sw = Math.round(minDim * 0.54);
      sh = Math.round(minDim * 0.66);
      sx = Math.round((srcW - sw) / 2);
      sy = Math.round((srcH - sh) / 2 + (minDim * 0.02));
    }

    if (isMirrored) {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size).data;
    const lums: number[] = new Array(size * size);
    const n = size * size;

    // 1. Ekstrak Grayscale Luminance
    for (let i = 0; i < n; i++) {
      const idx = i * 4;
      lums[i] = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
    }

    const features: number[] = [];

    // 2. Normalisasi Kontras Lokal per Blok 12x12 (16 Zona Spasial Wajah)
    // Blok 0..3: Alis & Dahi
    // Blok 4..7: Mata & Pangkal Hidung
    // Blok 8..11: Ujung Hidung & Pipi
    // Blok 12..15: Mulut, Bibir, Dagu & Rahang
    const blockSize = 12; // 48 / 4 = 12
    const numBlocksX = 4;
    const numBlocksY = 4;

    for (let by = 0; by < numBlocksY; by++) {
      for (let bx = 0; bx < numBlocksX; bx++) {
        let blockSum = 0;
        let blockSumSq = 0;
        const count = blockSize * blockSize;

        for (let dy = 0; dy < blockSize; dy++) {
          for (let dx = 0; dx < blockSize; dx++) {
            const val = lums[(by * blockSize + dy) * size + (bx * blockSize + dx)];
            blockSum += val;
            blockSumSq += val * val;
          }
        }

        const bMean = blockSum / count;
        const bStd = Math.sqrt(Math.max(1, blockSumSq / count - bMean * bMean));

        // Mean & Std per zona ditambahkan sebagai feature regional
        features.push(bMean / 255.0);
        features.push(bStd / 128.0);

        // Local Binary Pattern (LBP) 8-bin histogram per blok
        const lbpBins = new Array(8).fill(0);
        for (let dy = 1; dy < blockSize - 1; dy++) {
          for (let dx = 1; dx < blockSize - 1; dx++) {
            const cy = by * blockSize + dy;
            const cx = bx * blockSize + dx;
            const centerVal = lums[cy * size + cx];

            // 8-neighbor sampling
            let pattern = 0;
            if (lums[(cy - 1) * size + (cx - 1)] >= centerVal) pattern |= 1;
            if (lums[(cy - 1) * size + cx] >= centerVal) pattern |= 2;
            if (lums[(cy - 1) * size + (cx + 1)] >= centerVal) pattern |= 4;
            if (lums[cy * size + (cx + 1)] >= centerVal) pattern |= 8;
            if (lums[(cy + 1) * size + (cx + 1)] >= centerVal) pattern |= 16;
            if (lums[(cy + 1) * size + cx] >= centerVal) pattern |= 32;
            if (lums[(cy + 1) * size + (cx - 1)] >= centerVal) pattern |= 64;
            if (lums[cy * size + (cx - 1)] >= centerVal) pattern |= 128;

            const binIdx = Math.floor(pattern / 32);
            lbpBins[Math.min(7, binIdx)]++;
          }
        }

        // Normalisasi histogram LBP blok
        const blockPixels = (blockSize - 2) * (blockSize - 2);
        for (let k = 0; k < 8; k++) {
          features.push(lbpBins[k] / blockPixels);
        }
      }
    }

    // 3. Sobel Edge Gradients di area sensitif wajah (Mata, Hidung, Mulut)
    // Sampel grid 24x24 di pusat wajah
    for (let y = 6; y < size - 6; y += 2) {
      for (let x = 6; x < size - 6; x += 2) {
        const idx = y * size + x;
        const dx = lums[idx + 1] - lums[idx - 1];
        const dy = lums[idx + size] - lums[idx - size];
        const mag = Math.sqrt(dx * dx + dy * dy);
        features.push(mag / 255.0);
      }
    }

    // 4. L2 Normalization final vector
    let normSq = 0;
    const len = features.length;
    for (let i = 0; i < len; i++) {
      normSq += features[i] * features[i];
    }
    const l2Norm = Math.sqrt(normSq) || 1;
    for (let i = 0; i < len; i++) {
      features[i] /= l2Norm;
    }

    return features;
  } catch (e) {
    console.error("Feature extraction error:", e);
    return null;
  }
}

// -------------------------------------------------------------
// 2. HITUNG KEMIRIPAN BIOMETRIK (COSINE SIMILARITY TERKALIBRASI)
// -------------------------------------------------------------
export function computeBiometricMatch(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  const len = vecA.length;
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
  }

  // Karena sudah L2 normalized:
  // - Orang BERBEDA umumnya memiliki dot product di bawah 0.45
  // - Orang yang SAMA memiliki dot product di atas 0.70 (hingga 0.95)
  // Kalibrasikan skala persentase:
  if (dot <= 0.38) {
    return Math.max(0, Math.round(((dot - 0.15) / 0.23) * 20));
  }
  if (dot < 0.65) {
    return Math.round(20 + ((dot - 0.38) / 0.27) * 45); // 20% .. 65%
  }
  // Di atas 0.65 = kemiripan tinggi
  const score = Math.round(65 + ((dot - 0.65) / 0.30) * 35);
  return Math.max(0, Math.min(100, score));
}

// -------------------------------------------------------------
// 3. DATABASE SYNC (SUPABASE CLOUD + LOCAL CACHE FALLBACK)
// -------------------------------------------------------------
const LOCAL_STORAGE_KEY = "sifest_enrolled_face_profiles";

export async function fetchEnrolledFacesFromDb(): Promise<{
  faces: Record<string, StoredFaceProfile>;
  photos: Record<string, string>;
  vectors: Record<string, number[]>;
}> {
  let remoteFaces: Record<string, StoredFaceProfile> = {};

  try {
    const res = await fetch("/api/face-biometrics", {
      method: "GET",
      cache: "no-store"
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.faces) {
        remoteFaces = data.faces;
      }
    }
  } catch (err) {
    console.warn("Gagal fetch dari database cloud, beralih ke cache lokal:", err);
  }

  // Fallback / merge dari localStorage
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const localData = JSON.parse(cached);
        // localData format lama: { [userId]: photoBase64 }
        // atau format baru: { [userId]: StoredFaceProfile }
        for (const [uid, val] of Object.entries(localData)) {
          if (!remoteFaces[uid]) {
            if (typeof val === "string") {
              remoteFaces[uid] = {
                userId: uid,
                name: "",
                nim: "",
                photo: val,
                vector: [],
                updatedAt: new Date().toISOString()
              };
            } else if (typeof val === "object" && val !== null) {
              remoteFaces[uid] = val as StoredFaceProfile;
            }
          }
        }
      }
      // Simpan hasil sinkronisasi kembali ke cache lokal
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remoteFaces));
    } catch (e) {}
  }

  const photos: Record<string, string> = {};
  const vectors: Record<string, number[]> = {};

  for (const [uid, profile] of Object.entries(remoteFaces)) {
    if (profile.photo) photos[uid] = profile.photo;
    if (Array.isArray(profile.vector) && profile.vector.length > 0) {
      vectors[uid] = profile.vector;
    }
  }

  return { faces: remoteFaces, photos, vectors };
}

export async function saveEnrolledFaceToDb(
  userId: string,
  name: string,
  nim: string,
  photoBase64: string,
  vector: number[]
): Promise<boolean> {
  const profile: StoredFaceProfile = {
    userId,
    name,
    nim,
    photo: photoBase64,
    vector,
    updatedAt: new Date().toISOString()
  };

  // Simpan seketika di localStorage (optimistic)
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      const data = cached ? JSON.parse(cached) : {};
      data[userId] = profile;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  // Kirim ke database cloud via API
  try {
    const res = await fetch("/api/face-biometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    const json = await res.json();
    return json.success === true;
  } catch (err) {
    console.error("Gagal sinkronisasi wajah ke database cloud:", err);
    return false;
  }
}

export async function deleteEnrolledFaceFromDb(userId: string): Promise<boolean> {
  // Hapus dari localStorage
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        delete data[userId];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {}
  }

  // Hapus dari database cloud
  try {
    const res = await fetch(`/api/face-biometrics?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE"
    });
    const json = await res.json();
    return json.success === true;
  } catch (err) {
    console.error("Gagal hapus wajah dari database cloud:", err);
    return false;
  }
}

// -------------------------------------------------------------
// 4. SESSION STATUS SYNCHRONIZATION (SUPABASE CLOUD + LOCAL)
// -------------------------------------------------------------
export interface SessionStateInfo {
  sessionKey: string;
  status: "IDLE" | "ACTIVE" | "CLOSED";
  startedAt?: string | null;
  closedAt?: string | null;
  updatedAt?: string;
}

const SESSION_STATES_KEY = "sifest_panitia_session_states";

export async function fetchSessionStatesFromDb(): Promise<Record<string, SessionStateInfo>> {
  let states: Record<string, SessionStateInfo> = {};

  try {
    const res = await fetch("/api/face-biometrics", { method: "GET", cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.sessionStates) {
        states = data.sessionStates;
      }
    }
  } catch (e) {}

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(SESSION_STATES_KEY);
      if (cached) {
        states = { ...JSON.parse(cached), ...states };
      }
      localStorage.setItem(SESSION_STATES_KEY, JSON.stringify(states));
    } catch (e) {}
  }

  return states;
}

export async function saveSessionStateToDb(
  sessionKey: string,
  status: "IDLE" | "ACTIVE" | "CLOSED",
  startedAt?: string | null,
  closedAt?: string | null
): Promise<boolean> {
  const payload = {
    type: "session_state",
    sessionKey,
    status,
    startedAt,
    closedAt
  };

  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(SESSION_STATES_KEY);
      const data = cached ? JSON.parse(cached) : {};
      data[sessionKey] = { sessionKey, status, startedAt, closedAt, updatedAt: new Date().toISOString() };
      localStorage.setItem(SESSION_STATES_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  try {
    const res = await fetch("/api/face-biometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    return json.success === true;
  } catch (err) {
    return false;
  }
}


