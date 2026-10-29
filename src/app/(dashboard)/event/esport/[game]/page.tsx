"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Gamepad2, Save, Edit3, User, Phone, MapPin, CalendarDays, Activity, Trash2, Plus, Trophy, Info, Users, Sparkles, Swords, Crown, Shield } from "lucide-react";
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import FullPageLoader from "@/components/FullPageLoader";
import { getEsportRegistrations, saveBracket } from "../actions";
import { Loader2, Shuffle, Maximize, Minimize, RotateCcw } from "lucide-react";
import { useParams } from "next/navigation";
import Swal from "sweetalert2";

type Team = {
  id_tim: string;
  nama_tim: string;
  kapten: string;
  kontak: string;
  status_bayar: string;
  slot_count?: string;
  in_game_slot2?: string | null;
};

type EventData = {
  id_event: string;
  nama_event: string;
  tanggal: string;
  tempat: string;
  deskripsi: string;
  status: string;
};

export default function EsportDashboard() {
  const params = useParams();
  const game = params.game as string;
  const gameSlug = game === 'mlbb' ? 'turnamen-esport-mlbb' : 'turnamen-esport-efootball';
  
  const gameTitle = game === 'mlbb' ? "Mobile Legends: Bang Bang" : "E-Football";
  const eventId = game === 'mlbb' ? "esport_mlbb" : "esport_efootball";
  
  const [currentUserRole, setCurrentUserRole] = useState("ROLE-001");
  const [isLoading, setIsLoading] = useState(true);
  
  // EVENT STATE
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventData, setEventData] = useState<EventData>({
    id_event: eventId,
    nama_event: gameTitle,
    tanggal: "",
    tempat: "",
    deskripsi: "",
    status: "Akan Datang"
  });
  const [formDataEvent, setFormDataEvent] = useState<EventData>({
    id_event: eventId,
    nama_event: gameTitle,
    tanggal: "",
    tempat: "",
    deskripsi: "",
    status: "Akan Datang"
  });

  // TEAM STATE (Read Only)
  const [teams, setTeams] = useState<Team[]>([]);
  
  // BRACKET STATE
  const isMLBB = game === 'mlbb';
  const [mlbbTheme, setMlbbTheme] = useState<'arena' | 'clean'>('arena');
  const [shuffledTeams, setShuffledTeams] = useState<(Team | null)[]>(() => Array(isMLBB ? 18 : 16).fill(null));
  const [playInWinners, setPlayInWinners] = useState<(Team | null)[]>(() => Array(2).fill(null));
  const [quarterFinals, setQuarterFinals] = useState<(Team | null)[]>(() => Array(8).fill(null));
  const [semiFinals, setSemiFinals] = useState<(Team | null)[]>(() => Array(4).fill(null));
  const [finals, setFinals] = useState<(Team | null)[]>(() => Array(2).fill(null));
  const [champion, setChampion] = useState<Team | null>(null);
  const [eliminatedTeams, setEliminatedTeams] = useState<Set<string>>(new Set());

  const [isSpinning, setIsSpinning] = useState(false);
  const [isSavingBracket, setIsSavingBracket] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    try {
      // 1. Fetch Event Info: Coba ambil spesifik sub-event, fallback ke 'esport' jika belum ada
      let resEvent = await fetch(`${SCRIPT_URL}?action=getEvent&id_event=${eventId}`);
      let dataEvent = await resEvent.json();
      if (!dataEvent.success || !dataEvent.data) {
        resEvent = await fetch(`${SCRIPT_URL}?action=getEvent&id_event=esport`);
        dataEvent = await resEvent.json();
      }

      if (dataEvent.success && dataEvent.data) {
        const mergedEvent = {
          ...dataEvent.data,
          id_event: eventId,
          nama_event: gameTitle, // Pastikan nama event tetap sesuai cabang game
        };
        setEventData(mergedEvent);
        setFormDataEvent(mergedEvent);
      }

      // 2. Fetch Teams from Supabase (Official Web Registrations)
      const dataTeams = await getEsportRegistrations(gameSlug);
      if (dataTeams.success && dataTeams.data) {
        setTeams(dataTeams.data);
        
        if (dataTeams.bracket) {
          // Restore bracket state dari database Supabase
          const b = dataTeams.bracket;
          let loadedShuffled = b.shuffledTeams || [];
          const targetSlots = isMLBB ? 18 : 16;
          if (loadedShuffled.length < targetSlots) {
            loadedShuffled = [...loadedShuffled, ...Array(targetSlots - loadedShuffled.length).fill(null)];
          } else if (loadedShuffled.length > targetSlots) {
            loadedShuffled = loadedShuffled.slice(0, targetSlots);
          }
          setShuffledTeams(loadedShuffled);
          setPlayInWinners(b.playInWinners || Array(2).fill(null));
          setQuarterFinals(b.quarterFinals || Array(8).fill(null));
          setSemiFinals(b.semiFinals || Array(4).fill(null));
          setFinals(b.finals || Array(2).fill(null));
          setChampion(b.champion || null);
          setEliminatedTeams(new Set(b.eliminatedTeams || []));
        } else {
          // Initialize empty bracket
          setShuffledTeams(Array(isMLBB ? 18 : 16).fill(null));
          setPlayInWinners(Array(2).fill(null));
        }
      }
    } catch (error) {
      console.error("Gagal mengambil data esport:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess) return;

    setIsSavingEvent(true);
    try {
      const token = Cookies.get("session_token");
      const payload = { 
        action: "saveEvent", 
        token, 
        ...formDataEvent,
        id_event: eventId,
        nama_event: gameTitle,
      };

      const res = await fetch(`${SCRIPT_URL}?action=saveEvent`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Informasi event berhasil diperbarui!");
        const updated = {
          ...formDataEvent,
          id_event: eventId,
          nama_event: gameTitle,
        };
        setEventData(updated);
        setFormDataEvent(updated);
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
    }
    return () => clearInterval(interval);
  }, [isSpinning]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Smart Fair Draw Seeding Algorithm: Memisahkan multi-slot ke Bagan Atas (0..7) dan Bagan Bawah (8..15)
  const generateFairBracket = (teamList: Team[]): (Team | null)[] => {
    const multiSlotPairs: { slot1: Team; slot2: Team }[] = [];
    const singleSlotTeams: Team[] = [];

    teamList.forEach(team => {
      if (game === 'efootball' && team.slot_count === '2') {
        const slot1: Team = { ...team };
        const slot2: Team = {
          ...team,
          id_tim: team.id_tim + '-2',
          nama_tim: team.in_game_slot2 || `${team.nama_tim} (Tim 2)`,
        };
        multiSlotPairs.push({ slot1, slot2 });
      } else {
        singleSlotTeams.push({ ...team });
      }
    });

    // Pool A (Bagan Atas: Slot 0..7, Pertandingan 1-4)
    // Pool B (Bagan Bawah: Slot 8..15, Pertandingan 5-8)
    let poolAPositions = [0, 1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5);
    let poolBPositions = [8, 9, 10, 11, 12, 13, 14, 15].sort(() => Math.random() - 0.5);

    const bracket: (Team | null)[] = Array(16).fill(null);

    // Multi-slot: Slot 1 di Bagan Atas, Slot 2 di Bagan Bawah (atau sebaliknya secara random)
    multiSlotPairs.forEach(pair => {
      const coinFlip = Math.random() > 0.5;
      const teamA = coinFlip ? pair.slot1 : pair.slot2;
      const teamB = coinFlip ? pair.slot2 : pair.slot1;

      if (poolAPositions.length > 0 && poolBPositions.length > 0) {
        bracket[poolAPositions.pop()!] = teamA;
        bracket[poolBPositions.pop()!] = teamB;
      }
    });

    // Sisa slot diisi tim single-slot secara acak di kedua bagan
    const remainingPositions = [...poolAPositions, ...poolBPositions].sort(() => Math.random() - 0.5);
    singleSlotTeams.sort(() => Math.random() - 0.5);

    singleSlotTeams.forEach(team => {
      if (remainingPositions.length > 0) {
        bracket[remainingPositions.pop()!] = team;
      }
    });

    return bracket;
  };

  const toggleSpin = () => {
    const totalSlots = isMLBB ? 18 : 16;
    if (!isSpinning) {
      // Start spin: reset progress babak dan jalankan animasi acak
      const expandedBracket: Team[] = [];
      teams.forEach((team: Team) => {
        expandedBracket.push(team);
        if (game === 'efootball' && team.slot_count === '2') {
          expandedBracket.push({
            ...team,
            id_tim: team.id_tim + '-2',
            nama_tim: team.in_game_slot2 || `${team.nama_tim} (Tim 2)`,
          });
        }
      });
      const initialBracket: (Team | null)[] = [...expandedBracket];
      while (initialBracket.length < totalSlots) {
        initialBracket.push(null);
      }
      setShuffledTeams(initialBracket.slice(0, totalSlots));
      setPlayInWinners(Array(2).fill(null));
      setQuarterFinals(Array(8).fill(null));
      setSemiFinals(Array(4).fill(null));
      setFinals(Array(2).fill(null));
      setChampion(null);
      setEliminatedTeams(new Set());
      setIsSpinning(true);
    } else {
      // Stop spin
      setIsSpinning(false);
      if (isMLBB) {
        const randomized = [...teams].sort(() => Math.random() - 0.5);
        const bracket: (Team | null)[] = Array(18).fill(null);
        randomized.slice(0, 18).forEach((t, i) => {
          bracket[i] = t;
        });
        setShuffledTeams(bracket);
        setPlayInWinners(Array(2).fill(null));
        toast.success("Pengundian selesai! Bagan 18 Tim MLBB berhasil diacak.");
      } else {
        const fairBracket = generateFairBracket(teams);
        setShuffledTeams(fairBracket);
        toast.success(
          game === 'efootball'
            ? "Pengundian selesai! Peserta multi-slot otomatis dipisahkan (Bagan Atas & Bagan Bawah)."
            : "Pengundian selesai! Bagan pertandingan berhasil diacak."
        );
      }
    }
  };

  const handleSaveBracket = async () => {
    if (!hasAccess || isSpinning) return;
    setIsSavingBracket(true);
    const toastId = toast.loading("Menyimpan susunan bagan pertandingan...");
    try {
      const bracketData = {
        shuffledTeams,
        playInWinners,
        quarterFinals,
        semiFinals,
        finals,
        champion,
        eliminatedTeams: Array.from(eliminatedTeams),
      };
      const res = await saveBracket(gameSlug, bracketData);
      if (res.success) {
        toast.success("Bagan pertandingan berhasil disimpan!", { id: toastId });
      } else {
        toast.error(res.message || "Gagal menyimpan bagan", { id: toastId });
      }
    } catch (error: any) {
      toast.error(`Terjadi kesalahan: ${error.message || error}`, { id: toastId });
    } finally {
      setIsSavingBracket(false);
    }
  };

  const handleResetBracket = () => {
    if (!hasAccess || isSpinning) return;
    Swal.fire({
      title: "Reset Bagan Pertandingan?",
      text: "Seluruh susunan tim dan riwayat babak akan dikosongkan dan disimpan ke server.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Reset Bagan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const emptyBracket = {
          shuffledTeams: Array(isMLBB ? 18 : 16).fill(null),
          playInWinners: Array(2).fill(null),
          quarterFinals: Array(8).fill(null),
          semiFinals: Array(4).fill(null),
          finals: Array(2).fill(null),
          champion: null,
          eliminatedTeams: [],
        };
        setShuffledTeams(emptyBracket.shuffledTeams);
        setPlayInWinners(emptyBracket.playInWinners);
        setQuarterFinals(emptyBracket.quarterFinals);
        setSemiFinals(emptyBracket.semiFinals);
        setFinals(emptyBracket.finals);
        setChampion(emptyBracket.champion);
        setEliminatedTeams(new Set());

        // Simpan state reset ke database Supabase agar saat refresh tetap dalam keadaan ter-reset
        try {
          const res = await saveBracket(gameSlug, emptyBracket);
          if (res.success) {
            toast.success("Bagan pertandingan berhasil direset dan disimpan!");
          } else {
            toast.warning("Bagan lokal direset, namun gagal sinkronisasi ke server.");
          }
        } catch (e) {
          toast.warning("Bagan lokal direset, namun gagal sinkronisasi ke server.");
        }
      }
    });
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

  const handleInsertToBracket = (teamToInsert: Team) => {
    if (!hasAccess || isSpinning) return;
    
    const isExist = shuffledTeams.some(t => t?.id_tim === teamToInsert.id_tim);
    if (isExist) {
      toast.warning("Tim ini sudah ada di dalam bagan!");
      return;
    }
    
    // Cek apakah slot pasangannya dari peserta yang sama sudah ada di bagan
    const baseId = teamToInsert.id_tim.replace('-2', '');
    const isSlot2 = teamToInsert.id_tim.endsWith('-2');
    const partnerId = isSlot2 ? baseId : `${baseId}-2`;
    const partnerIndex = shuffledTeams.findIndex(t => t?.id_tim === partnerId);

    let emptySlotIndex = -1;

    if (partnerIndex !== -1) {
      // Pasangannya sudah ada di bagan!
      // Jika pasangannya di Bagan Atas (0..7), prioritaskan slot di Bagan Bawah (8..15)
      const partnerInPoolA = partnerIndex <= 7;
      const preferredPool = partnerInPoolA 
        ? [8, 9, 10, 11, 12, 13, 14, 15] 
        : [0, 1, 2, 3, 4, 5, 6, 7];
      
      const foundInPreferred = preferredPool.find(idx => shuffledTeams[idx] === null);
      if (foundInPreferred !== undefined) {
        emptySlotIndex = foundInPreferred;
      } else {
        // Jika pool preferensi penuh, cari slot mana pun ASALKAN bukan lawan langsung di Round 16
        const partnerMatch = Math.floor(partnerIndex / 2);
        emptySlotIndex = shuffledTeams.findIndex((t, idx) => t === null && Math.floor(idx / 2) !== partnerMatch);
      }
    } else {
      emptySlotIndex = shuffledTeams.findIndex(t => t === null);
    }
    
    if (emptySlotIndex === -1) {
      toast.error("Tidak ada slot bagan yang tersedia atau aman!");
      return;
    }
    
    setShuffledTeams(prev => {
      const newBracket = [...prev];
      newBracket[emptySlotIndex] = teamToInsert;
      return newBracket;
    });
    
    toast.success(`Berhasil memasukkan ${teamToInsert.nama_tim} ke bagan!`);
  };

  const handleTeamClick = async (team: Team | null, round: number, slotIndex: number) => {
    if (!team || !hasAccess || isSpinning) return;

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
        setQuarterFinals(prev => { const n = [...prev]; n[nextSlotIndex] = team; return n; });
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
      toast.error(`${team.nama_tim} tereliminasi.`);
    }
  };

  // Helper for rendering team slot
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

  // Dedicated Progression Handler for 18-Team Mobile Legends Two-Sided Bracket
  const handleMLBBTeamClick = async (
    team: Team | null,
    stage: 'r18' | 'playin_winner' | 'qf' | 'sf' | 'final',
    slotIndex: number,
    matchName?: string
  ) => {
    if (!team || !hasAccess || isSpinning) return;

    const result = await Swal.fire({
      title: `${team.nama_tim}`,
      text: matchName ? `${matchName} — Tentukan status tim ini:` : "Tentukan status tim ini:",
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
      if (stage === 'r18') {
        // Left Wing:
        if (slotIndex === 0 || slotIndex === 1) {
          setQuarterFinals(prev => { const n = [...prev]; n[0] = team; return n; });
        } else if (slotIndex === 2 || slotIndex === 3) {
          setQuarterFinals(prev => { const n = [...prev]; n[1] = team; return n; });
        } else if (slotIndex === 4 || slotIndex === 5) {
          setQuarterFinals(prev => { const n = [...prev]; n[2] = team; return n; });
        } else if (slotIndex === 7 || slotIndex === 8) {
          // Play-in Kiri (Match L4)
          setPlayInWinners(prev => { const n = [...prev]; n[0] = team; return n; });
        } else if (slotIndex === 6) {
          // Decider Kiri (Match L5 - Team 7 BYE)
          setQuarterFinals(prev => { const n = [...prev]; n[3] = team; return n; });
        }
        // Right Wing:
        else if (slotIndex === 9 || slotIndex === 10) {
          setQuarterFinals(prev => { const n = [...prev]; n[4] = team; return n; });
        } else if (slotIndex === 11 || slotIndex === 12) {
          setQuarterFinals(prev => { const n = [...prev]; n[5] = team; return n; });
        } else if (slotIndex === 13 || slotIndex === 14) {
          setQuarterFinals(prev => { const n = [...prev]; n[6] = team; return n; });
        } else if (slotIndex === 16 || slotIndex === 17) {
          // Play-in Kanan (Match R4)
          setPlayInWinners(prev => { const n = [...prev]; n[1] = team; return n; });
        } else if (slotIndex === 15) {
          // Decider Kanan (Match R5 - Team 16 BYE)
          setQuarterFinals(prev => { const n = [...prev]; n[7] = team; return n; });
        }
      } else if (stage === 'playin_winner') {
        // Pemenang Play-in memenangkan Match Decider
        if (slotIndex === 0) {
          setQuarterFinals(prev => { const n = [...prev]; n[3] = team; return n; });
        } else if (slotIndex === 1) {
          setQuarterFinals(prev => { const n = [...prev]; n[7] = team; return n; });
        }
      } else if (stage === 'qf') {
        // Quarterfinals to Semifinals:
        if (slotIndex === 0 || slotIndex === 1) {
          setSemiFinals(prev => { const n = [...prev]; n[0] = team; return n; });
        } else if (slotIndex === 2 || slotIndex === 3) {
          setSemiFinals(prev => { const n = [...prev]; n[1] = team; return n; });
        } else if (slotIndex === 4 || slotIndex === 5) {
          setSemiFinals(prev => { const n = [...prev]; n[2] = team; return n; });
        } else if (slotIndex === 6 || slotIndex === 7) {
          setSemiFinals(prev => { const n = [...prev]; n[3] = team; return n; });
        }
      } else if (stage === 'sf') {
        // Semifinals to Grand Final:
        if (slotIndex === 0 || slotIndex === 1) {
          setFinals(prev => { const n = [...prev]; n[0] = team; return n; });
        } else if (slotIndex === 2 || slotIndex === 3) {
          setFinals(prev => { const n = [...prev]; n[1] = team; return n; });
        }
      } else if (stage === 'final') {
        // Grand Final to Champion:
        setChampion(team);
      }

      if (eliminatedTeams.has(team.id_tim)) {
        setEliminatedTeams(prev => {
          const next = new Set(prev);
          next.delete(team.id_tim);
          return next;
        });
      }
      toast.success(`${team.nama_tim} melaju ke babak selanjutnya!`);
    } else if (result.isDenied) {
      setEliminatedTeams(prev => {
        const next = new Set(prev);
        next.add(team.id_tim);
        return next;
      });
      toast.error(`${team.nama_tim} tereliminasi.`);
    }
  };

  // Helper for rendering MLBB Pill Slot
  const renderMLBBTeamSlot = (
    team: Team | null,
    stage: 'r18' | 'playin_winner' | 'qf' | 'sf' | 'final',
    slotIndex: number,
    isGrandFinal = false,
    label?: string
  ) => {
    const isEliminated = team && eliminatedTeams.has(team.id_tim);
    const isChampionTeam = team && champion?.id_tim === team.id_tim;
    const isDarkArena = mlbbTheme === 'arena';

    let pillClasses = "relative flex items-center justify-between px-3 py-2 rounded-full border transition-all duration-200 select-none text-xs ";

    if (isGrandFinal) {
      pillClasses += isChampionTeam
        ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 border-amber-500 text-slate-950 font-black shadow-lg shadow-amber-400/40 scale-[1.03] "
        : "bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 border-amber-400 text-amber-950 font-bold shadow-md hover:border-amber-500 ";
    } else if (isDarkArena) {
      pillClasses += isEliminated
        ? "bg-slate-800/60 border-slate-700/60 text-slate-500 grayscale opacity-60 "
        : team
        ? "bg-white/95 text-slate-900 border-blue-200 shadow-md hover:bg-white hover:border-cyan-400 hover:shadow-cyan-500/20 "
        : "bg-slate-900/60 border-dashed border-blue-900/60 text-slate-400 ";
    } else {
      pillClasses += isEliminated
        ? "bg-slate-100/90 border-slate-200 text-slate-400 grayscale opacity-60 "
        : team
        ? "bg-white border-slate-200 hover:border-blue-400 hover:shadow-md text-slate-800 shadow-sm "
        : "bg-slate-50/80 border-dashed border-slate-200 text-slate-400 ";
    }

    if (team && hasAccess && !isSpinning) {
      pillClasses += "cursor-pointer active:scale-95 ";
    }

    return (
      <div
        onClick={() => handleMLBBTeamClick(team, stage, slotIndex, label)}
        className={pillClasses}
        title={team && hasAccess ? `Klik untuk tentukan lolos/gugur (${team.nama_tim})` : ""}
      >
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            isGrandFinal
              ? 'bg-amber-600'
              : team
              ? (isEliminated ? 'bg-slate-400' : 'bg-blue-500')
              : 'bg-slate-300'
          }`} />
          <span className={`truncate font-bold ${isEliminated ? 'line-through text-slate-400' : ''}`}>
            {team ? team.nama_tim : 'TBD (BYE)'}
          </span>
        </div>
        {team && (
          <span className="text-[10px] shrink-0 font-mono text-slate-400 ml-1">
            {isEliminated ? '❌' : (isChampionTeam ? '👑' : '')}
          </span>
        )}
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
    const roundsCount = [8, 4, 2, 1];
    
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
    const finalStartX = PADDING_X + 4 * COL_WIDTH + 3 * GAP;
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

  if (isLoading) return <FullPageLoader message="Memuat informasi E-Sport..." fullScreen={false} />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      {/* Header Utama */}
      <div className="flex items-center gap-4">
        <Link href="/event/esport" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            {gameTitle}
          </h1>
          <p className="text-sm text-slate-500">Informasi Umum Event</p>
        </div>
      </div>

      {/* SECTION 1: Informasi Umum Event */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="h-24 bg-gradient-to-r from-rose-500 to-pink-700 opacity-90 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
        </div>
        
        <div className="p-6 sm:p-8 relative">
          <div className="flex justify-between items-start mb-6">
            <div className="-mt-16 w-20 h-20 rounded-2xl bg-rose-50 border-4 border-white shadow-lg flex items-center justify-center relative z-10">
              <Gamepad2 className="w-8 h-8 text-rose-600" />
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
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tempat / Lokasi</label>
                  <input 
                    type="text" 
                    value={formDataEvent.tempat}
                    onChange={(e) => setFormDataEvent({...formDataEvent, tempat: e.target.value})}
                    placeholder="Contoh: GOR UNP"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Status Event</label>
                  <select 
                    value={formDataEvent.status}
                    onChange={(e) => setFormDataEvent({...formDataEvent, status: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
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
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
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
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-rose-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
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
                <th className="px-6 py-4 font-semibold">{game === 'mlbb' ? 'NAMA TIM' : 'NAMA LENGKAP'}</th>
                <th className="px-6 py-4 font-semibold">KAPTEN / PIC</th>
                <th className="px-6 py-4 font-semibold">KONTAK WA</th>
                {game === 'efootball' && (
                  <th className="px-6 py-4 font-semibold">SLOT</th>
                )}
                <th className="px-6 py-4 font-semibold text-right">STATUS BAYAR</th>
                <th className="px-6 py-4 font-semibold text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={game === 'efootball' ? 6 : 5} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                      <Gamepad2 className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-slate-800 font-semibold mb-1">Belum ada pendaftar</h3>
                    <p className="text-sm text-slate-500">Data dari pendaftar official web akan muncul di sini.</p>
                  </td>
                </tr>
              ) : (
                teams.map((team, idx) => (
                  <tr key={team.id_tim || idx} className="hover:bg-slate-50/50 transition-colors">
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
                    {game === 'efootball' && (
                      <td className="px-6 py-4">
                        {team.slot_count === '2' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-800 text-sm">2 Slot</span>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md inline-block w-fit">Tim 2: {team.in_game_slot2 || '-'}</span>
                          </div>
                        ) : <span className="font-medium text-slate-600 text-sm">1 Slot</span>}
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold ${
                        team.status_bayar === 'Lunas' ? 'bg-emerald-100 text-emerald-700' :
                        team.status_bayar === 'DP' ? 'bg-blue-100 text-blue-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {team.status_bayar}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {hasAccess && (
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleInsertToBracket(team)}
                            disabled={isSpinning || shuffledTeams.some(t => t?.id_tim === team.id_tim)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {shuffledTeams.some(t => t?.id_tim === team.id_tim) 
                              ? (game === 'efootball' && team.slot_count === '2' ? 'Slot 1 Di Bagan' : 'Di Bagan') 
                              : (game === 'efootball' && team.slot_count === '2' ? 'Masukkan Slot 1' : 'Masukkan ke Bagan')}
                          </button>
                          {game === 'efootball' && team.slot_count === '2' && (
                            <button
                              onClick={() => handleInsertToBracket({
                                ...team,
                                id_tim: team.id_tim + '-2',
                                nama_tim: team.in_game_slot2 || `${team.nama_tim} (Tim 2)`
                              })}
                              disabled={isSpinning || shuffledTeams.some(t => t?.id_tim === team.id_tim + '-2')}
                              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              {shuffledTeams.some(t => t?.id_tim === team.id_tim + '-2') ? 'Slot 2 Di Bagan' : 'Masukkan Slot 2'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Turnamen Bracket Viewer */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        {/* Section 3 Header & Controls */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isMLBB ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-amber-50 border-amber-200 text-amber-600'
            }`}>
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">
                  {isMLBB ? "Bagan Pertandingan Mobile Legends" : "Bagan Pertandingan E-Football"}
                </h2>
                {isMLBB && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Format 18 Tim
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isMLBB 
                  ? "Bagan Kejuaraan 2 Sayap Konvergen Menuju Grand Final & Pemenang Trofi" 
                  : "Preview Bracket Turnamen & Pengundian"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {isMLBB && (
              <button 
                onClick={() => setMlbbTheme(prev => prev === 'arena' ? 'clean' : 'arena')}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 shadow-sm ${
                  mlbbTheme === 'arena' 
                    ? 'bg-slate-900 text-cyan-300 border-slate-700 hover:bg-slate-800' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Ganti Tema Visual Bagan"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{mlbbTheme === 'arena' ? 'Tema Arena MLBB' : 'Tema Bersih'}</span>
              </button>
            )}

            {hasAccess && (
              <>
                <button 
                  onClick={toggleSpin}
                  disabled={isSavingBracket}
                  className={`px-4 py-2 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 ${
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
                <button 
                  onClick={handleSaveBracket}
                  disabled={isSpinning || isSavingBracket}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  title="Simpan susunan bagan pertandingan ke server agar tidak hilang saat di-refresh"
                >
                  {isSavingBracket ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan Bagan</span>
                </button>
                <button 
                  onClick={handleResetBracket}
                  disabled={isSpinning || isSavingBracket}
                  className="px-3 py-2 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 hover:border-rose-200 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                  title="Kosongkan bagan pertandingan dan reset di database"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Reset Bagan</span>
                </button>
              </>
            )}
            <button 
              onClick={toggleFullscreen}
              className="p-2 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
              title="Layar Penuh"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BRACKET CANVAS CONTAINER */}
        <div 
          ref={bracketRef} 
          className={`w-full overflow-x-auto relative transition-colors duration-300 ${
            isFullscreen 
              ? (isMLBB && mlbbTheme === 'arena' ? 'bg-[#030712] p-8 sm:p-12 h-screen' : 'bg-slate-50 p-8 sm:p-12 h-screen') 
              : (isMLBB && mlbbTheme === 'arena' ? 'bg-[#030712] p-6 sm:p-8' : 'bg-slate-50/50 p-6 sm:p-8')
          }`}
        >
          {isFullscreen && (
            <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
              {isMLBB && (
                <button 
                  onClick={() => setMlbbTheme(prev => prev === 'arena' ? 'clean' : 'arena')}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900/90 text-cyan-300 border border-slate-700 shadow-lg flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{mlbbTheme === 'arena' ? 'Tema Arena' : 'Tema Bersih'}</span>
                </button>
              )}
              {hasAccess && (
                <>
                  <button 
                    onClick={toggleSpin}
                    disabled={isSavingBracket}
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
                  <button 
                    onClick={handleSaveBracket}
                    disabled={isSpinning || isSavingBracket}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSavingBracket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Bagan
                  </button>
                  <button 
                    onClick={handleResetBracket}
                    disabled={isSpinning || isSavingBracket}
                    className="px-4 py-2.5 bg-white/90 hover:bg-white text-slate-700 hover:text-rose-600 text-sm font-semibold rounded-xl border border-slate-200 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500" />
                    Reset
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

          {/* ======================================================== */}
          {/* CASE A: MOBILE LEGENDS 18-TEAM TWO-SIDED CONVERGING ARENA */}
          {/* ======================================================== */}
          {isMLBB ? (
            <div className="relative z-10 min-w-[1440px] max-w-[1600px] mx-auto select-none">
              
              {/* BANNER HEADER */}
              <div className="relative rounded-2xl overflow-hidden mb-8 border border-blue-500/30 shadow-2xl bg-[#091b3a]">
                <img 
                  src="/images/bracket-mlbb-bg.png" 
                  alt="Bagan Mobile Legends SI FEST 2026" 
                  className="w-full h-auto object-cover max-h-[175px] opacity-90 hover:opacity-100 transition-opacity" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#040b18] via-[#040b18]/40 to-transparent flex items-end p-5">
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider shadow">
                          E-SPORT • SI FEST 2026
                        </span>
                        <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          18 Tim Peserta
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          Mobile Legends 5v5 MOBA
                        </span>
                      </div>
                      <h3 className="text-white font-black text-xl sm:text-2xl mt-1 tracking-wide drop-shadow-md">
                        BAGAN TURNAMEN MOBILE LEGENDS: BANG BANG
                      </h3>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-blue-500/30">
                      <div className="text-right">
                        <div className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">Format Pertandingan</div>
                        <div className="text-xs font-bold text-white">2 Sayap Konvergen Menuju Grand Final</div>
                      </div>
                      <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 7-COLUMNS CHAMPIONSHIP TOURNAMENT BRACKET */}
              <div className={`p-6 sm:p-8 rounded-2xl border transition-all ${
                mlbbTheme === 'arena' 
                  ? 'bg-gradient-to-b from-[#061226] via-[#081a38] to-[#040a15] border-blue-900/60 shadow-2xl text-white' 
                  : 'bg-white border-slate-200 text-slate-800 shadow-sm'
              }`}>
                
                {/* COLUMN TITLES HEADER ROW */}
                <div className="grid grid-cols-7 gap-6 text-center mb-6 pb-3 border-b border-blue-500/20">
                  <div className="text-xs font-black tracking-wider text-blue-400 uppercase">
                    ROUND OF 18 →
                    <div className="text-[9px] font-medium text-slate-400">Sayap Kiri (9 Tim)</div>
                  </div>
                  <div className="text-xs font-black tracking-wider text-cyan-400 uppercase">
                    QUARTERFINALS →
                    <div className="text-[9px] font-medium text-slate-400">4 Tim Pemenang</div>
                  </div>
                  <div className="text-xs font-black tracking-wider text-indigo-400 uppercase">
                    SEMIFINAL →
                    <div className="text-[9px] font-medium text-slate-400">Tiket Final Kiri</div>
                  </div>
                  <div className="text-xs font-black tracking-wider text-amber-400 uppercase">
                    👑 GRAND FINAL 👑
                    <div className="text-[9px] font-medium text-amber-300/80">Puncak Juara MLBB</div>
                  </div>
                  <div className="text-xs font-black tracking-wider text-indigo-400 uppercase">
                    ← SEMIFINAL
                    <div className="text-[9px] font-medium text-slate-400">Tiket Final Kanan</div>
                  </div>
                  <div className="text-xs font-black tracking-wider text-cyan-400 uppercase">
                    ← QUARTERFINALS
                    <div className="text-[9px] font-medium text-slate-400">4 Tim Pemenang</div>
                  </div>
                  <div className="text-xs font-black tracking-wider text-blue-400 uppercase">
                    ← ROUND OF 18
                    <div className="text-[9px] font-medium text-slate-400">Sayap Kanan (9 Tim)</div>
                  </div>
                </div>

                {/* 7 COLUMNS MAIN ARENA */}
                <div className="grid grid-cols-7 gap-6 items-center">

                  {/* ========================================= */}
                  {/* COLUMN 1: LEFT ROUND OF 18 (9 TEAMS)      */}
                  {/* ========================================= */}
                  <div className="flex flex-col gap-4">
                    {/* Match L1 */}
                    <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                      mlbbTheme === 'arena' 
                        ? 'bg-[#0a1832]/90 border-blue-900/80 shadow-md hover:border-blue-500' 
                        : 'bg-slate-50 border-slate-200 shadow-sm hover:border-slate-300'
                    }`}>
                      <div className="flex justify-between items-center text-[10px] font-bold px-1">
                        <span className="text-blue-400">Match 1</span>
                        <span className="text-[9px] text-slate-400">Lolos ke QF 1 →</span>
                      </div>
                      {renderMLBBTeamSlot(shuffledTeams[0], 'r18', 0, false, 'Match 1')}
                      {renderMLBBTeamSlot(shuffledTeams[1], 'r18', 1, false, 'Match 1')}
                    </div>

                    {/* Match L2 */}
                    <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                      mlbbTheme === 'arena' 
                        ? 'bg-[#0a1832]/90 border-blue-900/80 shadow-md hover:border-blue-500' 
                        : 'bg-slate-50 border-slate-200 shadow-sm hover:border-slate-300'
                    }`}>
                      <div className="flex justify-between items-center text-[10px] font-bold px-1">
                        <span className="text-blue-400">Match 2</span>
                        <span className="text-[9px] text-slate-400">Lolos ke QF 1 →</span>
                      </div>
                      {renderMLBBTeamSlot(shuffledTeams[2], 'r18', 2, false, 'Match 2')}
                      {renderMLBBTeamSlot(shuffledTeams[3], 'r18', 3, false, 'Match 2')}
                    </div>

                    {/* Match L3 */}
                    <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                      mlbbTheme === 'arena' 
                        ? 'bg-[#0a1832]/90 border-blue-900/80 shadow-md hover:border-blue-500' 
                        : 'bg-slate-50 border-slate-200 shadow-sm hover:border-slate-300'
                    }`}>
                      <div className="flex justify-between items-center text-[10px] font-bold px-1">
                        <span className="text-blue-400">Match 3</span>
                        <span className="text-[9px] text-slate-400">Lolos ke QF 2 →</span>
                      </div>
                      {renderMLBBTeamSlot(shuffledTeams[4], 'r18', 4, false, 'Match 3')}
                      {renderMLBBTeamSlot(shuffledTeams[5], 'r18', 5, false, 'Match 3')}
                    </div>

                    {/* Match L4 & L5 (Play-in & Decider Kiri) */}
                    <div className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-all ${
                      mlbbTheme === 'arena' 
                        ? 'bg-gradient-to-b from-[#0e244d] to-[#07152d] border-amber-500/40 shadow-lg' 
                        : 'bg-amber-50/40 border-amber-200 shadow-sm'
                    }`}>
                      {/* Decider Match L5 */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-black px-1 text-amber-400 mb-1">
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3 text-amber-400" /> Decider L5
                          </span>
                          <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            Tiket QF 2 →
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {renderMLBBTeamSlot(shuffledTeams[6], 'r18', 6, false, 'Decider L5 (Tim 7 BYE)')}
                          {renderMLBBTeamSlot(playInWinners[0], 'playin_winner', 0, false, 'Decider L5 (Pemenang Play-in L4)')}
                        </div>
                      </div>

                      {/* Play-in Match L4 */}
                      <div className="border-t border-dashed border-blue-700/60 pt-2">
                        <div className="flex items-center justify-between text-[9px] font-bold px-1 text-blue-300 mb-1">
                          <span className="flex items-center gap-1">
                            <Swords className="w-2.5 h-2.5" /> Babak Play-in L4
                          </span>
                          <span className="text-slate-400 text-[8px]">Ke Decider ↑</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {renderMLBBTeamSlot(shuffledTeams[7], 'r18', 7, false, 'Play-in L4 (Tim 8)')}
                          {renderMLBBTeamSlot(shuffledTeams[8], 'r18', 8, false, 'Play-in L4 (Tim 9)')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ========================================= */}
                  {/* COLUMN 2: LEFT QUARTERFINALS (4 TEAMS)    */}
                  {/* ========================================= */}
                  <div className="flex flex-col gap-10">
                    {/* QF 1 */}
                    <div className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                      mlbbTheme === 'arena' 
                        ? 'bg-[#0a1832]/90 border-cyan-900/80 shadow-md hover:border-cyan-500' 
                        : 'bg-slate-50 border-slate-200 shadow-sm hover:border-slate-300'
                    }`}>
                      <div className="flex justify-between items-center text-[10px] font-bold px-1">
                        <span className="text-cyan-400 font-extrabold">Quarterfinal 1</span>
                        <span className="text-[9px] text-slate-400">Ke Semifinal 1 →</span>
                      </div>
                      {renderMLBBTeamSlot(quarterFinals[0], 'qf', 0, false, 'Quarterfinal 1')}
                      {renderMLBBTeamSlot(quarterFinals[1], 'qf', 1, false, 'Quarterfinal 1')}
                    </div>

                    {/* QF 2 */}
                    <div className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                      mlbbTheme === 'arena' 
                        ? 'bg-[#0a1832]/90 border-cyan-900/80 shadow-md hover:border-cyan-500' 
                        : 'bg-slate-50 border-slate-200 shadow-sm hover:border-slate-300'
                    }`}>
                      <div className="flex justify-between items-center text-[10px] font-bold px-1">
                        <span className="text-cyan-400 font-extrabold">Quarterfinal 2</span>
                        <span className="text-[9px] text-slate-400">Ke Semifinal 1 →</span>
                      </div>
                      {renderMLBBTeamSlot(quarterFinals[2], 'qf', 2, false, 'Quarterfinal 2')}
                      {renderMLBBTeamSlot(quarterFinals[3], 'qf', 3, false, 'Quarterfinal 2')}
                    </div>
                  </div>

                  {/* ========================================= */}
                  {/* COLUMN 3: LEFT SEMIFINAL (2 TEAMS)        */}
                  {/* ========================================= */}
                  <div className="flex flex-col justify-center">
                    <div className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all ${
                      mlbbTheme === 'arena' 
                        ? 'bg-gradient-to-b from-[#0f2856] to-[#091b38] border-indigo-500/50 shadow-xl' 
                        : 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                    }`}>
                      <div className="flex justify-between items-center text-[10px] font-black px-1">
                        <span className="text-indigo-300">SEMIFINAL 1</span>
                        <span className="text-[9px] text-amber-300">Ke Grand Final →</span>
                      </div>
                      {renderMLBBTeamSlot(semiFinals[0], 'sf', 0, false, 'Semifinal 1 (Atas)')}
                      {renderMLBBTeamSlot(semiFinals[1], 'sf', 1, false, 'Semifinal 1 (Bawah)')}
                    </div>
                  </div>

                  {/* ========================================= */}
                  {/* COLUMN 4: CENTER GRAND FINAL & TROPHY     */}
                  {/* ========================================= */}
                  <div className="flex flex-col items-center justify-center gap-6">
                    {/* GRAND FINAL MATCH CARD */}
                    <div className={`w-full p-4 rounded-2xl border-2 flex flex-col gap-2.5 transition-all relative ${
                      mlbbTheme === 'arena'
                        ? 'bg-gradient-to-b from-amber-500/10 via-[#0d2247] to-[#061226] border-amber-400/80 shadow-2xl shadow-amber-500/20'
                        : 'bg-gradient-to-b from-amber-50 via-white to-amber-50/50 border-amber-300 shadow-lg'
                    }`}>
                      <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400">
                        <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
                        <span>GRAND FINAL MATCH</span>
                        <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
                      </div>
                      
                      {/* Left Finalist */}
                      <div className="flex flex-col gap-1">
                        <div className="text-[9px] font-bold text-amber-400/90 px-1">Finalis Sayap Kiri:</div>
                        {renderMLBBTeamSlot(finals[0], 'final', 0, true, 'Grand Finalist Kiri')}
                      </div>

                      {/* VS Divider */}
                      <div className="flex items-center justify-center gap-2 my-0.5">
                        <div className="h-[1px] bg-amber-400/40 flex-1"></div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] shadow">
                          VS
                        </span>
                        <div className="h-[1px] bg-amber-400/40 flex-1"></div>
                      </div>

                      {/* Right Finalist */}
                      <div className="flex flex-col gap-1">
                        <div className="text-[9px] font-bold text-amber-400/90 px-1 text-right">Finalis Sayap Kanan:</div>
                        {renderMLBBTeamSlot(finals[1], 'final', 1, true, 'Grand Finalist Kanan')}
                      </div>
                    </div>

                    {/* CENTER TROPHY & MOBILE LEGENDS LOGO */}
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full"></div>
                        <Trophy className="w-16 h-16 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] relative z-10" />
                      </div>
                      <div className="text-[11px] font-black tracking-widest text-amber-300 mt-2 uppercase">
                        MOBILE LEGENDS
                      </div>
                      <div className="text-[9px] font-medium text-blue-300 uppercase tracking-widest">
                        5v5 Fair MOBA for Mobile
                      </div>
                    </div>

                    {/* CHAMPION SHOWCASE */}
                    <div className={`w-full p-4 rounded-2xl border text-center transition-all ${
                      champion 
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 border-amber-500 text-slate-950 shadow-xl shadow-amber-400/30' 
                        : (mlbbTheme === 'arena' ? 'bg-[#081833]/60 border-blue-900/60 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-400')
                    }`}>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Trophy className={`w-4 h-4 ${champion ? 'text-amber-900' : 'text-slate-400'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${champion ? 'text-amber-950' : 'text-slate-400'}`}>
                          {champion ? 'JUARA 1 SI FEST 2026' : 'CHAMPION'}
                        </span>
                      </div>
                      <div className={`text-base font-black truncate px-2 ${champion ? 'text-slate-950 font-extrabold' : 'text-slate-400'}`}>
                        {champion ? champion.nama_tim : 'Trofi Menanti Juara'}
                      </div>
                      {champion && (
                        <div className="text-[10px] font-medium text-amber-950/80 mt-0.5">
                          Kapten: {champion.kapten}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ========================================= */}
                  {/* COLUMN 5: RIGHT SEMIFINAL (2 TEAMS)       */}
                  {/* ========================================= */}
                  <div className="flex flex-col justify-center">
                    <div className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all ${
                      mlbbTheme === 'arena' 
                        ? 'bg-gradient-to-b from-[#0f2856] to-[#091b38] border-indigo-500/50 shadow-xl' 
                        : 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                    }`}>
                      <div className="flex justify-between items-center text-[10px] font-black px-1">
                        <span className="text-amber-300">← Ke Grand Final</span>
                        <span className="text-indigo-300">SEMIFINAL 2</span>
                      </div>
                      {renderMLBBTeamSlot(semiFinals[2], 'sf', 2, false, 'Semifinal 2 (Atas)')}
                      {renderMLBBTeamSlot(semiFinals[3], 'sf', 3, false, 'Semifinal 2 (Bawah)')}
                    </div>
                  </div>

                  {/* ========================================= */}
                  {/* COLUMN 6: RIGHT QUARTERFINALS (4 TEAMS)   */}
                  {/* ========================================= */}
                  <div className="flex flex-col gap-10">
                    {/* QF 3 */}
                    <div className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                      mlbbTheme === 'arena' 
                        ? 'bg-[#0a1832]/90 border-cyan-900/80 shadow-md hover:border-cyan-500' 
                        : 'bg-slate-50 border-slate-200 shadow-sm hover:border-slate-300'
                    }`}>
                      <div className="flex justify-between items-center text-[10px] font-bold px-1">
                        <span className="text-[9px] text-slate-400">← Ke Semifinal 2</span>
                        <span className="text-cyan-400 font-extrabold">Quarterfinal 3</span>
                      </div>
                      {renderMLBBTeamSlot(quarterFinals[4], 'qf', 4, false, 'Quarterfinal 3')}
                      {renderMLBBTeamSlot(quarterFinals[5], 'qf', 5, false, 'Quarterfinal 3')}
                    </div>

                    {/* QF 4 */}
                    <div className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                      mlbbTheme === 'arena' 
                        ? 'bg-[#0a1832]/90 border-cyan-900/80 shadow-md hover:border-cyan-500' 
                        : 'bg-slate-50 border-slate-200 shadow-sm hover:border-slate-300'
                    }`}>
                      <div className="flex justify-between items-center text-[10px] font-bold px-1">
                        <span className="text-[9px] text-slate-400">← Ke Semifinal 2</span>
                        <span className="text-cyan-400 font-extrabold">Quarterfinal 4</span>
                      </div>
                      {renderMLBBTeamSlot(quarterFinals[6], 'qf', 6, false, 'Quarterfinal 4')}
                      {renderMLBBTeamSlot(quarterFinals[7], 'qf', 7, false, 'Quarterfinal 4')}
                    </div>
                  </div>

                  {/* ========================================= */}
                  {/* COLUMN 7: RIGHT ROUND OF 18 (9 TEAMS)     */}
                  {/* ========================================= */}
                  <div className="flex flex-col gap-4">
                    {/* Match R1 (Match 6) */}
                    <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                      mlbbTheme === 'arena' 
                        ? 'bg-[#0a1832]/90 border-blue-900/80 shadow-md hover:border-blue-500' 
                        : 'bg-slate-50 border-slate-200 shadow-sm hover:border-slate-300'
                    }`}>
                      <div className="flex justify-between items-center text-[10px] font-bold px-1">
                        <span className="text-[9px] text-slate-400">← Lolos ke QF 3</span>
                        <span className="text-blue-400">Match 6</span>
                      </div>
                      {renderMLBBTeamSlot(shuffledTeams[9], 'r18', 9, false, 'Match 6')}
                      {renderMLBBTeamSlot(shuffledTeams[10], 'r18', 10, false, 'Match 6')}
                    </div>

                    {/* Match R2 (Match 7) */}
                    <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                      mlbbTheme === 'arena' 
                        ? 'bg-[#0a1832]/90 border-blue-900/80 shadow-md hover:border-blue-500' 
                        : 'bg-slate-50 border-slate-200 shadow-sm hover:border-slate-300'
                    }`}>
                      <div className="flex justify-between items-center text-[10px] font-bold px-1">
                        <span className="text-[9px] text-slate-400">← Lolos ke QF 3</span>
                        <span className="text-blue-400">Match 7</span>
                      </div>
                      {renderMLBBTeamSlot(shuffledTeams[11], 'r18', 11, false, 'Match 7')}
                      {renderMLBBTeamSlot(shuffledTeams[12], 'r18', 12, false, 'Match 7')}
                    </div>

                    {/* Match R3 (Match 8) */}
                    <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                      mlbbTheme === 'arena' 
                        ? 'bg-[#0a1832]/90 border-blue-900/80 shadow-md hover:border-blue-500' 
                        : 'bg-slate-50 border-slate-200 shadow-sm hover:border-slate-300'
                    }`}>
                      <div className="flex justify-between items-center text-[10px] font-bold px-1">
                        <span className="text-[9px] text-slate-400">← Lolos ke QF 4</span>
                        <span className="text-blue-400">Match 8</span>
                      </div>
                      {renderMLBBTeamSlot(shuffledTeams[13], 'r18', 13, false, 'Match 8')}
                      {renderMLBBTeamSlot(shuffledTeams[14], 'r18', 14, false, 'Match 8')}
                    </div>

                    {/* Match R4 & R5 (Play-in & Decider Kanan) */}
                    <div className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-all ${
                      mlbbTheme === 'arena' 
                        ? 'bg-gradient-to-b from-[#0e244d] to-[#07152d] border-amber-500/40 shadow-lg' 
                        : 'bg-amber-50/40 border-amber-200 shadow-sm'
                    }`}>
                      {/* Decider Match R5 */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-black px-1 text-amber-400 mb-1">
                          <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            ← Tiket QF 4
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3 text-amber-400" /> Decider R5
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {renderMLBBTeamSlot(shuffledTeams[15], 'r18', 15, false, 'Decider R5 (Tim 16 BYE)')}
                          {renderMLBBTeamSlot(playInWinners[1], 'playin_winner', 1, false, 'Decider R5 (Pemenang Play-in R4)')}
                        </div>
                      </div>

                      {/* Play-in Match R4 */}
                      <div className="border-t border-dashed border-blue-700/60 pt-2">
                        <div className="flex items-center justify-between text-[9px] font-bold px-1 text-blue-300 mb-1">
                          <span className="text-slate-400 text-[8px]">Ke Decider ↑</span>
                          <span className="flex items-center gap-1">
                            <Swords className="w-2.5 h-2.5" /> Babak Play-in R4
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {renderMLBBTeamSlot(shuffledTeams[16], 'r18', 16, false, 'Play-in R4 (Tim 17)')}
                          {renderMLBBTeamSlot(shuffledTeams[17], 'r18', 17, false, 'Play-in R4 (Tim 18)')}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          ) : (
            // ========================================================
            // CASE B: E-FOOTBALL 16-SLOT LINEAR BRACKET
            // ========================================================
            <div className="relative z-10 min-w-[1000px] h-[800px] flex gap-12 px-4 py-4 mx-auto max-w-max">
              <SVGLines />
              
              {/* Round 1 (16 Teams) */}
              <div className="flex flex-col justify-around w-56 shrink-0 relative z-10">
                <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">Round of 16</div>
                {Array(8).fill(0).map((_, i) => (
                  <div key={`r1-${i}`} className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs relative">
                    <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                      <span>Match {i + 1}</span>
                      <span className={`px-1 rounded text-[8px] font-bold ${i < 4 ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {i < 4 ? 'Bagan Atas' : 'Bagan Bawah'}
                      </span>
                    </div>
                    {renderTeamSlot(shuffledTeams[i * 2], 1, i * 2, true)}
                    {renderTeamSlot(shuffledTeams[i * 2 + 1], 1, i * 2 + 1, false)}
                  </div>
                ))}
              </div>

              {/* Quarterfinals */}
              <div className="flex flex-col justify-around w-56 shrink-0 relative z-10">
                <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">Quarterfinals</div>
                {Array(4).fill(0).map((_, i) => (
                  <div key={`qf-${i}`} className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs relative">
                    {renderTeamSlot(quarterFinals[i * 2], 2, i * 2, true)}
                    {renderTeamSlot(quarterFinals[i * 2 + 1], 2, i * 2 + 1, false)}
                  </div>
                ))}
              </div>

              {/* Semifinals */}
              <div className="flex flex-col justify-around w-56 shrink-0 relative z-10">
                <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">Semifinals</div>
                {Array(2).fill(0).map((_, i) => (
                  <div key={`sf-${i}`} className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs relative">
                    {renderTeamSlot(semiFinals[i * 2], 3, i * 2, true)}
                    {renderTeamSlot(semiFinals[i * 2 + 1], 3, i * 2 + 1, false)}
                  </div>
                ))}
              </div>

              {/* Final */}
              <div className="flex flex-col justify-around w-56 shrink-0 relative z-10">
                <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">Grand Final</div>
                <div className="w-full bg-white border border-amber-300 shadow-md rounded-lg overflow-hidden flex flex-col text-xs relative">
                  <div className="bg-amber-100 text-amber-700 text-[10px] font-bold text-center py-1 uppercase tracking-wider">Final Match</div>
                  {renderTeamSlot(finals[0], 4, 0, true)}
                  {renderTeamSlot(finals[1], 4, 1, false)}
                </div>
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
          )}

        </div>
      </div>
    </div>
  );
}
