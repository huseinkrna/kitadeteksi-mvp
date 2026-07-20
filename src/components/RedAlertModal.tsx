import { useState, useEffect } from "react";
import { AlertOctagon, Phone, ShieldAlert, HeartHandshake } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RedAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RedAlertModal({ isOpen, onClose }: RedAlertModalProps) {
  const [countdown, setCountdown] = useState(10);
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    
    // Reset timer
    setCountdown(10);
    setIsLocked(true);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141136]/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-2xl overflow-hidden border-2 border-red-500 rounded-2xl bg-surface-card p-8 text-center glow-red-lg"
          id="red-alert-container"
        >
          {/* Pulsing Alert Icon */}
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ 
                scale: [1, 1.15, 1],
                boxShadow: [
                  "0 0 10px rgba(239, 68, 68, 0.4)",
                  "0 0 30px rgba(239, 68, 68, 0.8)",
                  "0 0 10px rgba(239, 68, 68, 0.4)"
                ]
              }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="p-4 bg-red-500/20 border-2 border-red-500 rounded-full text-red-400"
            >
              <AlertOctagon className="w-16 h-16" />
            </motion.div>
          </div>

          <h2 className="font-display text-3xl font-bold text-red-400 mb-4 tracking-tight">
            SISTEM TRIAGE DARURAT AKTIF
          </h2>

          <div className="space-y-4 max-w-lg mx-auto text-gray-200 mb-8 font-sans leading-relaxed text-lg">
            <p className="font-medium text-red-200">
              "Sistem mendeteksi Anda sedang dalam situasi yang sangat sulit dan menyakitkan. Dokter Anda telah dinotifikasi secara darurat. Anda tidak sendirian."
            </p>
            <p className="text-sm text-gray-400">
              Jangan ragu untuk mencari dukungan langsung sekarang. Tim krisis medis kami dan nomor darurat nasional siap membantu Anda kapan pun Anda membutuhkannya.
            </p>
          </div>

          {/* Huge Call Button */}
          <div className="mb-8">
            <motion.a
              href="tel:119"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-5 text-xl font-bold text-deepspace bg-star rounded-full cursor-pointer hover:bg-yellow-300 transition-colors duration-200 glow-star-md font-sans"
              id="btn-call-hotline"
            >
              <Phone className="w-6 h-6 animate-bounce" />
              HUBUNGI LAYAN JIWA (119 ext 8)
            </motion.a>
          </div>

          {/* Subtext info */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-8 bg-deepspace/50 p-3 rounded-xl border border-white/5">
            <HeartHandshake className="w-4 h-4 text-nebula" />
            <span>Hotline ini gratis, beroperasi 24 jam sehari, 7 hari seminggu.</span>
          </div>

          {/* Dismiss button */}
          <div>
            <button
              onClick={() => {
                if (!isLocked) {
                  onClose();
                }
              }}
              disabled={isLocked}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                isLocked
                  ? "bg-gray-700/50 text-gray-500 border border-gray-600/30 cursor-not-allowed"
                  : "bg-surface-sunken text-nebula hover:bg-nebula hover:text-deepspace border border-nebula/40 cursor-pointer glow-nebula-sm"
              }`}
              id="btn-dismiss-alert"
            >
              {isLocked 
                ? `Opsi tutup pesan ini dikunci selama ${countdown} detik agar nomor terbaca`
                : "Saya mengerti situasi ini & Tutup Alert"
              }
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
