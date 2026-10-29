"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Gamepad2, Save, Edit3, User, Phone, MapPin, CalendarDays, Activity, Trash2, Plus, Trophy, Info, Users, Sparkles, Swords, Crown, Shield } from "lucide-react";
import { SCRIPT_URL } from "@/lib/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import FullPageLoader from "@/components/FullPageLoader";
import { getEsportRegistrations, saveBracket } from "../actions";
import { Loader2, Shuffle, Maximize, Minimize, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
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
  const [zoomScale, setZoomScale] = useState(1);
  const [isAutoFit, setIsAutoFit] = useState(true);
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

  const calculateFitScale = () => {
    const baseWidth = 1900;
    const baseHeight = 860;
    
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
    
    // Ruang yang disisakan untuk toolbar atas dan margin aman
    const availableWidth = Math.max(300, vw - 48);
    const availableHeight = Math.max(300, vh - 80);
    
    const scaleW = availableWidth / baseWidth;
    const scaleH = availableHeight / baseHeight;
    
    // Gunakan Math.floor agar ukuran hasil scaling tidak pernah melebihi batas piksel (mencegah scrollbar muncul)
    const fit = Math.floor(Math.min(scaleW, scaleH) * 100) / 100;
    return Math.min(1.0, Math.max(0.2, fit));
  };

  useEffect(() => {
    const updateScale = () => {
      if (document.fullscreenElement) {
        setIsAutoFit(true);
        setZoomScale(calculateFitScale());
      }
    };

    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (active) {
        setIsAutoFit(true);
        setZoomScale(calculateFitScale());
        setTimeout(updateScale, 50);
        setTimeout(updateScale, 150);
      } else {
        setZoomScale(1);
        setIsAutoFit(false);
      }
    };

    const handleResize = () => {
      if (document.fullscreenElement && isAutoFit) {
        setZoomScale(calculateFitScale());
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!document.fullscreenElement) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setIsAutoFit(false);
        setZoomScale(prev => Math.min(2.0, Math.round((prev + 0.1) * 100) / 100));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setIsAutoFit(false);
        setZoomScale(prev => Math.max(0.25, Math.round((prev - 0.1) * 100) / 100));
      } else if (e.key === '0') {
        e.preventDefault();
        setIsAutoFit(true);
        setZoomScale(calculateFitScale());
      } else if (e.key === '1') {
        e.preventDefault();
        setIsAutoFit(false);
        setZoomScale(1);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMLBB, isAutoFit]);

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
      setIsAutoFit(true);
      setZoomScale(calculateFitScale());
      bracketRef.current?.requestFullscreen().then(() => {
        setZoomScale(calculateFitScale());
      }).catch(() => {
        toast.error("Gagal masuk ke mode fullscreen");
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleZoomIn = () => {
    setIsAutoFit(false);
    setZoomScale(prev => Math.min(2.0, Math.round((prev + 0.1) * 100) / 100));
  };

  const handleZoomOut = () => {
    setIsAutoFit(false);
    setZoomScale(prev => Math.max(0.25, Math.round((prev - 0.1) * 100) / 100));
  };

  const handleFitScreen = () => {
    setIsAutoFit(true);
    setZoomScale(calculateFitScale());
  };

  const handleZoomReset = () => {
    setIsAutoFit(false);
    setZoomScale(1);
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

  // Helper for rendering clean dashboard team slot (abu-abu putih)
  const renderTeamSlot = (
    team: Team | null, 
    roundOrStage: number | 'r18' | 'playin_winner' | 'qf' | 'sf' | 'final', 
    slotIndex: number, 
    isTop: boolean
  ) => {
    const isEliminated = team && eliminatedTeams.has(team.id_tim);
    const bgClass = isTop ? 'bg-slate-50 border-b border-slate-100' : 'bg-white';
    const cursorClass = team && hasAccess && !isSpinning ? 'cursor-pointer hover:bg-slate-100 transition-colors' : '';
    const textClass = team ? (isEliminated ? 'text-slate-400 line-through' : 'text-slate-800') : 'text-slate-400';
    
    return (
      <div 
        className={`px-3 py-2 flex justify-between items-center ${bgClass} ${cursorClass} ${isEliminated ? 'opacity-50 grayscale' : ''}`}
        onClick={() => {
          if (isMLBB) {
            handleMLBBTeamClick(team, roundOrStage as any, slotIndex);
          } else {
            handleTeamClick(team, roundOrStage as number, slotIndex);
          }
        }}
        title={team && hasAccess ? "Klik untuk ubah status lolos/gagal" : ""}
      >
        <span className={`font-semibold ${textClass} truncate max-w-[160px]`}>
          {team ? team.nama_tim : 'TBD (BYE)'}
        </span>
        <span className="text-slate-300 font-mono">-</span>
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

  // SVG Lines generator for 18-Team Two-Sided Bracket (Abu-abu putih bersih)
  const MLBB18Lines = () => {
    const paths: string[] = [];

    // Left Wing (Flow Left -> Right):
    // Match 1 (y=100) -> QF 1 (y=180)
    paths.push("M 240 100 L 264 100 L 264 180 L 288 180");
    // Match 2 (y=260) -> QF 1 (y=180)
    paths.push("M 240 260 L 264 260 L 264 180 L 288 180");

    // Match 3 (y=460) -> QF 2 (y=620)
    paths.push("M 240 460 L 264 460 L 264 620 L 288 620");
    // Match 5 Decider (y=780) -> QF 2 (y=620)
    paths.push("M 240 780 L 264 780 L 264 620 L 288 620");

    // Match 4 Play-in (y=620) -> Match 5 Decider (y=780)
    paths.push("M 240 620 L 254 620 L 254 750 L 240 750");

    // QF 1 (y=180) -> Left SF (y=400)
    paths.push("M 512 180 L 536 180 L 536 400 L 560 400");
    // QF 2 (y=620) -> Left SF (y=400)
    paths.push("M 512 620 L 536 620 L 536 400 L 560 400");

    // Left SF (y=400) -> Grand Final (y=400)
    paths.push("M 784 400 L 832 400");

    // Grand Final to Champion
    paths.push("M 944 445 L 944 500");

    // Right SF (y=400) -> Grand Final (y=400)
    paths.push("M 1104 400 L 1056 400");

    // QF 3 (y=180) -> Right SF (y=400)
    paths.push("M 1376 180 L 1352 180 L 1352 400 L 1328 400");
    // QF 4 (y=620) -> Right SF (y=400)
    paths.push("M 1376 620 L 1352 620 L 1352 400 L 1328 400");

    // Match 6 (y=100) -> QF 3 (y=180)
    paths.push("M 1648 100 L 1624 100 L 1624 180 L 1600 180");
    // Match 7 (y=260) -> QF 3 (y=180)
    paths.push("M 1648 260 L 1624 260 L 1624 180 L 1600 180");

    // Match 8 (y=460) -> QF 4 (y=620)
    paths.push("M 1648 460 L 1624 460 L 1624 620 L 1600 620");
    // Match 10 Decider (y=780) -> QF 4 (y=620)
    paths.push("M 1648 780 L 1624 780 L 1624 620 L 1600 620");

    // Match 9 Play-in (y=620) -> Match 10 Decider (y=780)
    paths.push("M 1648 620 L 1634 620 L 1634 750 L 1648 750");

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        {paths.map((d, idx) => (
          <path key={idx} d={d} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinejoin="round" />
        ))}
      </svg>
    );
  };

  // SVG Lines generator for 16-Team Two-Sided Championship Bracket (E-Football)
  const EFootball16Lines = () => {
    const paths: string[] = [];

    // Left Wing (Sayap Kiri: Flow Kiri -> Kanan):
    // Match 1 (y=96) -> QF 1 (y=176)
    paths.push("M 240 96 L 264 96 L 264 176 L 288 176");
    // Match 2 (y=256) -> QF 1 (y=176)
    paths.push("M 240 256 L 264 256 L 264 176 L 288 176");

    // Match 3 (y=516) -> QF 2 (y=596)
    paths.push("M 240 516 L 264 516 L 264 596 L 288 596");
    // Match 4 (y=676) -> QF 2 (y=596)
    paths.push("M 240 676 L 264 676 L 264 596 L 288 596");

    // QF 1 (y=176) -> Semifinal 1 (y=386)
    paths.push("M 512 176 L 536 176 L 536 386 L 560 386");
    // QF 2 (y=596) -> Semifinal 1 (y=386)
    paths.push("M 512 596 L 536 596 L 536 386 L 560 386");

    // Semifinal 1 (y=386) -> Grand Final (y=386)
    paths.push("M 784 386 L 832 386");

    // Grand Final (y=422) ke Champion (y=480)
    paths.push("M 944 422 L 944 480");

    // Right Wing (Sayap Kanan: Flow Kanan -> Kiri):
    // Semifinal 2 (y=386) -> Grand Final (y=386)
    paths.push("M 1104 386 L 1056 386");

    // QF 3 (y=176) -> Semifinal 2 (y=386)
    paths.push("M 1376 176 L 1352 176 L 1352 386 L 1328 386");
    // QF 4 (y=596) -> Semifinal 2 (y=386)
    paths.push("M 1376 596 L 1352 596 L 1352 386 L 1328 386");

    // Match 5 (y=96) -> QF 3 (y=176)
    paths.push("M 1648 96 L 1624 96 L 1624 176 L 1600 176");
    // Match 6 (y=256) -> QF 3 (y=176)
    paths.push("M 1648 256 L 1624 256 L 1624 176 L 1600 176");

    // Match 7 (y=516) -> QF 4 (y=596)
    paths.push("M 1648 516 L 1624 516 L 1624 596 L 1600 596");
    // Match 8 (y=676) -> QF 4 (y=596)
    paths.push("M 1648 676 L 1624 676 L 1624 596 L 1600 596");

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
          <div className="flex items-center gap-2">
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

        <div 
          ref={bracketRef} 
          className={
            isFullscreen 
              ? "bg-slate-50 h-screen w-screen flex flex-col overflow-hidden relative select-none" 
              : "w-full overflow-x-auto relative bg-slate-50/50 p-8"
          }
          style={
            isFullscreen
              ? {
                  overflow: 'hidden',
                  width: '100vw',
                  height: '100vh',
                  maxWidth: '100vw',
                  maxHeight: '100vh',
                }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
          
          {isFullscreen && (
            <div className="shrink-0 h-14 px-4 sm:px-6 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm z-50 shadow-xs relative">
              {/* Left: Info game & status */}
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight">{gameTitle}</span>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 hidden md:inline">
                  Layar Penuh
                </span>
              </div>

              {/* Right: Zoom controls, Actions, Exit */}
              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs font-semibold text-slate-700">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-md transition-colors"
                    title="Perkecil (Keyboard: -)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleFitScreen}
                    className={`px-2.5 py-1 rounded-md transition-all text-[11px] font-bold ${
                      isAutoFit 
                        ? 'bg-white text-blue-600 shadow-xs border border-blue-100' 
                        : 'text-slate-600 hover:bg-white/80'
                    }`}
                    title="Sesuaikan Bagan ke Layar Otomatis (Keyboard: 0)"
                  >
                    Pas Layar ({Math.round(zoomScale * 100)}%)
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-md transition-colors"
                    title="Perbesar (Keyboard: +)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleZoomReset}
                    className={`px-2 py-1 rounded-md transition-colors text-[11px] hidden sm:inline ${
                      zoomScale === 1 && !isAutoFit ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-500 hover:bg-white'
                    }`}
                    title="Ukuran Asli 100% (Keyboard: 1)"
                  >
                    100%
                  </button>
                </div>

                {hasAccess && (
                  <>
                    <button 
                      onClick={toggleSpin}
                      disabled={isSavingBracket}
                      className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSpinning 
                          ? 'bg-rose-600 hover:bg-rose-700 animate-pulse' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isSpinning ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="hidden sm:inline">Stop</span>
                        </>
                      ) : (
                        <>
                          <Shuffle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Acak Tim</span>
                        </>
                      )}
                    </button>
                    <button 
                      onClick={handleSaveBracket}
                      disabled={isSpinning || isSavingBracket}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      title="Simpan Bagan"
                    >
                      {isSavingBracket ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">Simpan</span>
                    </button>
                    <button 
                      onClick={handleResetBracket}
                      disabled={isSpinning || isSavingBracket}
                      className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-semibold rounded-lg border border-slate-200 transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      title="Reset Bagan"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden md:inline">Reset</span>
                    </button>
                  </>
                )}

                <button 
                  onClick={toggleFullscreen}
                  className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg border border-slate-200 transition-all ml-1 cursor-pointer"
                  title="Keluar Layar Penuh (Esc)"
                >
                  <Minimize className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Area Konten Bagan (Auto-fit scaled di mode Fullscreen) */}
          <div 
            className={
              isFullscreen 
                ? `flex-1 w-full h-full flex items-center justify-center p-2 relative z-10 ${isAutoFit ? 'overflow-hidden' : 'overflow-auto'}` 
                : "relative z-10"
            }
            style={
              isFullscreen && isAutoFit
                ? { overflow: 'hidden' }
                : undefined
            }
          >
            <div
              style={
                isFullscreen
                  ? {
                      width: `${1900 * zoomScale}px`,
                      height: `${860 * zoomScale}px`,
                      position: 'relative',
                      flexShrink: 0,
                      margin: 'auto',
                      overflow: isAutoFit ? 'hidden' : 'visible',
                    }
                  : undefined
              }
            >
              <div
                style={
                  isFullscreen
                    ? {
                        width: '1900px',
                        height: '860px',
                        transform: `scale(${zoomScale})`,
                        transformOrigin: 'top left',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                      }
                    : undefined
                }
              >
          {/* ======================================================== */}
          {/* CASE A: MOBILE LEGENDS 18-TEAM TWO-SIDED BRACKET         */}
          {/* DESAIN ASLI DASHBOARD: ABU-ABU PUTIH, KOTAK MINIMALIS   */}
          {/* ======================================================== */}
          {isMLBB ? (
            <div className="relative z-10 min-w-[1900px] h-[860px] flex gap-12 px-4 py-4 mx-auto max-w-max">
              <MLBB18Lines />

              {/* Col 0: Round of 18 Kiri (9 Tim) */}
              <div className="w-56 shrink-0 relative z-10 h-full">
                <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">ROUND OF 18</div>
                
                {/* Match 1 */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '64px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Match 1</span>
                    <span className="text-[8px] text-slate-400">Sayap Kiri</span>
                  </div>
                  {renderTeamSlot(shuffledTeams[0], 'r18', 0, true)}
                  {renderTeamSlot(shuffledTeams[1], 'r18', 1, false)}
                </div>

                {/* Match 2 */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '224px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Match 2</span>
                    <span className="text-[8px] text-slate-400">Sayap Kiri</span>
                  </div>
                  {renderTeamSlot(shuffledTeams[2], 'r18', 2, true)}
                  {renderTeamSlot(shuffledTeams[3], 'r18', 3, false)}
                </div>

                {/* Match 3 */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '424px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Match 3</span>
                    <span className="text-[8px] text-slate-400">Sayap Kiri</span>
                  </div>
                  {renderTeamSlot(shuffledTeams[4], 'r18', 4, true)}
                  {renderTeamSlot(shuffledTeams[5], 'r18', 5, false)}
                </div>

                {/* Match 4 (Play-in) */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '584px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Match 4 (Play-in)</span>
                    <span className="px-1 rounded text-[8px] font-bold bg-blue-100 text-blue-700">Play-in</span>
                  </div>
                  {renderTeamSlot(shuffledTeams[7], 'r18', 7, true)}
                  {renderTeamSlot(shuffledTeams[8], 'r18', 8, false)}
                </div>

                {/* Match 5 (Decider) */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '744px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Match 5 (Decider)</span>
                    <span className="px-1 rounded text-[8px] font-bold bg-amber-100 text-amber-700">Decider</span>
                  </div>
                  {renderTeamSlot(shuffledTeams[6], 'r18', 6, true)}
                  {renderTeamSlot(playInWinners[0], 'playin_winner', 0, false)}
                </div>
              </div>

              {/* Col 1: Quarterfinals Kiri (4 Tim) */}
              <div className="w-56 shrink-0 relative z-10 h-full">
                <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">QUARTERFINALS</div>
                
                {/* QF 1 */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '144px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Quarterfinal 1</span>
                    <span className="text-[8px] text-slate-400">Sayap Kiri</span>
                  </div>
                  {renderTeamSlot(quarterFinals[0], 'qf', 0, true)}
                  {renderTeamSlot(quarterFinals[1], 'qf', 1, false)}
                </div>

                {/* QF 2 */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '584px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Quarterfinal 2</span>
                    <span className="text-[8px] text-slate-400">Sayap Kiri</span>
                  </div>
                  {renderTeamSlot(quarterFinals[2], 'qf', 2, true)}
                  {renderTeamSlot(quarterFinals[3], 'qf', 3, false)}
                </div>
              </div>

              {/* Col 2: Semifinal Kiri (2 Tim) */}
              <div className="w-56 shrink-0 relative z-10 h-full">
                <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">SEMIFINALS</div>
                
                {/* Semifinal 1 */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '364px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Semifinal 1</span>
                    <span className="text-[8px] text-slate-400">Sayap Kiri</span>
                  </div>
                  {renderTeamSlot(semiFinals[0], 'sf', 0, true)}
                  {renderTeamSlot(semiFinals[1], 'sf', 1, false)}
                </div>
              </div>

              {/* Col 3: Grand Final & Champion (Pusat Tengah) */}
              <div className="w-56 shrink-0 relative z-10 h-full">
                <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">GRAND FINAL</div>
                
                {/* Grand Final Card */}
                <div className="w-full bg-white border border-amber-300 shadow-md rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '364px' }}>
                  <div className="bg-amber-100 text-amber-700 text-[10px] font-bold text-center py-1 uppercase tracking-wider">Final Match</div>
                  {renderTeamSlot(finals[0], 'final', 0, true)}
                  {renderTeamSlot(finals[1], 'final', 1, false)}
                </div>

                {/* Champion Card */}
                <div 
                  className={`w-full p-4 border rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm text-center transition-all absolute ${
                    champion 
                      ? 'bg-gradient-to-r from-amber-100 to-amber-50 border-amber-300 shadow-amber-200/50' 
                      : 'bg-white border-slate-200'
                  }`}
                  style={{ top: '500px' }}
                >
                  <Trophy className={`w-8 h-8 mb-1 ${champion ? 'text-amber-500' : 'text-slate-300'}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${champion ? 'text-amber-700' : 'text-slate-400'}`}>Champion</span>
                  <span className={`font-bold text-lg ${champion ? 'text-slate-800' : 'text-slate-400'}`}>
                    {champion ? champion.nama_tim : 'TBD'}
                  </span>
                  {champion && (
                    <span className="text-[10px] text-slate-500">Kapten: {champion.kapten}</span>
                  )}
                </div>
              </div>

              {/* Col 4: Semifinal Kanan (2 Tim) */}
              <div className="w-56 shrink-0 relative z-10 h-full">
                <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">SEMIFINALS</div>
                
                {/* Semifinal 2 */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '364px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Semifinal 2</span>
                    <span className="text-[8px] text-slate-400">Sayap Kanan</span>
                  </div>
                  {renderTeamSlot(semiFinals[2], 'sf', 2, true)}
                  {renderTeamSlot(semiFinals[3], 'sf', 3, false)}
                </div>
              </div>

              {/* Col 5: Quarterfinals Kanan (4 Tim) */}
              <div className="w-56 shrink-0 relative z-10 h-full">
                <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">QUARTERFINALS</div>
                
                {/* QF 3 */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '144px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Quarterfinal 3</span>
                    <span className="text-[8px] text-slate-400">Sayap Kanan</span>
                  </div>
                  {renderTeamSlot(quarterFinals[4], 'qf', 4, true)}
                  {renderTeamSlot(quarterFinals[5], 'qf', 5, false)}
                </div>

                {/* QF 4 */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '584px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Quarterfinal 4</span>
                    <span className="text-[8px] text-slate-400">Sayap Kanan</span>
                  </div>
                  {renderTeamSlot(quarterFinals[6], 'qf', 6, true)}
                  {renderTeamSlot(quarterFinals[7], 'qf', 7, false)}
                </div>
              </div>

              {/* Col 6: Round of 18 Kanan (9 Tim) */}
              <div className="w-56 shrink-0 relative z-10 h-full">
                <div className="absolute -top-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">ROUND OF 18</div>
                
                {/* Match 6 */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '64px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Match 6</span>
                    <span className="text-[8px] text-slate-400">Sayap Kanan</span>
                  </div>
                  {renderTeamSlot(shuffledTeams[9], 'r18', 9, true)}
                  {renderTeamSlot(shuffledTeams[10], 'r18', 10, false)}
                </div>

                {/* Match 7 */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '224px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Match 7</span>
                    <span className="text-[8px] text-slate-400">Sayap Kanan</span>
                  </div>
                  {renderTeamSlot(shuffledTeams[11], 'r18', 11, true)}
                  {renderTeamSlot(shuffledTeams[12], 'r18', 12, false)}
                </div>

                {/* Match 8 */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '424px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Match 8</span>
                    <span className="text-[8px] text-slate-400">Sayap Kanan</span>
                  </div>
                  {renderTeamSlot(shuffledTeams[13], 'r18', 13, true)}
                  {renderTeamSlot(shuffledTeams[14], 'r18', 14, false)}
                </div>

                {/* Match 9 (Play-in) */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '584px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Match 9 (Play-in)</span>
                    <span className="px-1 rounded text-[8px] font-bold bg-blue-100 text-blue-700">Play-in</span>
                  </div>
                  {renderTeamSlot(shuffledTeams[16], 'r18', 16, true)}
                  {renderTeamSlot(shuffledTeams[17], 'r18', 17, false)}
                </div>

                {/* Match 10 (Decider) */}
                <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '744px' }}>
                  <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Match 10 (Decider)</span>
                    <span className="px-1 rounded text-[8px] font-bold bg-amber-100 text-amber-700">Decider</span>
                  </div>
                  {renderTeamSlot(shuffledTeams[15], 'r18', 15, true)}
                  {renderTeamSlot(playInWinners[1], 'playin_winner', 1, false)}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative z-10 min-w-[1900px] h-[860px] flex gap-12 px-4 py-4 mx-auto max-w-max">
            <EFootball16Lines />

            {/* Col 0: Round of 16 Kiri (8 Tim / 4 Match) */}
            <div className="w-56 shrink-0 relative z-10 h-full">
              <div className="absolute top-2 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">ROUND OF 16</div>
              
              {/* Match 1 */}
              <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '60px' }}>
                <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                  <span>Match 1</span>
                  <span className="text-[8px] text-slate-400">Sayap Kiri</span>
                </div>
                {renderTeamSlot(shuffledTeams[0], 1, 0, true)}
                {renderTeamSlot(shuffledTeams[1], 1, 1, false)}
              </div>

              {/* Match 2 */}
              <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '220px' }}>
                <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                  <span>Match 2</span>
                  <span className="text-[8px] text-slate-400">Sayap Kiri</span>
                </div>
                {renderTeamSlot(shuffledTeams[2], 1, 2, true)}
                {renderTeamSlot(shuffledTeams[3], 1, 3, false)}
              </div>

              {/* Match 3 */}
              <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '480px' }}>
                <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                  <span>Match 3</span>
                  <span className="text-[8px] text-slate-400">Sayap Kiri</span>
                </div>
                {renderTeamSlot(shuffledTeams[4], 1, 4, true)}
                {renderTeamSlot(shuffledTeams[5], 1, 5, false)}
              </div>

              {/* Match 4 */}
              <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '640px' }}>
                <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                  <span>Match 4</span>
                  <span className="text-[8px] text-slate-400">Sayap Kiri</span>
                </div>
                {renderTeamSlot(shuffledTeams[6], 1, 6, true)}
                {renderTeamSlot(shuffledTeams[7], 1, 7, false)}
              </div>
            </div>

            {/* Col 1: Quarterfinals Kiri (4 Tim / 2 Match) */}
            <div className="w-56 shrink-0 relative z-10 h-full">
              <div className="absolute top-2 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">QUARTERFINALS</div>
              
              {/* QF 1 */}
              <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '140px' }}>
                <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                  <span>Quarterfinal 1</span>
                  <span className="text-[8px] text-slate-400">Sayap Kiri</span>
                </div>
                {renderTeamSlot(quarterFinals[0], 2, 0, true)}
                {renderTeamSlot(quarterFinals[1], 2, 1, false)}
              </div>

              {/* QF 2 */}
              <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '560px' }}>
                <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                  <span>Quarterfinal 2</span>
                  <span className="text-[8px] text-slate-400">Sayap Kiri</span>
                </div>
                {renderTeamSlot(quarterFinals[2], 2, 2, true)}
                {renderTeamSlot(quarterFinals[3], 2, 3, false)}
              </div>
            </div>

            {/* Col 2: Semifinal Kiri (2 Tim / 1 Match) */}
            <div className="w-56 shrink-0 relative z-10 h-full">
              <div className="absolute top-2 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">SEMIFINAL</div>
              
              {/* Semifinal 1 */}
              <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '350px' }}>
                <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                  <span>Semifinal 1</span>
                  <span className="text-[8px] text-slate-400">Sayap Kiri</span>
                </div>
                {renderTeamSlot(semiFinals[0], 3, 0, true)}
                {renderTeamSlot(semiFinals[1], 3, 1, false)}
              </div>
            </div>

            {/* Col 3: Grand Final & Champion (Pusat Tengah) */}
            <div className="w-56 shrink-0 relative z-10 h-full">
              <div className="absolute top-2 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">GRAND FINAL</div>
              
              {/* Grand Final Card */}
              <div className="w-full bg-white border border-amber-300 shadow-md rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '350px' }}>
                <div className="bg-amber-100 text-amber-700 text-[10px] font-bold text-center py-1 uppercase tracking-wider">Final Match</div>
                {renderTeamSlot(finals[0], 4, 0, true)}
                {renderTeamSlot(finals[1], 4, 1, false)}
              </div>

              {/* Champion Card */}
              <div 
                className={`w-full p-4 border rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm text-center transition-all absolute ${
                  champion 
                    ? 'bg-gradient-to-r from-amber-100 to-amber-50 border-amber-300 shadow-amber-200/50' 
                    : 'bg-white border-slate-200'
                }`}
                style={{ top: '480px' }}
              >
                <Trophy className={`w-8 h-8 mb-1 ${champion ? 'text-amber-500' : 'text-slate-300'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${champion ? 'text-amber-700' : 'text-slate-400'}`}>Champion</span>
                <span className={`font-bold text-lg ${champion ? 'text-slate-800' : 'text-slate-400'}`}>
                  {champion ? champion.nama_tim : 'TBD'}
                </span>
                {champion && (
                  <span className="text-[10px] text-slate-500">Kapten: {champion.kapten}</span>
                )}
              </div>
            </div>

            {/* Col 4: Semifinal Kanan (2 Tim / 1 Match) */}
            <div className="w-56 shrink-0 relative z-10 h-full">
              <div className="absolute top-2 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">SEMIFINAL</div>
              
              {/* Semifinal 2 */}
              <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '350px' }}>
                <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                  <span>Semifinal 2</span>
                  <span className="text-[8px] text-slate-400">Sayap Kanan</span>
                </div>
                {renderTeamSlot(semiFinals[2], 3, 2, true)}
                {renderTeamSlot(semiFinals[3], 3, 3, false)}
              </div>
            </div>

            {/* Col 5: Quarterfinals Kanan (4 Tim / 2 Match) */}
            <div className="w-56 shrink-0 relative z-10 h-full">
              <div className="absolute top-2 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">QUARTERFINALS</div>
              
              {/* QF 3 */}
              <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '140px' }}>
                <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                  <span>Quarterfinal 3</span>
                  <span className="text-[8px] text-slate-400">Sayap Kanan</span>
                </div>
                {renderTeamSlot(quarterFinals[4], 2, 4, true)}
                {renderTeamSlot(quarterFinals[5], 2, 5, false)}
              </div>

              {/* QF 4 */}
              <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '560px' }}>
                <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                  <span>Quarterfinal 4</span>
                  <span className="text-[8px] text-slate-400">Sayap Kanan</span>
                </div>
                {renderTeamSlot(quarterFinals[6], 2, 6, true)}
                {renderTeamSlot(quarterFinals[7], 2, 7, false)}
              </div>
            </div>

            {/* Col 6: Round of 16 Kanan (8 Tim / 4 Match) */}
            <div className="w-56 shrink-0 relative z-10 h-full">
              <div className="absolute top-2 text-xs font-bold text-slate-400 uppercase tracking-widest text-center w-full">ROUND OF 16</div>
              
              {/* Match 5 */}
              <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '60px' }}>
                <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                  <span>Match 5</span>
                  <span className="text-[8px] text-slate-400">Sayap Kanan</span>
                </div>
                {renderTeamSlot(shuffledTeams[8], 1, 8, true)}
                {renderTeamSlot(shuffledTeams[9], 1, 9, false)}
              </div>

              {/* Match 6 */}
              <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '220px' }}>
                <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                  <span>Match 6</span>
                  <span className="text-[8px] text-slate-400">Sayap Kanan</span>
                </div>
                {renderTeamSlot(shuffledTeams[10], 1, 10, true)}
                {renderTeamSlot(shuffledTeams[11], 1, 11, false)}
              </div>

              {/* Match 7 */}
              <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '480px' }}>
                <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                  <span>Match 7</span>
                  <span className="text-[8px] text-slate-400">Sayap Kanan</span>
                </div>
                {renderTeamSlot(shuffledTeams[12], 1, 12, true)}
                {renderTeamSlot(shuffledTeams[13], 1, 13, false)}
              </div>

              {/* Match 8 */}
              <div className="w-full bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden flex flex-col text-xs absolute" style={{ top: '640px' }}>
                <div className="bg-slate-50 border-b border-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-400 flex justify-between items-center">
                  <span>Match 8</span>
                  <span className="text-[8px] text-slate-400">Sayap Kanan</span>
                </div>
                {renderTeamSlot(shuffledTeams[14], 1, 14, true)}
                {renderTeamSlot(shuffledTeams[15], 1, 15, false)}
              </div>
            </div>
          </div>
          )}

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
