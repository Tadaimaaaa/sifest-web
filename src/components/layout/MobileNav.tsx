"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Handshake, Mail, Package, Wallet } from "lucide-react";
import clsx from "clsx";

const mobileItems = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Panitia", href: "/users", icon: Users },
  { name: "Keuangan", href: "/keuangan", icon: Wallet },
  { name: "Sponsor", href: "/sponsor", icon: Handshake },
  { name: "Surat", href: "/surat", icon: Mail },
  { name: "Produk", href: "/produk", icon: Package },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden print:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] overflow-x-auto">
      <nav className="flex justify-around items-center h-16 px-2 min-w-max">
        {mobileItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center justify-center w-full h-full gap-1"
            >
              <div
                className={clsx(
                  "flex items-center justify-center w-8 h-8 rounded-full transition-all",
                  isActive ? "bg-blue-100 text-blue-600" : "text-slate-400"
                )}
              >
                <Icon className={clsx("w-5 h-5", isActive ? "stroke-[2.5px]" : "")} />
              </div>
              <span
                className={clsx(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-blue-600" : "text-slate-500"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
