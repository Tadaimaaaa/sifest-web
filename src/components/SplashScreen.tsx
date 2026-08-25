"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Tahan splash screen selama 1.5 detik
    const timer = setTimeout(() => {
      setIsFading(true); // Mulai animasi fade-out
      // Hapus dari DOM setelah animasi selesai (500ms)
      setTimeout(() => setIsVisible(false), 500);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ease-in-out ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative animate-in zoom-in-75 duration-700 ease-out">
        <Image
          src="/logo-sifest.png"
          alt="SI FEST Logo"
          width={180}
          height={180}
          className="object-contain drop-shadow-sm animate-pulse duration-1000"
          priority
        />
      </div>
      <div className="absolute bottom-10 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
        </div>
        <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase">
          SI FEST Management
        </p>
      </div>
    </div>
  );
}
