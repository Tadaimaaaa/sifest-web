import Image from "next/image";

interface FullPageLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export default function FullPageLoader({ message = "Memproses...", fullScreen = true }: FullPageLoaderProps) {
  return (
    <div className={`${fullScreen ? "fixed inset-0 z-[200]" : "absolute inset-0 z-50 rounded-2xl"} flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-300`}>
      <div className="relative animate-in zoom-in-95 duration-500">
        <Image
          src="/logo-sifest.png"
          alt="Loading"
          width={120}
          height={120}
          className="object-contain drop-shadow-sm animate-pulse duration-700"
          priority
        />
      </div>
      <div className="mt-8 flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce"></div>
        </div>
        <p className="text-[11px] font-bold text-slate-500 tracking-widest uppercase animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}
