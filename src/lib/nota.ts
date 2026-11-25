export type NotaFile = {
  fileData: string; // data URL (base64)
  fileName: string;
  mimeType: string;
};

/**
 * Kolom `bukti_url` di sheet bisa berisi lebih dari satu link nota
 * (dipisah baris baru). Fungsi ini mengubahnya menjadi array URL.
 */
export const splitNotaUrls = (raw: unknown): string[] => {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(/[\s|,]+/)
    .map((s) => s.trim())
    .filter((u) => /^https?:\/\//i.test(u));
};

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

const readAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar"));
    img.src = src;
  });

/**
 * Membaca file gambar lalu memperkecilnya (maks 1600px, JPEG) agar
 * banyak foto tetap ringan saat dikirim ke Apps Script.
 * Jika hasil kompresi malah lebih besar, file asli dipakai.
 */
export const readAndCompressImage = async (file: File): Promise<NotaFile> => {
  const original = await readAsDataURL(file);
  try {
    const img = await loadImage(original);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak tersedia");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const compressed = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    if (compressed.length < original.length) {
      return {
        fileData: compressed,
        fileName: file.name.replace(/\.[^.]+$/, "") + ".jpg",
        mimeType: "image/jpeg",
      };
    }
  } catch {
    // jatuh ke file asli
  }
  return { fileData: original, fileName: file.name, mimeType: file.type || "image/jpeg" };
};
