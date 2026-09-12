"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Gamepad2, Save, Edit3, User, Phone, MapPin, CalendarDays, Activity, Trash2, Plus, Trophy, Info, Users } from "lucide-react";
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import FullPageLoader from "@/components/FullPageLoader";
import { getFutsalRegistrations, saveBracket, getBracket } from "../actions";
import { Loader2, Shuffle, Maximize, Minimize } from "lucide-react";
import { useParams } from "next/navigation";
import Swal from "sweetalert2";

type Team = {
  id_tim: string;
  nama_tim: string;
  kapten: string;
  kontak: string;
  status_bayar: string;
};

type GroupMatch = {
  id: string;
  groupId: number; // 0=A, 1=B, 2=C, 3=D
  team1Index: number;
  team2Index: number;
  score1: number | null;
  score2: number | null;
};

type KnockoutMatch = {
  id: string;
  round: number;
  matchIndex: number;
  score1: number | null;
  score2: number | null;
  pen1: number | null;
  pen2: number | null;
};

type EventData = {
  id_event: string;
  nama_event: string;
  tanggal: string;
  tempat: string;
  deskripsi: string;
  status: string;
};

export default function FutsalDashboard() {
  const params = useParams();
  const category = params.category as string;
  const gameSlug = category === 'sma' ? 'turnamen-futsal-slta' : 'turnamen-futsal-umum';

  const [currentUserRole, setCurrentUserRole] = useState("ROLE-001");
  const [isLoading, setIsLoading] = useState(true);
  
  // EVENT STATE
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventData, setEventData] = useState<EventData>({
    id_event: "futsal",
    nama_event: category === 'sma' ? "Futsal Tingkat SMA/Sederajat" : "Futsal Mahasiswa/Umum",
    tanggal: "",
    tempat: "",
    deskripsi: "",
    status: "Akan Datang"
  });
  const [formDataEvent, setFormDataEvent] = useState<EventData>(eventData);

  // TEAM STATE (Read Only)
  const [teams, setTeams] = useState<Team[]>([]);
  
  // BRACKET STATE
  const [shuffledTeams, setShuffledTeams] = useState<(Team | null)[]>(Array(16).fill(null));
  const [quarterFinals, setQuarterFinals] = useState<(Team | null)[]>(Array(8).fill(null));
  const [semiFinals, setSemiFinals] = useState<(Team | null)[]>(Array(4).fill(null));
  const [finals, setFinals] = useState<(Team | null)[]>(Array(2).fill(null));
  const [champion, setChampion] = useState<Team | null>(null);
  const [eliminatedTeams, setEliminatedTeams] = useState<Set<string>>(new Set());
  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>([]);
  const [knockoutMatches, setKnockoutMatches] = useState<KnockoutMatch[]>([]);

  const [isSpinning, setIsSpinning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const bracketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userDataStr = Cookies.get("user_data");
    if (userDataStr) {
      try {
        const user = JSON.parse(userDataStr);
        setCurrentUserRole(user.role_id || user.role || "");
      } catch (e) {}
    }
    fetchData();
  }, []);

  const hasAccess = ["ROLE-001", "SUPER_ADMIN", "ROLE-013"].includes(currentUserRole);

  const fetchData = async () => {
    // 1. Fetch Event Info
    try {
      const resEvent = await fetch(`${SCRIPT_URL}?action=getEvent&id_event=futsal`);
      const dataEvent = await resEvent.json();
      if (dataEvent.success && dataEvent.data) {
        setEventData(dataEvent.data);
        setFormDataEvent(dataEvent.data);
      }
    } catch (error) {
      console.error("Gagal mengambil info event futsal:", error);
    }

    // 2. Fetch Teams from Supabase (Official Web Registrations)
    try {
      const [dataTeams, dataBracket] = await Promise.all([
        getFutsalRegistrations(gameSlug),
        getBracket(gameSlug)
      ]);

      if (dataTeams.success && dataTeams.data) {
        setTeams(dataTeams.data);
        
        if (dataBracket.success && dataBracket.data) {
          // Restore bracket state
          const b = dataBracket.data;
          setShuffledTeams(b.shuffledTeams || Array(16).fill(null));
          setQuarterFinals(b.quarterFinals || Array(8).fill(null));
          setSemiFinals(b.semiFinals || Array(4).fill(null));
          setFinals(b.finals || Array(2).fill(null));
          setChampion(b.champion || null);
          setEliminatedTeams(new Set(b.eliminatedTeams || []));
          setGroupMatches(b.groupMatches || []);
          setKnockoutMatches(b.knockoutMatches || []);
        } else {
          // Initialize bracket with padded teams up to 16
          const initialBracket: (Team | null)[] = [...dataTeams.data];
          while (initialBracket.length < 16) {
            initialBracket.push(null);
          }
          setShuffledTeams(initialBracket.slice(0, 16));
        }
        setErrorMessage(null);
      } else {
        setErrorMessage(dataTeams.message || "Gagal memuat data pendaftar futsal");
        toast.error(dataTeams.message || "Gagal memuat data pendaftar futsal");
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Terjadi kesalahan sistem");
      console.error("Gagal mengambil data tim futsal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBracket = async () => {
    setIsSavingEvent(true);
    const toastId = toast.loading("Menyimpan progres bagan...");
    try {
      const bracketData = {
        shuffledTeams,
        quarterFinals,
        semiFinals,
        finals,
        champion,
        eliminatedTeams: Array.from(eliminatedTeams),
        groupMatches,
        knockoutMatches
      };
      const res = await saveBracket(gameSlug, bracketData);
      if (res.success) {
        toast.success("Bagan berhasil disimpan!", { id: toastId });
      } else {
        toast.error(res.message || "Gagal menyimpan bagan", { id: toastId });
      }
    } catch (error: any) {
      toast.error(`Terjadi kesalahan: ${error.message || error}`, { id: toastId });
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess) return;

    setIsSavingEvent(true);
    try {
      const token = Cookies.get("session_token");
      const payload = { action: "saveEvent", token, ...formDataEvent };

      const res = await fetch(`${SCRIPT_URL}?action=saveEvent`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Informasi event berhasil diperbarui!");
        setEventData(formDataEvent);
        setIsEditingEvent(false);
      } else {
        toast.error(data.message || "Gagal menyimpan data event.");
      }
    } catch (error: any) {
      toast.error(`Terjadi kesalahan: ${error.message || error}`);
    } finally {
      setIsSavingEvent(false);
    }
  };

  // Bracket Spinning Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSpinning) {
      interval = setInterval(() => {
        setShuffledTeams(prev => {
          const newArr = [...prev];
          for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
          }
          return newArr;
        });
      }, 50); // 50ms fast shuffle
    } else {
      // WHEN SPIN STOPS
      if (category === 'sma' && shuffledTeams.some(t => t !== null)) {
        const matches: GroupMatch[] = [];
        for (let g = 0; g < 4; g++) {
          const offset = g * 4;
          const pairings = [[0,1], [2,3], [0,2], [1,3], [0,3], [1,2]];
          pairings.forEach((pair, idx) => {
            matches.push({
              id: `g${g}-m${idx}`,
              groupId: g,
              team1Index: offset + pair[0],
              team2Index: offset + pair[1],
              score1: null,
              score2: null,
            });
          });
        }
        setGroupMatches(matches);
      }
    }
    return () => clearInterval(interval);
  }, [isSpinning, category, shuffledTeams]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleSpin = () => {
    if (!isSpinning) {
      // Start spin: reset bracket progression
      setQuarterFinals(Array(8).fill(null));
      setSemiFinals(Array(4).fill(null));
      setFinals(Array(2).fill(null));
      setChampion(null);
      setEliminatedTeams(new Set());
      setGroupMatches([]);
      setKnockoutMatches([]);
    }
    setIsSpinning(!isSpinning);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      bracketRef.current?.requestFullscreen().catch(err => {
        toast.error("Gagal masuk ke mode fullscreen");
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleTeamClick = async (team: Team | null, round: number, slotIndex: number) => {
    if (!team || !hasAccess || isSpinning) return;

    // Block interaction for Rank 3 and 4 in Group Stage
    if (category === 'sma' && round === 1 && slotIndex % 4 > 1) {
      toast.error("Hanya Peringkat 1 dan 2 yang bisa melaju ke babak Knockout!");
      return;
    }

    const result = await Swal.fire({
      title: `${team.nama_tim}`,
      text: "Tentukan status tim ini:",
      icon: "question",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Lolos Babak Selanjutnya 🏆",
      denyButtonText: "Gagal / Gugur ❌",
      cancelButtonText: "Batal",
      confirmButtonColor: "#10b981", // emerald-500
      denyButtonColor: "#ef4444", // rose-500
    });

    if (result.isConfirmed) {
      // Lolos
      const nextSlotIndex = Math.floor(slotIndex / 2);
      if (round === 1) {
        if (category === 'sma') {
          // Crossover Rule
          // slotIndex is (gIndex * 4) + i
          const gIndex = Math.floor(slotIndex / 4);
          const rank = slotIndex % 4;
          
          const crossoverMap: Record<string, number> = {
            "0-0": 0, // Juara A -> QF M1 T1
            "1-1": 1, // Runner-up B -> QF M1 T2
            "2-0": 2, // Juara C -> QF M2 T1
            "3-1": 3, // Runner-up D -> QF M2 T2
            "1-0": 4, // Juara B -> QF M3 T1
            "0-1": 5, // Runner-up A -> QF M3 T2
            "3-0": 6, // Juara D -> QF M4 T1
            "2-1": 7, // Runner-up C -> QF M4 T2
          };
          const mappedSlot = crossoverMap[`${gIndex}-${rank}`];
          if (mappedSlot !== undefined) {
             setQuarterFinals(prev => { 
               const n = [...prev]; 
               n[mappedSlot] = team;
               return n; 
             });
          }
        } else {
          setQuarterFinals(prev => { const n = [...prev]; n[nextSlotIndex] = team; return n; });
        }
      } else if (round === 2) {
        setSemiFinals(prev => { const n = [...prev]; n[nextSlotIndex] = team; return n; });
      } else if (round === 3) {
        setFinals(prev => { const n = [...prev]; n[nextSlotIndex] = team; return n; });
      } else if (round === 4) {
        setChampion(team);
      }
      
      // Remove from eliminated if they were accidentally marked
      if (eliminatedTeams.has(team.id_tim)) {
        setEliminatedTeams(prev => {
          const next = new Set(prev);
          next.delete(team.id_tim);
          return next;
        });
      }
      toast.success(`${team.nama_tim} melaju ke babak selanjutnya!`);
    } else if (result.isDenied) {
      // Gagal
      setEliminatedTeams(prev => {
        const next = new Set(prev);
        next.add(team.id_tim);
        return next;
      });
    }
  };

  // Helper to calculate standings for a group
  const calculateGroupStandings = (groupId: number) => {
    const groupTeams = [
      shuffledTeams[groupId * 4],
      shuffledTeams[groupId * 4 + 1],
      shuffledTeams[groupId * 4 + 2],
      shuffledTeams[groupId * 4 + 3],
    ];

    const stats = groupTeams.map((team, localIdx) => {
      const globalIdx = groupId * 4 + localIdx;
      let M = 0, W = 0, D = 0, L = 0, GF = 0, GA = 0;

      groupMatches.filter(m => m.groupId === groupId).forEach(m => {
        if (m.score1 !== null && m.score2 !== null) {
          if (m.team1Index === globalIdx) {
            M++; GF += m.score1; GA += m.score2;
            if (m.score1 > m.score2) W++;
            else if (m.score1 === m.score2) D++;
            else if (m.score1 < m.score2) L++;
          } else if (m.team2Index === globalIdx) {
            M++; GF += m.score2; GA += m.score1;
            if (m.score2 > m.score1) W++;
            else if (m.score2 === m.score1) D++;
            else if (m.score2 < m.score1) L++;
          }
        }
      });

      return {
        team,
        originalIndex: globalIdx,
        M, W, D, L, GF, GA,
        GD: GF - GA,
        PTS: W * 3 + D * 1
      };
    });

    // Sort by PTS, then GD, then GF, then original random index as tie-breaker
    return stats.sort((a, b) => {
      if (b.PTS !== a.PTS) return b.PTS - a.PTS;
      if (b.GD !== a.GD) return b.GD - a.GD;
      if (b.GF !== a.GF) return b.GF - a.GF;
      return 0; // retain original shuffle order if completely tied
    });
  };

  const handleMatchClick = async (match: GroupMatch) => {
    if (!hasAccess || isSpinning) return;
    const t1 = shuffledTeams[match.team1Index];
    const t2 = shuffledTeams[match.team2Index];
    if (!t1 || !t2) return;

    const { value: formValues } = await Swal.fire({
      title: 'Input Skor Pertandingan',
      html:
        `<div class="flex justify-between items-center gap-4 mt-4">
          <div class="flex flex-col items-center w-[45%]">
            <div class="text-[11px] font-bold mb-2 text-center h-10 flex flex-col justify-end text-slate-700 leading-tight w-full truncate" title="${t1.nama_tim}">${t1.nama_tim}</div>
            <input id="swal-score1" type="number" min="0" class="w-full text-center text-3xl font-black p-4 border-2 border-slate-200 rounded-xl bg-slate-50 focus:border-blue-500 focus:bg-white transition-all outline-none" placeholder="0" value="${match.score1 ?? ''}" />
          </div>
          <div class="font-black text-xl text-slate-300 w-[10%] text-center">VS</div>
          <div class="flex flex-col items-center w-[45%]">
            <div class="text-[11px] font-bold mb-2 text-center h-10 flex flex-col justify-end text-slate-700 leading-tight w-full truncate" title="${t2.nama_tim}">${t2.nama_tim}</div>
            <input id="swal-score2" type="number" min="0" class="w-full text-center text-3xl font-black p-4 border-2 border-slate-200 rounded-xl bg-slate-50 focus:border-blue-500 focus:bg-white transition-all outline-none" placeholder="0" value="${match.score2 ?? ''}" />
          </div>
        </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan Skor',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#3b82f6',
      preConfirm: () => {
        const s1 = (document.getElementById('swal-score1') as HTMLInputElement).value;
        const s2 = (document.getElementById('swal-score2') as HTMLInputElement).value;
        if (s1 === '' && s2 === '') return null; // reset
        if (s1 === '' || s2 === '') {
          Swal.showValidationMessage('Kedua skor harus diisi atau sama-sama dikosongkan!');
          return false;
        }
        return [parseInt(s1), parseInt(s2)];
      }
    });

    if (formValues !== undefined) {
      setGroupMatches(prev => prev.map(m => {
        if (m.id === match.id) {
          if (formValues === null) return { ...m, score1: null, score2: null };
          return { ...m, score1: formValues[0], score2: formValues[1] };
        }
        return m;
      }));
    }
  };

  // Helper for rendering team slot in Group Stage
  const renderTeamSlot = (team: Team | null, round: number, slotIndex: number, isTop: boolean) => {
    const isEliminated = team && eliminatedTeams.has(team.id_tim);
    const bgClass = isTop ? 'bg-slate-50 border-b border-slate-100' : 'bg-white';
    const cursorClass = team && hasAccess ? 'cursor-pointer hover:bg-slate-100 transition-colors' : '';
    const textClass = team ? (isEliminated ? 'text-slate-400 line-through' : 'text-slate-800') : 'text-slate-400';
    
    return (
      <div 
        className={`px-3 py-2 flex justify-between items-center ${bgClass} ${cursorClass} ${isEliminated ? 'opacity-50 grayscale' : ''}`}
        onClick={() => handleTeamClick(team, round, slotIndex)}
        title={team && hasAccess ? "Klik untuk ubah status lolos/gagal" : ""}
      >
        <span className={`font-semibold ${textClass} truncate max-w-[160px]`}>
          {team ? team.nama_tim : 'TBD (BYE)'}
        </span>
        <span className="text-slate-300">-</span>
      </div>
    );
  };

  const handleKnockoutMatchClick = async (round: number, matchIndex: number) => {
    if (!hasAccess || isSpinning) return;
    
    let t1: Team | null = null;
    let t2: Team | null = null;

    if (round === 1) {
      t1 = shuffledTeams[matchIndex * 2];
      t2 = shuffledTeams[matchIndex * 2 + 1];
    } else if (round === 2) {
      t1 = quarterFinals[matchIndex * 2];
      t2 = quarterFinals[matchIndex * 2 + 1];
    } else if (round === 3) {
      t1 = semiFinals[matchIndex * 2];
      t2 = semiFinals[matchIndex * 2 + 1];
    } else if (round === 4) {
      t1 = finals[0];
      t2 = finals[1];
    }

    if (!t1 || !t2) {
      toast.error("Pertandingan belum siap! Kedua tim harus terisi.");
      return;
    }

    const matchId = `r${round}-m${matchIndex}`;
    const existingMatch = knockoutMatches.find(m => m.id === matchId);

    const { value: formValues } = await Swal.fire({
      title: 'Input Skor Babak Gugur',
      html:
        `<div class="flex flex-col gap-4 mt-4">
          <div class="flex justify-between items-center gap-4">
            <div class="flex flex-col items-center w-[45%]">
              <div class="text-[11px] font-bold mb-2 text-center h-10 flex flex-col justify-end text-slate-700 leading-tight w-full truncate" title="${t1.nama_tim}">${t1.nama_tim}</div>
              <input id="swal-kscore1" type="number" min="0" class="w-full text-center text-3xl font-black p-4 border-2 border-slate-200 rounded-xl bg-slate-50 focus:border-blue-500 focus:bg-white transition-all outline-none" placeholder="0" value="${existingMatch?.score1 ?? ''}" />
            </div>
            <div class="font-black text-xl text-slate-300 w-[10%] text-center">VS</div>
            <div class="flex flex-col items-center w-[45%]">
              <div class="text-[11px] font-bold mb-2 text-center h-10 flex flex-col justify-end text-slate-700 leading-tight w-full truncate" title="${t2.nama_tim}">${t2.nama_tim}</div>
              <input id="swal-kscore2" type="number" min="0" class="w-full text-center text-3xl font-black p-4 border-2 border-slate-200 rounded-xl bg-slate-50 focus:border-blue-500 focus:bg-white transition-all outline-none" placeholder="0" value="${existingMatch?.score2 ?? ''}" />
            </div>
          </div>
          <div id="penalty-section" class="flex flex-col gap-2 p-4 bg-orange-50 border border-orange-200 rounded-xl mt-2 hidden">
            <div class="text-xs font-bold text-orange-600 text-center uppercase tracking-wider">Hasil Adu Penalti</div>
            <div class="flex justify-between items-center gap-4">
              <input id="swal-pen1" type="number" min="0" class="w-full text-center text-xl font-bold p-2 border-2 border-orange-200 rounded-lg focus:border-orange-500 outline-none bg-white" placeholder="0" value="${existingMatch?.pen1 ?? ''}" />
              <div class="text-orange-300 font-bold">-</div>
              <input id="swal-pen2" type="number" min="0" class="w-full text-center text-xl font-bold p-2 border-2 border-orange-200 rounded-lg focus:border-orange-500 outline-none bg-white" placeholder="0" value="${existingMatch?.pen2 ?? ''}" />
            </div>
          </div>
        </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan Skor',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#3b82f6',
      didOpen: () => {
        const s1 = document.getElementById('swal-kscore1') as HTMLInputElement;
        const s2 = document.getElementById('swal-kscore2') as HTMLInputElement;
        const penSection = document.getElementById('penalty-section');
        const checkDraw = () => {
          if (s1.value !== '' && s2.value !== '' && s1.value === s2.value) {
            penSection?.classList.remove('hidden');
          } else {
            penSection?.classList.add('hidden');
          }
        };
        s1.addEventListener('input', checkDraw);
        s2.addEventListener('input', checkDraw);
        checkDraw();
      },
      preConfirm: () => {
        const s1 = (document.getElementById('swal-kscore1') as HTMLInputElement).value;
        const s2 = (document.getElementById('swal-kscore2') as HTMLInputElement).value;
        const p1 = (document.getElementById('swal-pen1') as HTMLInputElement).value;
        const p2 = (document.getElementById('swal-pen2') as HTMLInputElement).value;

        if (s1 === '' && s2 === '') return null; // Reset
        if (s1 === '' || s2 === '') {
          Swal.showValidationMessage('Kedua skor utama harus diisi!');
          return false;
        }

        const score1 = parseInt(s1);
        const score2 = parseInt(s2);
        let pen1 = null;
        let pen2 = null;

        if (score1 === score2) {
          if (p1 === '' || p2 === '') {
            Swal.showValidationMessage('Karena seri, skor penalti wajib diisi!');
            return false;
          }
          pen1 = parseInt(p1);
          pen2 = parseInt(p2);
          if (pen1 === pen2) {
            Swal.showValidationMessage('Skor penalti tidak boleh seri!');
            return false;
          }
        }

        return { score1, score2, pen1, pen2 };
      }
    });

    if (formValues !== undefined) {
      setKnockoutMatches(prev => {
        const matchData = { id: matchId, round, matchIndex, ...(formValues || { score1: null, score2: null, pen1: null, pen2: null }) };
        const exists = prev.find(m => m.id === matchId);
        if (exists) return prev.map(m => m.id === matchId ? matchData : m);
        return [...prev, matchData];
      });

      if (formValues === null) return;

      const { score1, score2, pen1, pen2 } = formValues;
      let winner: Team = t1;
      let loser: Team = t2;

      if (score1 > score2 || (score1 === score2 && pen1! > pen2!)) {
        winner = t1;
        loser = t2;
      } else {
        winner = t2;
        loser = t1;
      }

      setEliminatedTeams(prev => {
        const next = new Set(prev);
        next.add(loser.id_tim);
        next.delete(winner.id_tim); 
        return next;
      });

      if (round === 1) {
        setQuarterFinals(prev => { const n = [...prev]; n[matchIndex] = winner; return n; });
      } else if (round === 2) {
        setSemiFinals(prev => { const n = [...prev]; n[matchIndex] = winner; return n; });
      } else if (round === 3) {
        setFinals(prev => { const n = [...prev]; n[matchIndex] = winner; return n; });
      } else if (round === 4) {
        setChampion(winner);
      }

      toast.success(`${winner.nama_tim} berhasil melaju!`);
    }
  };

  const renderMatchSlot = (round: number, matchIndex: number, t1: Team | null, t2: Team | null, isFinal = false) => {
    const matchId = `r${round}-m${matchIndex}`;
    const match = knockoutMatches.find(m => m.id === matchId);
    const hasScore = match && match.score1 !== null && match.score2 !== null;
    const isPen = hasScore && match!.score1 === match!.score2;

    const t1Eliminated = t1 && eliminatedTeams.has(t1.id_tim);
    const t2Eliminated = t2 && eliminatedTeams.has(t2.id_tim);

    const formatScore = (score: number | null, pen: number | null) => {
      if (score === null) return '-';
      if (pen !== null) return `${score} (${pen})`;
      return `${score}`;
    };

    return (
      <div 
        className={`w-full bg-white border ${isFinal ? 'border-amber-300 shadow-md' : 'border-slate-200 shadow-sm'} rounded-lg overflow-hidden flex flex-col text-xs relative ${hasAccess && !isSpinning ? 'cursor-pointer hover:border-blue-400 hover:shadow-md transition-all' : ''}`}
        onClick={() => handleKnockoutMatchClick(round, matchIndex)}
        title={hasAccess && !isSpinning ? "Klik untuk input skor pertandingan" : ""}
      >
        {isFinal && (
          <div className="bg-amber-100 text-amber-700 text-[10px] font-bold text-center py-1 uppercase tracking-wider">Final Match</div>
        )}
        <div className={`px-3 py-2 flex justify-between items-center bg-slate-50 border-b border-slate-100 ${t1Eliminated ? 'opacity-50 grayscale' : ''}`}>
          <span className={`font-semibold ${t1 ? (t1Eliminated ? 'text-slate-400 line-through' : 'text-slate-800') : 'text-slate-400'} truncate max-w-[140px]`}>
            {t1 ? t1.nama_tim : 'TBD (BYE)'}
          </span>
          <span className={`font-black ${hasScore ? 'text-slate-800' : 'text-slate-300'}`}>
            {formatScore(match?.score1 ?? null, isPen ? match?.pen1 ?? null : null)}
          </span>
        </div>
        <div className={`px-3 py-2 flex justify-between items-center bg-white ${t2Eliminated ? 'opacity-50 grayscale' : ''}`}>
          <span className={`font-semibold ${t2 ? (t2Eliminated ? 'text-slate-400 line-through' : 'text-slate-800') : 'text-slate-400'} truncate max-w-[140px]`}>
            {t2 ? t2.nama_tim : 'TBD (BYE)'}
          </span>
          <span className={`font-black ${hasScore ? 'text-slate-800' : 'text-slate-300'}`}>
            {formatScore(match?.score2 ?? null, isPen ? match?.pen2 ?? null : null)}
          </span>
        </div>
      </div>
    );
  };

  // SVG Lines generator
  const SVGLines = () => {
    const COL_WIDTH = 224; // w-56 is 14rem = 224px
    const GAP = 48; // gap-12 is 3rem = 48px
    const PADDING_X = 16; // px-4 is 1rem = 16px
    const HEIGHT = 800; // h-[800px]

    const paths = [];
    const roundsCount = category === 'sma' ? [4, 2, 1] : [8, 4, 2, 1];
    
    for (let r = 0; r < roundsCount.length - 1; r++) {
      const numMatches = roundsCount[r];
      const nextMatches = roundsCount[r+1];
      const boxHeight = HEIGHT / numMatches;
      const nextBoxHeight = HEIGHT / nextMatches;
      
      for (let i = 0; i < numMatches; i++) {
        const startX = PADDING_X + (r + 1) * COL_WIDTH + r * GAP;
        const startY = boxHeight * i + (boxHeight / 2);
        
        const midX = startX + GAP / 2;
        
        const nextI = Math.floor(i / 2);
        const endX = startX + GAP;
        const endY = nextBoxHeight * nextI + (nextBoxHeight / 2);
        
        paths.push(`M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`);
      }
    }
    
    // Final to Champion line
    const numCols = roundsCount.length;
    const finalStartX = PADDING_X + numCols * COL_WIDTH + (numCols - 1) * GAP;
    const finalStartY = HEIGHT / 2;
    const finalEndX = finalStartX + GAP;
    paths.push(`M ${finalStartX} ${finalStartY} L ${finalEndX} ${finalStartY}`);

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        {paths.map((d, idx) => (
          <path key={idx} d={d} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinejoin="round" />
        ))}
      </svg>
    );
  };

  if (isLoading) return <FullPageLoader message="Memuat informasi Futsal..." fullScreen={false} />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      {/* Header Utama */}
      <div className="flex items-center gap-4">
        <Link href="/event/futsal" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            {eventData.nama_event}
          </h1>
          <p className="text-sm text-slate-500">Informasi Umum Event</p>
        </div>
      </div>

      {/* SECTION 1: Informasi Umum Event */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="h-24 bg-gradient-to-r from-emerald-500 to-emerald-700 opacity-90 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        </div>
        
        <div className="p-6 sm:p-8 relative">
          <div className="flex justify-between items-start mb-6">
            <div className="-mt-16 w-20 h-20 rounded-2xl bg-emerald-50 border-4 border-white shadow-lg flex items-center justify-center relative z-10">
              <Activity className="w-8 h-8 text-emerald-600" />
            </div>
            
            {hasAccess && !isEditingEvent && (
              <button 
                onClick={() => setIsEditingEvent(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors"
              >
                <Edit3 className="w-4 h-4" /> Edit Info
              </button>
            )}
          </div>

          {!isEditingEvent ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1"><CalendarDays className="w-3.5 h-3.5" /> Tanggal Pelaksanaan</label>
                  <p className="text-base font-semibold text-slate-800">
                    {eventData.tanggal ? new Date(eventData.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : "Belum ditentukan"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1"><MapPin className="w-3.5 h-3.5" /> Tempat / Lokasi</label>
                  <p className="text-base font-semibold text-slate-800">{eventData.tempat || "Belum ditentukan"}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1"><Activity className="w-3.5 h-3.5" /> Status Event</label>
                  <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-bold mt-1 ${
                    eventData.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' :
                    eventData.status === 'Batal' ? 'bg-rose-100 text-rose-700' :
                    eventData.status === 'Sedang Berlangsung' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {eventData.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2"><Info className="w-3.5 h-3.5" /> Deskripsi Singkat</label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">
                    {eventData.deskripsi || "Belum ada deskripsi untuk event ini."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveEvent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Pelaksanaan</label>
                  <input 
                    type="date" 
                    value={formDataEvent.tanggal ? new Date(formDataEvent.tanggal).toISOString().split('T')[0] : ""}
                    onChange={(e) => setFormDataEvent({...formDataEvent, tanggal: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tempat / Lokasi</label>
                  <input 
                    type="text" 
                    value={formDataEvent.tempat}
                    onChange={(e) => setFormDataEvent({...formDataEvent, tempat: e.target.value})}
                    placeholder="Contoh: GOR UNP"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Status Event</label>
                  <select 
                    value={formDataEvent.status}
                    onChange={(e) => setFormDataEvent({...formDataEvent, status: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="Akan Datang">Akan Datang</option>
                    <option value="Sedang Berlangsung">Sedang Berlangsung</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Batal">Batal</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Deskripsi Singkat</label>
                  <textarea 
                    value={formDataEvent.deskripsi}
                    onChange={(e) => setFormDataEvent({...formDataEvent, deskripsi: e.target.value})}
                    rows={4}
                    placeholder="Tuliskan deskripsi atau catatan mengenai event ini..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsEditingEvent(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSavingEvent}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingEvent ? "Menyimpan..." : <><Save className="w-4 h-4" /> Simpan Perubahan</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* SECTION 2: Data Tim (Tabel) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Daftar Tim Bertanding</h2>
              <p className="text-xs text-slate-500">
                {teams.length} Tim Terdaftar (Data sinkron dengan Pendaftar Official Web)
              </p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Nama Tim</th>
                <th className="px-6 py-4 font-semibold">Kapten</th>
                <th className="px-6 py-4 font-semibold">Kontak WA</th>
                <th className="px-6 py-4 font-semibold">Status Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                      <Users className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-slate-800 font-semibold mb-1">Belum ada tim (atau Gagal Memuat)</h3>
                    <p className="text-sm text-slate-500 mb-2">Jika seharusnya ada tim, pastikan Environment Variable Vercel sudah benar.</p>
                    {errorMessage && (
                      <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-lg border border-rose-100 max-w-md mx-auto text-left whitespace-pre-wrap">
                        <span className="font-bold block mb-1">Pesan Error Sistem:</span>
                        {errorMessage}
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                teams.map((team, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{team.nama_tim}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{team.id_tim}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {team.kapten}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {team.kontak}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold ${
                        team.status_bayar === 'Lunas' ? 'bg-emerald-100 text-emerald-700' :
                        team.status_bayar === 'DP' ? 'bg-blue-100 text-blue-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {team.status_bayar}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Turnamen Bracket Viewer (Visual Only) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Bagan Pertandingan</h2>
              <p className="text-xs text-slate-500">Preview Bracket Turnamen & Pengundian</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasAccess && (
              <button 
                onClick={toggleSpin}
                className={`px-5 py-2.5 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 ${
                  isSpinning 
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20 animate-pulse' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                {isSpinning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Stop Pengundian!
                  </>
                ) : (
                  <>
                    <Shuffle className="w-4 h-4" />
                    Acak Tim (Spin)
                  </>
                )}
              </button>
            )}
            <button 
              onClick={toggleFullscreen}
              className="p-2.5 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
              title="Layar Penuh"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div ref={bracketRef} className={`w-full overflow-x-auto relative ${isFullscreen ? 'bg-slate-50 p-12 h-screen' : 'bg-slate-50/50 p-8'}`}>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
          
          {isFullscreen && (
            <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
              {hasAccess && (
                <>
                  <button 
                    onClick={handleSaveBracket}
                    disabled={isSavingEvent || isSpinning}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Simpan Progres Bagan
                  </button>
                  <button 
                    onClick={toggleSpin}
                    className={`px-5 py-2.5 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 ${
                      isSpinning 
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20 animate-pulse' 
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                    }`}
                  >
                    {isSpinning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Stop Pengundian!
                      </>
                    ) : (
                      <>
                        <Shuffle className="w-4 h-4" />
                        Acak Tim (Spin)
                      </>
                    )}
                  </button>
                </>
              )}
              <button 
                onClick={toggleFullscreen}
                className="p-2.5 bg-white/80 backdrop-blur text-slate-700 hover:bg-white rounded-xl shadow-sm border border-slate-200 transition-all"
                title="Keluar Layar Penuh"
              >
                <Minimize className="w-5 h-5" />
              </button>
            </div>
          )}


          {category === 'sma' && (
            <div className="flex flex-col gap-8 mb-12 relative z-10 w-full max-w-[1400px] mx-auto bg-slate-50/50 p-6 rounded-3xl border border-slate-200">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Trophy className="w-5 h-5 text-emerald-500" /> Fase Grup & Jadwal Pertandingan</h2>
              
              <div className="flex flex-col gap-10 items-start w-full">
                 {/* TOP: 2x2 Grid for Standings */}
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
                    {[0, 1, 2, 3].map((gIndex) => {
                      const groupName = ['Grup A', 'Grup B', 'Grup C', 'Grup D'][gIndex];
                      const standings = calculateGroupStandings(gIndex);
                      
                      return (
                        <div key={`group-${gIndex}`} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col text-xs relative">
                          <div className="bg-slate-800 text-white font-bold text-center py-3 uppercase tracking-wider text-[12px] flex justify-between px-5">
                            <span>{groupName}</span>
                            <span className="text-slate-400 font-normal tracking-normal flex gap-5">
                              <span className="w-4 text-center">M</span>
                              <span className="w-4 text-center">W</span>
                              <span className="w-4 text-center">D</span>
                              <span className="w-4 text-center">L</span>
                              <span className="w-6 text-center">GD</span>
                              <span className="w-6 text-center">PTS</span>
                            </span>
                          </div>
                          <div className="flex flex-col">
                            {standings.map((stat, i) => {
                              const isQualify = i < 2; // Top 2
                              return (
                                <div key={`g${gIndex}-team${i}`} className={`flex justify-between items-center px-4 py-3 border-b border-slate-100 ${isQualify ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-rose-50'} transition-colors ${isQualify ? 'cursor-pointer' : 'cursor-not-allowed'}`} onClick={() => handleTeamClick(stat.team, 1, gIndex * 4 + i)}>
                                  <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
                                    <span className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${isQualify ? 'bg-emerald-500 text-white' : 'bg-rose-200 text-rose-700'}`}>{i + 1}</span>
                                    <span className={`font-bold text-sm truncate ${isQualify ? 'text-emerald-900' : 'text-rose-900'}`}>{stat.team ? stat.team.nama_tim : 'TBD'}</span>
                                  </div>
                                  <div className={`flex gap-5 font-mono text-[13px] shrink-0 ${isQualify ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    <span className="w-4 text-center">{stat.M}</span>
                                    <span className="w-4 text-center">{stat.W}</span>
                                    <span className="w-4 text-center">{stat.D}</span>
                                    <span className="w-4 text-center">{stat.L}</span>
                                    <span className="w-6 text-center">{stat.GD > 0 ? `+${stat.GD}` : stat.GD}</span>
                                    <span className="w-6 text-center font-black">{stat.PTS}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                 </div>
                 
                 {/* BOTTOM: Match List */}
                 <div className="w-full bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                    <div className="bg-slate-100 border-b border-slate-200 p-4 shrink-0">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-blue-500" /> Hasil & Jadwal Pertandingan Fase Grup</h3>
                    </div>
                    <div className="p-6 bg-slate-50 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                       {groupMatches.map(match => {
                         const t1 = shuffledTeams[match.team1Index];
                         const t2 = shuffledTeams[match.team2Index];
                         const groupName = ['Grup A', 'Grup B', 'Grup C', 'Grup D'][match.groupId];
                         const hasScore = match.score1 !== null && match.score2 !== null;
                         
                         return (
                           <div key={match.id} onClick={() => handleMatchClick(match)} className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group flex flex-col gap-3">
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">{groupName}</div>
                             <div className="flex justify-between items-center gap-3">
                               <div className="flex-1 text-right text-sm font-bold text-slate-700 truncate" title={t1 ? t1.nama_tim : 'TBD'}>{t1 ? t1.nama_tim : 'TBD'}</div>
                               <div className={`px-3 py-1.5 rounded-lg text-sm font-black min-w-[60px] text-center shrink-0 ${hasScore ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                 {hasScore ? `${match.score1} - ${match.score2}` : 'VS'}
                               </div>
                               <div className="flex-1 text-left text-sm font-bold text-slate-700 truncate" title={t2 ? t2.nama_tim : 'TBD'}>{t2 ? t2.nama_tim : 'TBD'}</div>
                             </div>
                           </div>
                         );
                       })}
                       {groupMatches.length === 0 && (
                         <div className="col-span-full text-center text-sm text-slate-400 py-12">Belum ada jadwal. Silakan acak tim (spin) terlebih dahulu.</div>
                       )}
                    </div>
                 </div>
              </div>
            </div>
          )}

          <div className="relative z-10 min-w-[1000px] h-[800px] flex gap-12 px-4 py-4 mx-auto max-w-max">
            <SVGLines />
            
            {/* Round 1 / Fase Grup */}
            {category !== 'sma' && (
              <div className="flex flex-col justify-around w-56 shrink-0 relative z-10">
                <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">Round of 16</div>
                {Array(8).fill(0).map((_, i) => (
                  <div key={`r1-${i}`}>
                    {renderMatchSlot(1, i, shuffledTeams[i * 2], shuffledTeams[i * 2 + 1])}
                  </div>
                ))}
              </div>
            )}

            {/* Quarterfinals */}
            <div className="flex flex-col justify-around w-56 shrink-0 relative z-10">
              <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">Quarterfinals</div>
              {Array(4).fill(0).map((_, i) => (
                <div key={`qf-${i}`}>
                  {renderMatchSlot(2, i, quarterFinals[i * 2], quarterFinals[i * 2 + 1])}
                </div>
              ))}
            </div>

            {/* Semifinals */}
            <div className="flex flex-col justify-around w-56 shrink-0 relative z-10">
              <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">Semifinals</div>
              {Array(2).fill(0).map((_, i) => (
                <div key={`sf-${i}`}>
                  {renderMatchSlot(3, i, semiFinals[i * 2], semiFinals[i * 2 + 1])}
                </div>
              ))}
            </div>

            {/* Final */}
            <div className="flex flex-col justify-around w-56 shrink-0 relative z-10">
              <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">Grand Final</div>
              {renderMatchSlot(4, 0, finals[0], finals[1], true)}
            </div>

            {/* Winner */}
            <div className="flex flex-col justify-center w-56 shrink-0 relative pl-4 z-10">
              <div 
                className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm text-center transition-all ${
                  champion 
                    ? 'bg-gradient-to-r from-amber-100 to-amber-50 border-amber-300 shadow-amber-200/50' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <Trophy className={`w-8 h-8 mb-1 ${champion ? 'text-amber-500' : 'text-slate-300'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${champion ? 'text-amber-700' : 'text-slate-400'}`}>Champion</span>
                <span className={`font-bold text-lg ${champion ? 'text-slate-800' : 'text-slate-400'}`}>
                  {champion ? champion.nama_tim : 'TBD'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
