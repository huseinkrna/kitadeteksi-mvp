import React, { useState, useEffect } from "react";
import { 
  Home, Clipboard, Settings, Plus, BookOpen, Clock, 
  MessageSquare, User, Activity, AlertCircle, Heart, ChevronRight, CheckCircle2 
} from "lucide-react";
import { motion } from "motion/react";
import TrendChart from "./TrendChart";
import JournalModal from "./JournalModal";
import NewTicketModal from "./NewTicketModal";
import { Profile, Journal, ScreeningResult, ConsultationTicket, TicketMessage, Medication, parseRegimen } from "../types";

interface PatientDashboardProps {
  profile: Profile;
  onStartScreening: () => void;
  onViewTicket: (ticketId: string) => void;
  onRedAlert: () => void;
  onProfileUpdate?: (updatedProfile: Profile) => void;
}

export default function PatientDashboard({ profile, onStartScreening, onViewTicket, onRedAlert, onProfileUpdate }: PatientDashboardProps) {
  const [doctor, setDoctor] = useState<Profile | null>(null);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [screenings, setScreenings] = useState<ScreeningResult[]>([]);
  const [tickets, setTickets] = useState<ConsultationTicket[]>([]);
  
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<"beranda" | "riwayat" | "pengaturan">("beranda");

  // Modals state
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  // Success messages alerts
  const [successMsg, setSuccessMsg] = useState("");

  // Edit Profile Form States
  const [editFullName, setEditFullName] = useState(profile.full_name);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editPhoneNumber, setEditPhoneNumber] = useState(profile.phone_number);
  const [editBirthDate, setEditBirthDate] = useState(profile.birth_date || "");
  const [editPassword, setEditPassword] = useState("");
  const [editRegimen, setEditRegimen] = useState(profile.regimen || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    setEditFullName(profile.full_name);
    setEditEmail(profile.email);
    setEditPhoneNumber(profile.phone_number);
    setEditBirthDate(profile.birth_date || "");
    setEditPassword("");
    setEditRegimen(profile.regimen || "");
  }, [profile]);

  const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdatingProfile(true);
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: profile.user_id,
          full_name: editFullName,
          email: editEmail,
          phone_number: editPhoneNumber,
          birth_date: editBirthDate,
          password: editPassword,
          regimen: editRegimen
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui profil");
      
      setSuccessMsg("Profil Anda berhasil diperbarui!");
      setTimeout(() => setSuccessMsg(""), 4000);
      
      if (onProfileUpdate) {
        onProfileUpdate(data.profile);
      }
    } catch (e: any) {
      alert(e.message || "Gagal memperbarui profil");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleOpenChatRoom = async () => {
    if (!doctor) {
      alert("Anda harus ditautkan dengan dokter terlebih dahulu untuk membuka konsultasi.");
      return;
    }
    try {
      const res = await fetch("/api/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: profile.user_id,
          doctor_id: doctor.user_id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onViewTicket(data.ticket.id);
    } catch (e: any) {
      console.error("Gagal membuka room chat:", e);
      alert("Gagal membuka room chat.");
    }
  };

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch pairing / doctor info
      const pairRes = await fetch(`/api/patient/pairing-status?patient_id=${profile.user_id}`);
      const pairData = await pairRes.json();
      if (pairData.paired) {
        setDoctor(pairData.doctor);
      }

      // 2. Fetch journals
      const journalsRes = await fetch(`/api/journals?patient_id=${profile.user_id}`);
      const journalsData = await journalsRes.json();
      setJournals(journalsData.journals || []);

      // 3. Fetch screenings
      const screeningsRes = await fetch(`/api/screenings?patient_id=${profile.user_id}`);
      const screeningsData = await screeningsRes.json();
      setScreenings(screeningsData.screenings || []);

      // 4. Fetch consultation tickets
      const ticketsRes = await fetch(`/api/tickets?patient_id=${profile.user_id}`);
      const ticketsData = await ticketsRes.json();
      setTickets(ticketsData.tickets || []);
    } catch (e) {
      console.error("Gagal memuat data dashboard pasien:", e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [profile.user_id]);

  const handleJournalSubmit = async (content: string, moodScale: number) => {
    const res = await fetch("/api/journals/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: profile.user_id,
        content,
        mood_scale: moodScale
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gagal menyimpan jurnal");
    }
    
    setSuccessMsg("Jurnal harian berhasil disimpan!");
    setTimeout(() => setSuccessMsg(""), 4000);
    fetchDashboardData();
  };

  const handleNewTicketSubmit = async (initialMessage: string) => {
    if (!doctor) return;
    const res = await fetch("/api/tickets/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: profile.user_id,
        doctor_id: doctor.user_id,
        initial_message: initialMessage
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gagal membuat tiket");
    }

    setSuccessMsg("Tiket konsultasi asinkron baru berhasil dibuka!");
    setTimeout(() => setSuccessMsg(""), 4000);
    fetchDashboardData();
  };

  // Helper formatting dates
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("id-ID", { 
        day: "numeric", 
        month: "short", 
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoString;
    }
  };

  // Screening schedule check: displays "14 hari lalu" or "belum pernah" based on screenings history
  const getLatestScreeningText = () => {
    if (screenings.length === 0) {
      return "Belum pernah mengisi penapisan klinis.";
    }
    const latest = new Date(screenings[0].created_at);
    const diffTime = Math.abs(Date.now() - latest.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0 || diffDays === 1) {
      return "Terakhir isi: Baru saja hari ini/kemarin.";
    }
    return `Terakhir isi: ${diffDays} hari lalu.`;
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-70px)] bg-deepspace text-gray-200 font-sans" id="patient-dashboard">
      
      {/* SIDEBAR (hidden on mobile, w-64 on desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-card border-r border-white/5 p-6 justify-between flex-shrink-0" id="dashboard-sidebar">
        <div className="space-y-8">
          
          {/* User & Doctor Capsule */}
          <div className="bg-deepspace/50 p-4 rounded-xl border border-white/5 space-y-3">
            <div>
              <span className="text-[10px] text-gray-500 font-mono block uppercase">Pasien</span>
              <h3 className="text-sm font-bold text-gray-100 font-sans">{profile.full_name}</h3>
            </div>
            
            <div className="pt-3 border-t border-white/5">
              <span className="text-[10px] text-gray-500 font-mono block uppercase">Dokter Pengawas</span>
              {doctor ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-semibold text-gray-300 font-sans">
                    {doctor.full_name}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-red-400 font-medium">Belum ditautkan</span>
              )}
            </div>
          </div>

          {/* Quick Actions buttons */}
          <div className="space-y-2.5">
            <button
              onClick={() => setIsJournalOpen(true)}
              className="w-full py-3 bg-surface-sunken hover:bg-surface-overlay text-nebula hover:text-white border border-nebula/30 hover:border-nebula rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 glow-nebula-sm cursor-pointer font-sans"
              id="sidebar-btn-journal"
            >
              <Plus className="w-4 h-4" />
              TULIS JURNAL HARIAN
            </button>
            <button
              onClick={handleOpenChatRoom}
              disabled={!doctor}
              className={`w-full py-3 rounded-full text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 font-sans ${
                doctor 
                  ? "bg-star text-deepspace hover:bg-yellow-300 glow-star-sm cursor-pointer"
                  : "bg-gray-700/40 text-gray-500 border border-gray-600/20 cursor-not-allowed"
              }`}
              id="sidebar-btn-ticket"
            >
              <MessageSquare className="w-4 h-4" />
              BUKA CHAT KONSULTASI
            </button>
          </div>

          {/* Navigation links */}
          <nav className="space-y-1.5" id="sidebar-nav">
            <span className="text-[10px] text-gray-500 font-mono block uppercase tracking-wider mb-2 font-bold">NAVIGASI</span>
            <button
              onClick={() => setActiveTab("beranda")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "beranda" 
                  ? "bg-nebula/10 text-nebula border-l-2 border-nebula" 
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <Home className="w-4 h-4" />
              Beranda
            </button>
            <button
              onClick={() => setActiveTab("riwayat")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "riwayat" 
                  ? "bg-nebula/10 text-nebula border-l-2 border-nebula" 
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <Clipboard className="w-4 h-4" />
              Riwayat Skor & Jurnal
            </button>
            <button
              onClick={() => setActiveTab("pengaturan")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "pengaturan" 
                  ? "bg-nebula/10 text-nebula border-l-2 border-nebula" 
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <Settings className="w-4 h-4" />
              Pengaturan Profil
            </button>
          </nav>

        </div>

        {/* Workspace identifier */}
        <div className="mt-8 pt-4 border-t border-white/5 text-[9px] text-gray-500 font-mono">
          <span>SECURE GATEWAY ENCRYPTED</span>
        </div>
      </aside>

      {/* MAIN VIEWPORT WITH BOTTOM PADDING FOR MOBILE BOTTOM NAV BAR */}
      <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8 space-y-8 overflow-y-auto" id="dashboard-viewport">
        
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-500/20 text-green-200 border border-green-500/30 text-xs rounded-xl flex items-center gap-2 font-sans"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {/* TAB 1: BERANDA */}
        {activeTab === "beranda" && (
          <div className="space-y-8" id="tab-beranda">
            
            {/* Banner: Periodical Screening CTA */}
            <section className="bg-surface-card border border-nebula/40 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden glow-nebula-sm">
              <div className="space-y-1 text-center md:text-left relative z-10">
                <h2 className="font-display text-xl font-bold text-gray-100 tracking-tight">
                  Waktunya Penapisan Berkala!
                </h2>
                <p className="text-xs text-gray-400 font-sans">
                  {getLatestScreeningText()} Evaluasi ini berguna untuk melihat dinamika mood Anda secara obyektif.
                </p>
              </div>
              <button
                onClick={onStartScreening}
                className="px-6 py-3 bg-star text-deepspace font-bold rounded-full text-xs hover:bg-yellow-300 transition-all duration-200 glow-star-sm cursor-pointer flex-shrink-0 font-sans"
                id="btn-start-dass21"
              >
                Mulai Tes DASS-21
              </button>
            </section>

            {/* Recharts Mood & Scores Chart */}
            <section className="bg-surface-card p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-gray-100 tracking-tight">
                    Perkembangan Kesehatan Mental Anda
                  </h2>
                  <p className="text-xs text-gray-400 font-sans">
                    Hasil perpaduan mood harian dan skor subskala DASS-21 (Depresi, Kecemasan, Stres).
                  </p>
                </div>
              </div>
              <TrendChart screenings={screenings} journals={journals} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Room Chat Konsultasi Psikiater (Single Room Standard) */}
              <section className="bg-surface-card p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="font-display text-sm font-bold text-gray-200 tracking-tight flex items-center gap-2">
                    <MessageSquare className="w-4.5 h-4.5 text-nebula" />
                    Hubungi Dokter / Psikiater
                  </h3>
                  <span className="text-[10px] text-gray-500 font-mono uppercase">ASINKRON SLA 24H</span>
                </div>

                <div className="bg-surface-sunken p-5 rounded-xl border border-white/5 space-y-4 text-center md:text-left">
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="p-3 bg-nebula/10 rounded-full text-nebula border border-nebula/20">
                      <MessageSquare className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-100">Room Chat Konsultasi Aktif</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Anda terhubung langsung dengan <strong>{doctor?.full_name || "Psikiater Pengawas"}</strong>. 
                        Cukup buat 1 tiket konsultasi ini untuk digunakan selamanya tanpa batas tiket baru.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleOpenChatRoom}
                      disabled={!doctor}
                      className="w-full py-2.5 bg-star text-deepspace hover:bg-yellow-300 font-bold text-xs rounded-full transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer glow-star-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Masuk ke Room Chat Konsultasi
                    </button>
                  </div>
                </div>
              </section>

              {/* Pillar: Regimen & Obat-Obatan Saat Ini */}
              <section className="bg-surface-card p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="font-display text-sm font-bold text-gray-200 tracking-tight flex items-center gap-2">
                    <Heart className="w-4.5 h-4.5 text-red-400 fill-current" />
                    Regimen & Obat-Obatan Saat Ini
                  </h3>
                  <span className="text-[10px] text-gray-500 font-mono uppercase">PILAR MEDIS</span>
                </div>

                {parseRegimen(profile.regimen).length > 0 ? (
                  <div className="border border-white/5 rounded-xl overflow-hidden bg-surface-sunken">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/5 text-gray-400 font-semibold text-[10px] uppercase">
                          <th className="p-3">Obat</th>
                          <th className="p-3">Dosis</th>
                          <th className="p-3">Waktu Minum</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseRegimen(profile.regimen).map((med, index) => (
                          <tr key={med.id || index} className="border-b border-white/5 last:border-0 text-gray-800 hover:bg-white/5 transition-all">
                            <td className="p-3 font-bold text-black">{med.obat}</td>
                            <td className="p-3 text-black">{med.dosis}</td>
                            <td className="p-3 text-black">{med.waktu_minum}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                med.status === "Aktif" ? "bg-green-500/10 text-green-400" :
                                med.status === "Selesai" ? "bg-white/10 text-gray-400" :
                                "bg-amber-500/10 text-amber-400"
                              }`}>
                                {med.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-surface-sunken p-5 rounded-xl border border-white/5 text-center py-6">
                    <p className="text-xs text-gray-500 font-sans">
                      Belum ada obat yang terdaftar dalam profil Anda.
                    </p>
                  </div>
                )}
              </section>

            </div>
          </div>
        )}

        {/* TAB 2: RIWAYAT */}
        {activeTab === "riwayat" && (
          <div className="space-y-8" id="tab-riwayat">
            
            <section className="bg-surface-card p-6 rounded-2xl border border-white/5 space-y-4">
              <h2 className="font-display text-lg font-bold text-gray-100 tracking-tight flex items-center gap-2">
                <Clipboard className="w-5 h-5 text-nebula" />
                Histori Hasil Penapisan Klinis
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 uppercase font-mono tracking-wider">
                      <th className="py-3 px-4">Tanggal Isi</th>
                      <th className="py-3 px-4">Tipe Tes</th>
                      <th className="py-3 px-4">Hasil / Kategori Dominan</th>
                      <th className="py-3 px-4">Status Triage</th>
                      <th className="py-3 px-4">Skor / Rincian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {screenings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500 font-sans">
                          Belum ada riwayat pengerjaan penapisan klinis.
                        </td>
                      </tr>
                    ) : (
                      screenings.map((s) => (
                        <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 font-sans">
                          <td className="py-3 px-4">{formatDate(s.created_at)}</td>
                          <td className="py-3 px-4 font-bold font-mono text-nebula uppercase">{s.test_type}</td>
                          <td className="py-3 px-4 font-semibold">{s.dominant_category}</td>
                          <td className="py-3 px-4">
                            {s.is_critical || s.dominant_category.includes("Parah") || s.dominant_category.includes("Berat") ? (
                              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] font-bold uppercase animate-pulse">CRITICAL</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30 text-[9px] font-bold uppercase">SAFE</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] text-gray-400">
                            {s.test_type === "dass21" 
                              ? `Dep:${s.raw_scores.dep}, Anx:${s.raw_scores.anx}, Str:${s.raw_scores.str}`
                              : `Total Score: ${s.raw_scores.total}`
                            }
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-surface-card p-6 rounded-2xl border border-white/5 space-y-4">
              <h2 className="font-display text-lg font-bold text-gray-100 tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-nebula" />
                Daftar Lengkap Jurnal Harian Anda
              </h2>
              <div className="space-y-4">
                {journals.length === 0 ? (
                  <p className="text-gray-500 text-xs font-sans text-center py-8">Belum menulis jurnal harian.</p>
                ) : (
                  journals.map((j) => (
                    <div key={j.id} className="bg-surface-sunken p-5 rounded-xl border border-white/5 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs text-gray-400 font-mono">{formatDate(j.created_at)}</span>
                        <span className="text-xs font-bold text-green-400 font-sans flex items-center gap-1.5 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                          <Heart className="w-3.5 h-3.5 fill-current" />
                          Mood: {j.mood_scale} / 10
                        </span>
                      </div>
                      <p className="text-sm text-gray-200 font-sans leading-relaxed italic">
                        "{j.content}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

          </div>
        )}

        {/* TAB 3: PENGATURAN (Surgical interactive profile editing form) */}
        {activeTab === "pengaturan" && (
          <div className="bg-surface-card p-6 rounded-2xl border border-white/5 max-w-lg mx-auto space-y-6" id="tab-pengaturan">
            <h2 className="font-display text-lg font-bold text-gray-100 tracking-tight">
              Edit Profil & Informasi Akun
            </h2>
            <form onSubmit={handleProfileUpdateSubmit} className="space-y-4 font-sans text-xs">
              
              {/* Full Name input */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-sans">
                  Nama Lengkap Pasien
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-surface-sunken text-gray-200 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nebula font-sans"
                  required
                />
              </div>

              {/* Email input */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-sans">
                  Alamat Email (Login)
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-surface-sunken text-gray-200 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nebula font-sans"
                  required
                />
              </div>

              {/* Phone number input */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-sans">
                  Nomor HP Aktif
                </label>
                <input
                  type="text"
                  value={editPhoneNumber}
                  onChange={(e) => setEditPhoneNumber(e.target.value)}
                  className="w-full bg-surface-sunken text-gray-200 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nebula font-sans"
                  required
                />
              </div>

              {/* Tanggal Lahir input */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-sans">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  value={editBirthDate}
                  onChange={(e) => setEditBirthDate(e.target.value)}
                  className="w-full bg-surface-sunken text-gray-200 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nebula font-sans"
                />
              </div>

              {/* Ganti Sandi input */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-sans">
                  Ganti Sandi (Kosongkan jika tidak ingin diubah)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Masukkan sandi baru"
                  className="w-full bg-surface-sunken text-gray-200 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nebula font-sans"
                />
              </div>

              {/* Regimen pilar (Read-only for patients) */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-sans">
                  Regimen & Obat-Obatan Saat Ini
                </label>
                <div className="bg-surface-sunken border border-white/5 p-4 rounded-xl text-xs space-y-2">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Hanya Dapat Diubah Oleh Dokter Penanggung Jawab</span>
                  {parseRegimen(profile.regimen).length > 0 ? (
                    <div className="space-y-1.5">
                      {parseRegimen(profile.regimen).map((med, index) => (
                        <div key={med.id || index} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                          <div>
                            <span className="text-black font-semibold block">{med.obat} ({med.dosis})</span>
                            <span className="text-black text-[10px]">{med.waktu_minum}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                            med.status === "Aktif" ? "bg-green-500/10 text-green-400" :
                            med.status === "Selesai" ? "bg-white/10 text-gray-400" :
                            "bg-amber-500/10 text-amber-400"
                          }`}>
                            {med.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Belum ada resep obat aktif dari dokter Anda.</p>
                  )}
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="w-full py-2.5 bg-nebula text-deepspace font-bold rounded-full text-xs hover:bg-opacity-80 transition-all cursor-pointer font-sans"
                >
                  {updatingProfile ? "Menyimpan..." : "Simpan Perubahan Profil"}
                </button>
              </div>

              <div className="pt-4 border-t border-white/5">
                <span className="text-[10px] text-gray-500 uppercase block">Status Akun Pasien</span>
                <span className="px-2.5 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30 text-[9px] font-bold uppercase font-mono mt-1 inline-block">TERVERIFIKASI & AKTIF</span>
              </div>
            </form>
          </div>
        )}

      </main>

      {/* MODALS */}
      <JournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        onSubmit={handleJournalSubmit}
      />

      <NewTicketModal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        onSubmit={handleNewTicketSubmit}
        doctorName={doctor?.full_name || ""}
      />

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-card border-t border-white/10 flex justify-around py-2 px-4 z-40 shadow-lg">
        <button 
          onClick={() => setActiveTab("beranda")}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-sans font-medium transition-colors ${activeTab === "beranda" ? "text-nebula font-bold" : "text-gray-400"}`}
        >
          <Home className="w-5 h-5" />
          <span>Beranda</span>
        </button>
        <button 
          onClick={() => setIsJournalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-sans font-medium text-nebula"
        >
          <Plus className="w-5 h-5 bg-nebula/10 rounded-full p-0.5 border border-nebula/20 text-nebula" />
          <span>Jurnal</span>
        </button>
        <button 
          onClick={() => setActiveTab("riwayat")}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-sans font-medium transition-colors ${activeTab === "riwayat" ? "text-nebula font-bold" : "text-gray-400"}`}
        >
          <Clipboard className="w-5 h-5" />
          <span>Riwayat</span>
        </button>
        <button 
          onClick={() => setActiveTab("pengaturan")}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-sans font-medium transition-colors ${activeTab === "pengaturan" ? "text-nebula font-bold" : "text-gray-400"}`}
        >
          <Settings className="w-5 h-5" />
          <span>Profil</span>
        </button>
      </div>

    </div>
  );
}
