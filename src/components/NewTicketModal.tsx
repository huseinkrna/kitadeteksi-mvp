import { useState, FormEvent } from "react";
import { X, MessageSquare, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (initialMessage: string) => Promise<void>;
  doctorName: string;
}

export default function NewTicketModal({ isOpen, onClose, onSubmit, doctorName }: NewTicketModalProps) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmitting = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Pesan keluhan awal wajib diisi");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await onSubmit(message);
      setMessage("");
      onClose();
    } catch (e: any) {
      setError(e.message || "Gagal membuat tiket");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#141136]/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg overflow-hidden border border-white/10 rounded-2xl bg-surface-card p-6 shadow-2xl glow-nebula-md"
          id="new-ticket-modal"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display text-lg font-bold text-gray-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-nebula" />
              Mulai Konsultasi Asinkron Baru
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmitting} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/20 text-red-200 border border-red-500/30 text-xs rounded-xl font-sans">
                {error}
              </div>
            )}

            <div className="bg-surface-sunken p-4 rounded-xl border border-white/5">
              <p className="text-xs text-gray-400 font-sans uppercase tracking-wider font-semibold">
                DOKTER PENERIMA
              </p>
              <p className="text-sm font-bold text-gray-200 font-sans mt-1">
                {doctorName}
              </p>
              <p className="text-xs text-nebula font-sans mt-2">
                * Tiket ini dilindungi SLA 24 Jam. Jika dokter tidak merespon dalam waktu tersebut, tiket otomatis masuk eskalasi audit.
              </p>
            </div>

            {/* Message Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 font-sans uppercase tracking-wider">
                APA KELUHAN ATAU PERTANYAAN AWAL ANDA?
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Jelaskan kondisi kesehatan mental atau fisik yang sedang Anda hadapi. Berikan sedetail mungkin agar dokter dapat segera memberikan arahan terapeutik..."
                rows={5}
                className="w-full bg-surface-sunken text-gray-100 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nebula focus:ring-1 focus:ring-nebula/30 font-sans transition-all duration-200"
                id="ticket-message-textarea"
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-sans"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-star text-deepspace font-bold rounded-full text-sm hover:bg-yellow-300 transition-colors duration-200 glow-star-sm flex items-center gap-2 cursor-pointer font-sans"
                id="ticket-submit-btn"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Mengirim..." : "Kirim Keluhan"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
