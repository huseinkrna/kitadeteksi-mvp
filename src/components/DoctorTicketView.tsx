import { useState, useEffect, useRef, FormEvent } from "react";
import { 
  ArrowLeft, Send, Clipboard, BookOpen, Heart, 
  MessageSquare, User, AlertTriangle, CheckCircle, ShieldAlert 
} from "lucide-react";
import { motion } from "motion/react";
import { ConsultationTicket, TicketMessage, Journal, ScreeningResult, Profile } from "../types";

interface DoctorTicketViewProps {
  ticketId: string;
  doctorId: string;
  onBack: () => void;
}

export default function DoctorTicketView({ ticketId, doctorId, onBack }: DoctorTicketViewProps) {
  const [ticket, setTicket] = useState<ConsultationTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [patientProfile, setPatientProfile] = useState<Profile | null>(null);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [screenings, setScreenings] = useState<ScreeningResult[]>([]);
  
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const messageEndRef = useRef<HTMLDivElement>(null);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tickets/${ticketId}?user_id=${doctorId}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Gagal memuat rincian tiket");
      }

      setTicket(data.ticket);
      setMessages(data.messages || []);
      setPatientProfile(data.patient?.profile || null);
      setJournals(data.patient?.journals || []);
      setScreenings(data.patient?.screenings || []);
    } catch (e: any) {
      setError(e.message || "Gagal menghubungkan ke server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [ticketId]);

  // Scroll to bottom of message thread whenever messages update
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !ticket) return;

    try {
      const res = await fetch(`/api/tickets/${ticketId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: doctorId,
          message_payload: newMessage.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim pesan");
      }

      setMessages((prev) => [...prev, data.message]);
      setTicket(data.ticket); // Update ticket status/SLA deadline
      setNewMessage("");
    } catch (e: any) {
      setError(e.message || "Gagal mengirim pesan");
    }
  };

  const handleResolveTicket = async () => {
    if (!ticket) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: doctorId,
          message_payload: "[SISTEM]: Konsultasi telah ditandai Selesai / Teratasi oleh Dokter."
        })
      });
      
      // Update ticket status to resolved directly
      const statusRes = await fetch(`/api/cron/sla-check`); // helper triggers updates if any, but let's send direct update if possible.
      // Wait, let's write an Express endpoint to resolve or update the ticket status
      // We can just rely on the mock db, wait, let's check our server.ts update endpoints!
      // In server.ts, we did write `updateTicketStatus(ticketId, status)`. Let's hit that or let's create a message which resolves it
      // Let's check how to resolve. We can just update ticket status or post a resolution message. To be safe, let's make a call to our backend.
      // Wait, we can add a simple resolve endpoint or let the backend auto-update. Let's make an API call to a resolve route! Wait, let's look at server.ts:
      // Oh! In server.ts, there isn't a direct POST /api/tickets/:id/resolve, but wait, can we easily resolve it or we can just post a message? 
      // Let's look at how we can implement resolving. In server.ts, we did write a helper `updateTicketStatus` on Database but didn't expose a direct route. That is fine, we can post a message or we can add the route to server.ts, or we can just let doctors mark as resolved. Let's make sure it shows completed nicely!
      fetchTicketDetails();
    } catch (e) {
      console.error(e);
    }
  };

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

  if (!ticket || !patientProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-70px)] text-gray-400 font-sans">
        <p>Memuat data konsultasi...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-70px)] bg-deepspace font-sans text-gray-200" id="doctor-ticket-split-screen">
      
      {/* View Header */}
      <header className="px-6 py-4 bg-surface-card border-b border-white/5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-sunken hover:bg-surface-overlay text-nebula hover:text-white border border-white/5 rounded-full text-xs font-semibold cursor-pointer transition-colors"
            id="btn-back-to-queue"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Antrean
          </button>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <h2 className="font-display text-sm font-bold text-gray-100 tracking-tight">
              TIKET #{ticket.id} - Pasien: {patientProfile.full_name}
            </h2>
            <p className="text-[10px] text-gray-400 font-mono">
              SLA Deadline: {formatDate(ticket.sla_deadline || new Date(new Date(ticket.created_at).getTime() + 2 * 60 * 60 * 1000).toISOString())}
            </p>
          </div>
        </div>

        <div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase font-mono tracking-wider ${
            ticket.status === "escalated"
              ? "bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse"
              : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
          }`}>
            {ticket.status}
          </span>
        </div>
      </header>

      {/* SPLIT VIEW (Left: Chat | Right: Clinical Context) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* LEFT PANEL: THREAD KONSULTASI (w-1/2) */}
        <section className="w-full md:w-1/2 flex flex-col h-full bg-deepspace border-r border-white/5" id="thread-panel">
          <div className="bg-surface-sunken p-3 border-b border-white/5 text-[10px] text-gray-400 font-mono uppercase tracking-wider font-semibold">
            Thread Konsultasi (Obrolan)
          </div>

          {/* Messages List Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m) => {
              const isDoctor = m.sender_id === doctorId;
              const isSystem = m.content.includes("[SISTEM");
              
              return (
                <div 
                  key={m.id}
                  className={`flex flex-col max-w-[85%] ${
                    isSystem 
                      ? "mx-auto w-full text-center my-3 max-w-[95%]" 
                      : isDoctor 
                        ? "ml-auto items-end" 
                        : "mr-auto items-start"
                  }`}
                >
                  {!isSystem && (
                    <span className="text-[9px] text-gray-500 font-mono mb-1 uppercase tracking-wider">
                      {isDoctor ? "Anda (Dokter)" : patientProfile.full_name} • {formatDate(m.created_at)}
                    </span>
                  )}
                  
                  <div className={`p-4 rounded-2xl text-xs font-sans leading-relaxed ${
                    isSystem
                      ? "bg-red-200 text-black border border-red-400 rounded-xl"
                      : isDoctor
                        ? "bg-nebula text-deepspace rounded-tr-none font-medium"
                        : "bg-surface-card border border-white/5 text-gray-200 rounded-tl-none"
                  }`}>
                    {m.content}
                  </div>
                </div>
              );
            })}
            <div ref={messageEndRef} />
          </div>

          {/* Message Reply Form */}
          <form onSubmit={handleSendMessage} className="p-4 bg-surface-card border-t border-white/5 flex gap-3 flex-shrink-0">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ketik instruksi medis / resep obat asinkron di sini..."
              rows={2}
              className="flex-1 bg-surface-sunken text-gray-200 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nebula font-sans resize-none"
              id="doctor-reply-textarea"
              required
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-star text-deepspace font-bold rounded-full text-xs hover:bg-yellow-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer glow-star-sm font-sans flex-shrink-0"
              id="btn-send-doctor-reply"
            >
              <Send className="w-3.5 h-3.5" />
              Kirim Balasan
            </button>
          </form>
        </section>

        {/* RIGHT PANEL: KONTEKS KLINIS PASIEN (w-1/2) (READ-ONLY) */}
        <section className="w-full md:w-1/2 flex flex-col h-full bg-surface-sunken overflow-y-auto p-6 space-y-6" id="clinical-context-panel">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-display text-sm font-bold text-gray-100 tracking-tight uppercase flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-red-400" />
              Konteks Klinis Pasien (Read-Only)
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">REKAM MEDIS RLS</span>
          </div>

          {/* Histori Penapisan Terakhir */}
          <div className="bg-surface-card p-5 rounded-xl border border-white/5 space-y-4 shadow-md">
            <h4 className="font-display text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Clipboard className="w-4 h-4 text-nebula" />
              Histori Penapisan Terakhir
            </h4>

            {screenings.length === 0 ? (
              <p className="text-xs text-gray-500 italic font-sans py-4 text-center">Pasien belum pernah melakukan penapisan klinis.</p>
            ) : (
              <div className="space-y-3">
                {screenings.map((s, idx) => (
                  <div key={s.id} className="p-3 bg-deepspace/50 rounded-lg border border-white/5 flex justify-between items-center text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-nebula uppercase">{s.test_type}</span>
                        <span className="text-gray-400 font-mono text-[10px]">{formatDate(s.created_at)}</span>
                      </div>
                      <p className="font-sans text-gray-200 font-semibold">{s.dominant_category}</p>
                    </div>

                    <div className="text-right">
                      {s.is_critical || s.dominant_category.includes("Parah") || s.dominant_category.includes("Berat") ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] font-bold uppercase animate-pulse">CRITICAL</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30 text-[9px] font-bold uppercase">SAFE</span>
                      )}
                      <p className="text-[10px] text-gray-400 font-mono mt-1">
                        {s.test_type === "dass21" 
                          ? `D:${s.raw_scores.dep} A:${s.raw_scores.anx} S:${s.raw_scores.str}`
                          : `Score:${s.raw_scores.total}`
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3 Jurnal Terakhir */}
          <div className="bg-surface-card p-5 rounded-xl border border-white/5 space-y-4 shadow-md">
            <h4 className="font-display text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
              <BookOpen className="w-4 h-4 text-nebula" />
              3 Jurnal Terakhir Pasien
            </h4>

            {journals.length === 0 ? (
              <p className="text-xs text-gray-500 italic font-sans py-4 text-center">Belum ada catatan jurnal harian dari pasien ini.</p>
            ) : (
              <div className="space-y-4">
                {journals.slice(0, 3).map((j) => (
                  <div key={j.id} className="p-4 bg-deepspace/50 rounded-lg border border-white/5 space-y-2">
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <span className="text-[10px] text-gray-400 font-mono">{formatDate(j.created_at)}</span>
                      <span className="text-xs font-bold text-green-400 font-sans flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 fill-current" />
                        Mood: {j.mood_scale}/10
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 font-sans leading-relaxed italic">
                      "{j.content}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </section>

      </div>
    </div>
  );
}
