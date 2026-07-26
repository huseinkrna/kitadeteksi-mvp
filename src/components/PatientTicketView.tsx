import { useState, useEffect, useRef, FormEvent } from "react";
import { ArrowLeft, Send, MessageSquare, User, Clock } from "lucide-react";
import { motion } from "motion/react";
import { ConsultationTicket, TicketMessage, Profile } from "../types";

interface PatientTicketViewProps {
  ticketId: string;
  patientId: string;
  onBack: () => void;
  doctorName: string;
}

export default function PatientTicketView({ ticketId, patientId, onBack, doctorName }: PatientTicketViewProps) {
  const [ticket, setTicket] = useState<ConsultationTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const messageEndRef = useRef<HTMLDivElement>(null);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tickets/${ticketId}?user_id=${patientId}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Gagal memuat rincian tiket");
      }

      setTicket(data.ticket);
      setMessages(data.messages || []);
    } catch (e: any) {
      setError(e.message || "Gagal menghubungkan ke server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [ticketId]);

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
          sender_id: patientId,
          message_payload: newMessage.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim pesan");
      }

      setMessages((prev) => [...prev, data.message]);
      setTicket(data.ticket);
      setNewMessage("");
    } catch (e: any) {
      setError(e.message || "Gagal mengirim pesan");
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

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-70px)] text-gray-400 font-sans">
        <p>Memuat data konsultasi...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 py-8 flex flex-col h-[calc(100vh-140px)] font-sans" id="patient-ticket-view">
      
      {/* Header */}
      <div className="bg-surface-card border border-white/10 p-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            id="btn-back-to-dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-display text-sm font-bold text-gray-100">
              KONSULTASI #{ticket.id} dengan {doctorName}
            </h3>
            <p className="text-[9px] text-gray-400 font-mono">
              Batas Respons SLA: {formatDate(ticket.sla_deadline || new Date(new Date(ticket.created_at).getTime() + 2 * 60 * 60 * 1000).toISOString())}
            </p>
          </div>
        </div>

        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono tracking-wider ${
          ticket.status === "escalated"
            ? "bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse"
            : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
        }`}>
          {ticket.status}
        </span>
      </div>

      {/* 24-Hour Consultation Session Activation Bar */}
      <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/20 to-yellow-500/10 border-x border-b border-yellow-500/30 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-yellow-200">
          <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0 animate-pulse" />
          <span>
            Sesi konsultasi reguler membutuhkan <strong>1 Token / 24 Jam</strong>. (Kasus darurat medis tetap 100% gratis & tanpa halangan).
          </span>
        </div>
        <button
          onClick={async () => {
            try {
              const res = await fetch("/api/consultation/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  patient_id: patientId,
                  doctor_id: ticket.doctor_id || patientId,
                  ticket_id: ticketId
                })
              });
              const data = await res.json();
              if (!res.ok) {
                if (data.insufficient_tokens) {
                  alert("Saldo Token tidak mencukupi! Silakan kembali ke Beranda untuk Top Up Token di Dompet Anda.");
                } else {
                  alert(data.error || "Gagal mengaktifkan konsultasi.");
                }
              } else {
                alert(data.message);
                fetchTicketDetails();
              }
            } catch (e: any) {
              alert("Error: " + e.message);
            }
          }}
          className="px-4 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-extrabold rounded-full text-[11px] transition-all shadow-md cursor-pointer flex-shrink-0 uppercase tracking-wider whitespace-nowrap"
        >
          ⚡ Aktifkan Sesi 24 Jam (1 Token)
        </button>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 bg-surface-sunken border-x border-white/10 overflow-y-auto p-6 space-y-4">
        {messages.filter(m => !m.content.includes("[SISTEM TRIAGE DARURAT]")).length === 0 ? (
          <p className="text-center text-gray-500 text-xs py-12">Belum ada pesan obrolan.</p>
        ) : (
          messages.filter(m => !m.content.includes("[SISTEM TRIAGE DARURAT]")).map((m) => {
            const isPatient = m.sender_id === patientId;
            const isSystem = m.content.includes("[SISTEM");

            return (
              <div 
                key={m.id}
                className={`flex flex-col max-w-[85%] ${
                  isSystem 
                    ? "mx-auto w-full text-center my-3 max-w-[95%]" 
                    : isPatient 
                      ? "ml-auto items-end" 
                      : "mr-auto items-start"
                }`}
              >
                {!isSystem && (
                  <span className="text-[9px] text-gray-500 font-mono mb-1 uppercase tracking-wider">
                    {isPatient ? "Anda" : doctorName} • {formatDate(m.created_at)}
                  </span>
                )}
                
                <div className={`p-4 rounded-2xl text-xs font-sans leading-relaxed ${
                  isSystem
                    ? "bg-red-200 text-black border border-red-400 rounded-xl"
                    : isPatient
                      ? "bg-nebula text-deepspace rounded-tr-none font-medium"
                      : "bg-surface-card border border-white/5 text-gray-200 rounded-tl-none"
                }`}>
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messageEndRef} />
      </div>

      {/* Message Input Box */}
      <form onSubmit={handleSendMessage} className="bg-surface-card border-x border-b border-white/10 p-4 rounded-b-2xl flex gap-3 flex-shrink-0">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Ketik pesan keluhan lanjutan..."
          className="flex-1 bg-surface-sunken text-gray-100 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-nebula font-sans"
          required
          id="patient-reply-input"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-star text-deepspace font-bold rounded-full text-xs hover:bg-yellow-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer glow-star-sm font-sans"
          id="btn-send-patient-reply"
        >
          Kirim
        </button>
      </form>

    </div>
  );
}
