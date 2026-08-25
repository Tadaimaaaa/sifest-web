import axios from "axios";
import Cookies from "js-cookie";

// Ganti URL ini dengan URL Web App (Deployment) Google Apps Script Anda nanti
export const SCRIPT_URL = process.env.NEXT_PUBLIC_API_URL || "https://script.google.com/macros/s/AKfycbzoAvxRHV7jzm3AZstFIocKRNa1b_aFKppF4kt1CUfY_Ylw-oSkUiGOzKalR18eI2L5Qg/exec";

export const api = axios.create({
  baseURL: SCRIPT_URL,
  headers: {
    // Apps Script sering kali membutuhkan text/plain untuk melewati preflight CORS saat POST JSON
    "Content-Type": "text/plain;charset=utf-8",
  },
});

// Interceptor untuk menyisipkan token otomatis ke setiap request
api.interceptors.request.use((config) => {
  const token = Cookies.get("session_token");
  if (token) {
    // Karena API endpoint Apps Script hanya satu URL, kita oper token via body atau query parameter
    // Untuk method GET, kita masukkan ke params
    if (config.method === 'get') {
      config.params = { ...config.params, token };
    } 
    // Untuk method POST/PUT, kita masukkan ke body (data)
    else if (config.data) {
      if (typeof config.data === 'string') {
        const parsed = JSON.parse(config.data);
        parsed.token = token;
        config.data = JSON.stringify(parsed);
      } else {
        config.data.token = token;
      }
    } else {
      config.data = JSON.stringify({ token });
    }
  }
  return config;
}, (error) => Promise.reject(error));

// Interceptor response untuk error handling terpusat
api.interceptors.response.use(
  (response) => {
    // Apps Script selalu mengembalikan HTTP 200, status asli ada di payload json
    const data = response.data;
    if (data && data.success === false) {
      if (data.code === 'UNAUTHORIZED' || data.code === 'FORBIDDEN') {
        // Handle token expired / akses ditolak
        if (typeof window !== "undefined") {
          Cookies.remove("session_token");
          Cookies.remove("user_data");
          window.location.href = "/login";
        }
      }
      return Promise.reject(new Error(data.message || "Terjadi kesalahan API"));
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Fetcher untuk SWR
export const fetcher = async (url: string) => {
  const token = Cookies.get("session_token");
  const fullUrl = url.includes("?") 
    ? `${SCRIPT_URL}${url}&token=${token}` 
    : `${SCRIPT_URL}${url}?token=${token}`;
    
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error("Gagal mengambil data");
  
  const data = await res.json();
  if (data.success === false) {
    throw new Error(data.message || "Gagal mengambil data");
  }
  return data;
};
