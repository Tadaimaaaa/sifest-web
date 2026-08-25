"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, User, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    remember: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      toast.error("Mohon isi username dan password Anda.");
      return;
    }

    setIsLoading(true);
    try {
      // Ambil SCRIPT_URL dari konfigurasi api.ts agar tersentralisasi
      const { SCRIPT_URL } = await import('@/lib/api');
      const Cookies = (await import('js-cookie')).default;
      
      const response = await fetch(`${SCRIPT_URL}?action=login`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal terhubung ke server (Network Error)");
      }

      const resData = await response.json();

      if (resData.success) {
        // Simpan token dan data user ke Cookie
        const expiry = formData.remember ? 7 : 1; 
        Cookies.set("session_token", resData.data.token, { expires: expiry });
        Cookies.set("user_data", JSON.stringify(resData.data.user), { expires: expiry });
        
        toast.success("Login berhasil! Selamat datang di SI FEST.");
        router.push("/dashboard");
      } else {
        toast.error(resData.message || "Username atau password salah!");
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan sistem. Silakan coba lagi nanti.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-50">
      {/* Light Theme Dynamic Background Elements */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 blur-[120px] rounded-full mix-blend-multiply pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-yellow-400/20 blur-[120px] rounded-full mix-blend-multiply pointer-events-none animate-pulse delay-1000" />
      
      <div className="relative w-full max-w-md px-6 py-12 mx-auto">
        {/* Light Glassmorphism Card */}
        <div className="bg-white/70 backdrop-blur-xl border border-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-8 transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] duration-500">
          
          {/* Header Section */}
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative w-28 h-28 drop-shadow-md transform hover:scale-105 transition-transform duration-300">
              {/* Fallback to text if logo is not placed yet, otherwise use the image */}
              <img 
                src="/logo.png" 
                alt="SI FEST Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback if image doesn't exist yet in public folder
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%231d4ed8'/%3E%3Ctext x='50' y='55' font-family='sans-serif' font-size='24' font-weight='bold' fill='%23facc15' text-anchor='middle'%3ESI FEST%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">SI FEST</h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">Management System</p>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Username / NIM</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-blue-600 transition-colors">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full pl-11 pr-4 py-3 bg-white/80 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-sm"
                  placeholder="Masukkan NIM Anda"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-blue-600 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-11 pr-12 py-3 bg-white/80 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-sm"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm mt-1">
              <label className="flex items-center gap-2 cursor-pointer group/checkbox">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={formData.remember}
                    onChange={handleInputChange}
                    className="peer sr-only"
                    disabled={isLoading}
                  />
                  <div className="w-5 h-5 rounded border border-slate-300 bg-white peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center shadow-sm">
                    <svg
                      className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-slate-600 font-medium group-hover/checkbox:text-slate-800 transition-colors">Ingat Sesi</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-3 w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] flex items-center justify-center gap-2 transform hover:-translate-y-[1px] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Masuk Sistem</span>
                  <LogIn className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
          
          <div className="text-center mt-[-5px]">
             <p className="text-xs text-slate-400 font-medium">© 2026 SI FEST. Restricted Internal System.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
