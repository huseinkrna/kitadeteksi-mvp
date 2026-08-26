import { useState, FormEvent } from "react";
import { X, Activity, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, moodScale: number) => Promise<void>;
}

const PROBLEM_CATEGORIES = [
  { id: "akademik", label: "🎓 Akademik" },
  { id: "pekerjaan", label: "💼 Pekerjaan" },
  { id: "asmara", label: "❤️ Asmara" },
  { id: "keluarga", label: "🏠 Keluarga" },
  { id: "keuangan", label: "💸 Keuangan" },
  { id: "sosial", label: "👥 Sosial" },
  { id: "kesehatan", label: "🏥 Kesehatan" },
  { id: "masadepan", label: "🔮 Masa Depan" },
  { id: "lalulintas", label: "🚦 Lalu Lintas" },
  { id: "sosmed", label: "📱 Sosmed" },
];

const EMOTION_CATEGORIES = [
  "Cemas (Anxiety)",
  "Takut (Fear)",
  "Sedih (Depression)",
  "Marah (Anger)",
  "Malu (Shame)",
  "Bersalah (Guilt)",
  "Hampa (Numbness)",
  "Lainnya (Tulis Sendiri)"
];

export default function JournalModal({ isOpen, onClose, onSubmit }: JournalModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // A. Activating Event
  const [eventText, setEventText] = useState("");
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);

  // B. Automatic Thought
  const [thoughtText, setThoughtText] = useState("");

  // C. Consequence
  const [emotionCategory, setEmotionCategory] = useState("");
  const [otherEmotion, setOtherEmotion] = useState("");
  const [intensity, setIntensity] = useState(5);

  // D. Rational Response
  const [responseText, setResponseText] = useState("");

  const handleSubmitting = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventText.trim() || !thoughtText.trim() || !emotionCategory || !responseText.trim()) {
      setError("Mohon lengkapi seluruh bagian Analisis Kognitif (ABC Model).");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const finalEmotion = emotionCategory === "Lainnya (Tulis Sendiri)" && otherEmotion.trim() 
        ? otherEmotion 
        : emotionCategory;

      const formattedContent = `[A - Pemicu]
${eventText.trim()}
Kategori: ${selectedProblems.length > 0 ? selectedProblems.join(", ") : "-"}

[B - Pikiran Otomatis]
${thoughtText.trim()}

[C - Analisis Emosi]
Emosi Utama: ${finalEmotion}
Intensitas: ${intensity}/10

[D - Tantangan Logis]
${responseText.trim()}`;

      // the moodScale historically was 1-10 for overall mood, we use intensity here
      await onSubmit(formattedContent, intensity);
      
      // Reset form
      setEventText("");
      setSelectedProblems([]);
      setThoughtText("");
      setEmotionCategory("");
      setOtherEmotion("");
      setIntensity(5);
      setResponseText("");
      onClose();
    } catch (e: any) {
      setError(e.message || "Gagal menyimpan jurnal");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProblem = (label: string) => {
    setSelectedProblems(prev => {
      if (prev.includes(label)) return prev.filter(p => p !== label);
      if (prev.length >= 3) return prev;
      return [...prev, label];
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-[#141136]/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10 rounded-2xl bg-surface-card p-4 sm:p-6 shadow-2xl glow-nebula-md my-8"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display text-lg font-bold text-gray-100 flex items-center gap-2 uppercase tracking-wide">
              <BrainCircuit className="w-5 h-5 text-sky-400" />
              Cognitive Analysis (ABC Model)
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

            {/* A. Activating Event */}
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
                <span className="font-bold text-gray-800 text-sm">A. Activating Event (Pemicu)</span>
                <span className="bg-gray-200 text-gray-600 text-[10px] px-2 py-1 rounded-full font-semibold">Fakta Objektif</span>
              </div>
              <div className="p-4">
                <textarea
                  value={eventText}
                  onChange={(e) => setEventText(e.target.value)}
                  placeholder="Contoh: Dosen menolak judul skripsi saya."
                  className="w-full text-gray-800 border-none focus:ring-0 resize-none text-sm p-0 mb-4 bg-transparent outline-none h-32 overflow-y-auto"
                />
                <div className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Kategori Masalah (Pilih Maks 3)</div>
                <div className="flex flex-wrap gap-2">
                  {PROBLEM_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleProblem(cat.label)}
                      className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                        selectedProblems.includes(cat.label) 
                          ? "bg-sky-50 border-sky-300 text-sky-700 font-semibold shadow-sm" 
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* B. Automatic Thought */}
            <div className="bg-red-50/50 rounded-xl overflow-hidden border border-red-100 shadow-sm">
              <div className="bg-red-100/50 border-b border-red-100 px-4 py-2 flex justify-between items-center">
                <span className="font-bold text-red-800 text-sm">B. Automatic Thought (Pikiran Otomatis)</span>
                <span className="bg-red-200/50 text-red-800 text-[10px] px-2 py-1 rounded-full font-semibold">Interpretasi</span>
              </div>
              <div className="p-4">
                <textarea
                  value={thoughtText}
                  onChange={(e) => setThoughtText(e.target.value)}
                  placeholder="Contoh: Saya memang bodoh, saya pasti akan gagal."
                  className="w-full text-red-900 border-none focus:ring-0 resize-none text-sm p-0 bg-transparent outline-none placeholder-red-300 h-32 overflow-y-auto"
                />
              </div>
            </div>

            {/* C. Consequence */}
            <div className="bg-blue-50/50 rounded-xl overflow-hidden border border-blue-100 shadow-sm">
              <div className="bg-blue-100/50 border-b border-blue-100 px-4 py-3">
                <span className="font-bold text-blue-900 text-sm block">C. Consequence (Analisis Emosi)</span>
                <span className="text-blue-700 text-xs">Identifikasi apa yang dirasakan.</span>
              </div>
              <div className="p-4 flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-blue-900/60 mb-2 uppercase tracking-wider">Kategori Emosi Utama</label>
                  <select
                    value={emotionCategory}
                    onChange={(e) => setEmotionCategory(e.target.value)}
                    className="w-full border border-blue-200 bg-white text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  >
                    <option value="" disabled>-- Pilih Kategori --</option>
                    {EMOTION_CATEGORIES.map(em => (
                      <option key={em} value={em}>{em}</option>
                    ))}
                  </select>
                  {emotionCategory === "Lainnya (Tulis Sendiri)" && (
                    <input
                      type="text"
                      value={otherEmotion}
                      onChange={(e) => setOtherEmotion(e.target.value)}
                      placeholder="Tuliskan emosi Anda..."
                      className="w-full mt-2 border border-blue-200 bg-white text-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-bold text-blue-900/60 uppercase tracking-wider">Intensitas Emosi</label>
                    <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {intensity}/10 - {intensity >= 8 ? "Tinggi" : intensity >= 4 ? "Sedang" : "Rendah"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={intensity}
                    onChange={(e) => setIntensity(Number(e.target.value))}
                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-2"
                  />
                </div>
              </div>
            </div>

            {/* D. Rational Response */}
            <div className="bg-emerald-50/50 rounded-xl overflow-hidden border border-emerald-100 shadow-sm">
              <div className="bg-emerald-100/50 border-b border-emerald-100 px-4 py-2 flex justify-between items-center">
                <span className="font-bold text-emerald-800 text-sm">D. Rational Response (Tantangan Logis)</span>
                <span className="bg-emerald-200/50 text-emerald-800 text-[10px] px-2 py-1 rounded-full font-semibold">Solusi</span>
              </div>
              <div className="p-4">
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Contoh: Penolakan judul itu hal biasa. Ini bukan bukti saya bodoh. Saya masih punya waktu revisi."
                  className="w-full text-emerald-900 border-none focus:ring-0 resize-none text-sm p-0 bg-transparent outline-none placeholder-emerald-300 h-32 overflow-y-auto"
                />
              </div>
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
                className="px-6 py-2.5 bg-sky-500 text-white font-bold rounded-full text-sm hover:bg-sky-600 transition-colors duration-200 shadow-lg shadow-sky-500/20 flex items-center gap-2 cursor-pointer font-sans"
              >
                {submitting ? "Menyimpan..." : "Simpan Analisis"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
