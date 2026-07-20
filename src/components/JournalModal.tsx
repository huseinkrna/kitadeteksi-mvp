import { useState, FormEvent } from "react";
import { X, Heart, Smile, Meh, Frown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, moodScale: number) => Promise<void>;
}

export default function JournalModal({ isOpen, onClose, onSubmit }: JournalModalProps) {
  const [content, setContent] = useState("");
  const [moodScale, setMoodScale] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmitting = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Isi tulisan jurnal Anda terlebih dahulu");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await onSubmit(content, moodScale);
      setContent("");
      setMoodScale(5);
      onClose();
    } catch (e: any) {
      setError(e.message || "Gagal menyimpan jurnal");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Helpers to render corresponding mood face
  const getMoodEmoji = (val: number) => {
    if (val >= 8) return <Smile className="w-12 h-12 text-green-400" />;
    if (val >= 5) return <Meh className="w-12 h-12 text-yellow-400" />;
    return <Frown className="w-12 h-12 text-red-400" />;
  };

  const getMoodText = (val: number) => {
    if (val >= 9) return "Luar Biasa Baik (Sangat Positif)";
    if (val >= 7) return "Baik & Stabil";
    if (val >= 5) return "Biasa Saja / Netral";
    if (val >= 3) return "Agak Cemas / Sedih";
    return "Sangat Buruk / Butuh Bimbingan";
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#141136]/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg overflow-hidden border border-white/10 rounded-2xl bg-surface-card p-6 shadow-2xl glow-nebula-md"
          id="journal-modal"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display text-lg font-bold text-gray-100 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-400" />
              Tulis Jurnal Harian (Self-Reflection)
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
              <div className="p-3 bg-red-500/20 text-red-200 border border-red-500/30 text-xs rounded-xl">
                {error}
              </div>
            )}

            {/* Mood Scale Slider */}
            <div className="bg-surface-sunken p-4 rounded-xl border border-white/5 text-center">
              <label className="block text-xs font-semibold text-gray-400 mb-2 font-sans">
                BAGAIMANA MOOD ANDA HARI INI? (Skala 1-10)
              </label>
              
              <div className="flex flex-col items-center justify-center mb-3">
                {getMoodEmoji(moodScale)}
                <span className="text-sm font-semibold text-gray-200 mt-2 font-sans">
                  {moodScale} / 10
                </span>
                <span className="text-xs text-nebula font-medium mt-1">
                  {getMoodText(moodScale)}
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="10"
                value={moodScale}
                onChange={(e) => setMoodScale(Number(e.target.value))}
                className="w-full accent-nebula cursor-pointer h-2 bg-deepspace rounded-lg appearance-none"
                id="mood-slider"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1 px-1">
                <span>1 (Buruk)</span>
                <span>5 (Netral)</span>
                <span>10 (Sempurna)</span>
              </div>
            </div>

            {/* Content Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 font-sans">
                APA YANG SEDANG ANDA PIKIRKAN / RASAKAN?
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tuliskan pengalaman, kekhawatiran, atau perasaan Anda secara jujur di sini. Hanya dokter pengawas Anda yang dapat melihat jurnal ini..."
                rows={5}
                className="w-full bg-surface-sunken text-gray-100 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-nebula focus:ring-1 focus:ring-nebula/30 font-sans transition-all duration-200"
                id="journal-textarea"
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
                id="journal-submit-btn"
              >
                {submitting ? "Menyimpan..." : "Simpan Jurnal"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
