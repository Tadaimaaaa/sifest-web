"use client";

import Link from "next/link";
import { BookOpen, Users, Trophy, Gamepad2, Store, ArrowRight } from "lucide-react";

const events = [
  {
    id: "mtq",
    name: "MTQ",
    description: "Musabaqah Tilawatil Qur'an",
    icon: BookOpen,
    color: "from-indigo-500 to-indigo-700",
    shadow: "shadow-indigo-500/20",
    bgLight: "bg-indigo-50",
    textColor: "text-indigo-600",
    role: "ROLE-010"
  },
  {
    id: "seminar",
    name: "Seminar Nasional",
    description: "Seminar Teknologi dan Informasi",
    icon: Users,
    color: "from-blue-500 to-blue-700",
    shadow: "shadow-blue-500/20",
    bgLight: "bg-blue-50",
    textColor: "text-blue-600",
    role: "ROLE-011"
  },
  {
    id: "futsal",
    name: "Futsal Competition",
    description: "Kompetisi Futsal Antar Mahasiswa",
    icon: Trophy,
    color: "from-green-500 to-emerald-700",
    shadow: "shadow-emerald-500/20",
    bgLight: "bg-emerald-50",
    textColor: "text-emerald-600",
    role: "ROLE-012"
  },
  {
    id: "esport",
    name: "E-Sport Competition",
    description: "Turnamen Mobile Legends & Valorant",
    icon: Gamepad2,
    color: "from-rose-500 to-pink-700",
    shadow: "shadow-rose-500/20",
    bgLight: "bg-rose-50",
    textColor: "text-rose-600",
    role: "ROLE-013"
  },
  {
    id: "bazaar",
    name: "Bazaar",
    description: "Bazaar Makanan & Minuman",
    icon: Store,
    color: "from-amber-500 to-orange-700",
    shadow: "shadow-amber-500/20",
    bgLight: "bg-amber-50",
    textColor: "text-amber-600",
    role: "ROLE-014"
  }
];

export default function EventHubPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Data Event</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pilih salah satu event di bawah ini untuk melihat dan mengelola datanya.
        </p>
      </div>

      {/* Grid of Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {events.map((event) => {
          const Icon = event.icon;
          return (
            <Link 
              key={event.id}
              href={`/event/${event.id}`}
              className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col"
            >
              {/* Decorative Background Blur */}
              <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${event.color} rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
              
              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className={`w-14 h-14 rounded-2xl ${event.bgLight} ${event.textColor} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div className={`w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors`}>
                  <ArrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                </div>
              </div>
              
              <div className="mt-auto relative z-10">
                <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-1 group-hover:text-slate-900">{event.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{event.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
