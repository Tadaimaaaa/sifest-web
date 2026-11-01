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
// 1. EXTRACT ROBUST BIOMETRIC VECTOR (FAST & HIGH-DISCRIMINATION)
// -------------------------------------------------------------
// Menggunakan Zero-Mean Normalized Facial Grid (32x32 = 1024 titik)
// + Normalized Sobel Edge Contour Gradient (30x30 = 900 titik)
// Total: 1924 dimensi vektor biometrik.
// Tahan terhadap variasi pencahayaan, kontras, dan pergeseran wajar.
export function extractRobustFaceFeatures(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  customCrop?: { x: number; y: number; width: number; height: number },
  isMirrored = false
): number[] | null {
  try {
    const size = 32;
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

      // Area oval wajah: 65% lebar x 75% tinggi di tengah
      sw = Math.round(minDim * 0.65);
      sh = Math.round(minDim * 0.75);
      sx = Math.round((srcW - sw) / 2);
      sy = Math.round((srcH - sh) / 2);
    }

    if (isMirrored) {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size).data;
    const numPixels = size * size;
    const lums = new Float32Array(numPixels);

    // 1. Grayscale Luminance
    let sumLums = 0;
    for (let i = 0; i < numPixels; i++) {
      const idx = i * 4;
      const lum = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
      lums[i] = lum;
      sumLums += lum;
    }

    // 2. Zero-Mean & Unit Variance Standardization (Lighting-Invariant)
    const meanLums = sumLums / numPixels;
    let variance = 0;
    for (let i = 0; i < numPixels; i++) {
      const diff = lums[i] - meanLums;
      variance += diff * diff;
    }
    const stdLums = Math.sqrt(variance / numPixels) || 1;

    const gradPoints = (size - 2) * (size - 2);
    const totalDim = numPixels + gradPoints;
    const features = new Float32Array(totalDim);
    let fIdx = 0;

    // Feature Part 1: Standardized Pixel Grid (1024)
    for (let i = 0; i < numPixels; i++) {
      features[fIdx++] = (lums[i] - meanLums) / stdLums;
    }

    // Feature Part 2: Normalized Sobel Edge Contour (900)
    let sumGrad = 0;
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const idx = y * size + x;
        const dx = lums[idx + 1] - lums[idx - 1];
        const dy = lums[idx + size] - lums[idx - size];
        const mag = Math.sqrt(dx * dx + dy * dy);
        sumGrad += mag;
      }
    }
    const meanGrad = sumGrad / gradPoints;

    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const idx = y * size + x;
        const dx = lums[idx + 1] - lums[idx - 1];
        const dy = lums[idx + size] - lums[idx - size];
        const mag = Math.sqrt(dx * dx + dy * dy);
        features[fIdx++] = (mag - meanGrad) / 32.0;
      }
    }

    // 3. Final L2 Normalization
    let normSq = 0;
    for (let i = 0; i < totalDim; i++) {
      normSq += features[i] * features[i];
    }
    const l2Norm = Math.sqrt(normSq) || 1;
    const result: number[] = new Array(totalDim);
    for (let i = 0; i < totalDim; i++) {
      result[i] = features[i] / l2Norm;
    }

    return result;
  } catch (e) {
    console.error("Feature extraction error:", e);
    return null;
  }
}

// Ekstrak kandidat vektor multi-skala & pergeseran agar tahan jarak kepala & pergerakan
export function extractMultiScaleBiometricVectors(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  isMirrored = false
): number[][] {
  const vectors: number[][] = [];
  const srcW = (source as any).videoWidth || source.width || 640;
  const srcH = (source as any).videoHeight || source.height || 480;
  const minDim = Math.min(srcW, srcH);

  const configs = [
    { scaleW: 0.65, scaleH: 0.75, offY: 0 },
    { scaleW: 0.58, scaleH: 0.68, offY: 0 },
    { scaleW: 0.72, scaleH: 0.82, offY: 0 },
    { scaleW: 0.65, scaleH: 0.75, offY: -0.03 },
  ];

  for (const cfg of configs) {
    const sw = Math.round(minDim * cfg.scaleW);
    const sh = Math.round(minDim * cfg.scaleH);
    const sx = Math.round((srcW - sw) / 2);
    const sy = Math.round((srcH - sh) / 2 + (minDim * cfg.offY));
    const vec = extractRobustFaceFeatures(source, { x: sx, y: sy, width: sw, height: sh }, isMirrored);
    if (vec) vectors.push(vec);
  }

  return vectors;
}

// -------------------------------------------------------------
// 2. HITUNG KEMIRIPAN BIOMETRIK (HIGH DYNAMIC RANGE & HIGH SEPARATION)
// -------------------------------------------------------------
export function computeBiometricMatch(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  const len = vecA.length;
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
  }

  // Kalibrasi Zero-Mean Cosine Similarity:
  // - Orang berbeda: dot umumnya <= 0.25 (skor 0% .. 30%)
  // - Orang yang sama: dot umumnya >= 0.50 (skor 65% .. 100%)
  if (dot <= 0.10) return 0;
  if (dot < 0.40) {
    return Math.round(((dot - 0.10) / 0.30) * 45); // 0% .. 45%
  }
  const score = Math.round(50 + ((dot - 0.40) / 0.40) * 50); // 50% .. 100%
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
    if (Array.isArray(profile.vector) && profile.vector.length === 1924) {
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


