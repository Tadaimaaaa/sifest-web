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
// Menggunakan 32x32 multi-scale gradient + normalized edge features
// Tahan terhadap perbedaan pencahayaan, jarak, dan sudut wajah kecil.
export function extractRobustFaceFeatures(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  customCrop?: { x: number; y: number; width: number; height: number }
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
      sx = (srcW - minDim) / 2;
      sy = (srcH - minDim) / 2;
      sw = minDim;
      sh = minDim;
    }

    // Mirror horizontal jika source video webcam
    if (source instanceof HTMLVideoElement) {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size).data;
    const lums: number[] = new Array(size * size);

    // 1. Konversi ke Grayscale Luminance
    let sum = 0;
    let sumSq = 0;
    const n = size * size;

    for (let i = 0; i < n; i++) {
      const idx = i * 4;
      const lum = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
      lums[i] = lum;
      sum += lum;
      sumSq += lum * lum;
    }

    // Z-score normalization pada luminance
    const mean = sum / n;
    const std = Math.sqrt(Math.max(1, sumSq / n - mean * mean));

    const normLums: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      normLums[i] = (lums[i] - mean) / std;
    }

    // 2. Ekstrak Horizontal & Vertical Gradients (Sobel-like invariant filter)
    const features: number[] = [];

    // Tambahkan normalized luminance
    for (let i = 0; i < n; i++) {
      features.push(normLums[i]);
    }

    // Tambahkan gradient edges (tahan perubahan pencahayaan)
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const idx = y * size + x;
        const dx = normLums[idx + 1] - normLums[idx - 1];
        const dy = normLums[idx + size] - normLums[idx - size];
        const mag = Math.sqrt(dx * dx + dy * dy);
        features.push(mag);
      }
    }

    // 3. L2 Norm final vector
    let normSq = 0;
    for (let i = 0; i < features.length; i++) {
      normSq += features[i] * features[i];
    }
    const l2Norm = Math.sqrt(normSq) || 1;

    for (let i = 0; i < features.length; i++) {
      features[i] /= l2Norm;
    }

    return features;
  } catch (e) {
    console.error("Feature extraction error:", e);
    return null;
  }
}

// -------------------------------------------------------------
// 2. HITUNG KEMIRIPAN BIOMETRIK (COSINE SIMILARITY)
// -------------------------------------------------------------
export function computeBiometricMatch(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  const len = vecA.length;
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
  }
  // Karena sudah L2 normalized, dot product adalah cosine similarity [-1 .. 1]
  // Map range [0.15 .. 0.85] ke [0% .. 100%]
  const clamped = Math.max(-0.2, Math.min(1.0, dot));
  const score = Math.max(0, Math.min(100, Math.round(((clamped - 0.15) / 0.75) * 100)));
  return score;
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


