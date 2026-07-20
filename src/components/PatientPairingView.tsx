import { useState, FormEvent } from "react";
import { Link2, Sparkles, AlertCircle, HelpCircle } from "lucide-react";
import { motion } from "motion/react";
import { Profile } from "../types";

interface PatientPairingViewProps {
  profile: Profile;
  onPairingSuccess: () => void;
  onBack?: () => void;
}

export default function PatientPairingView({ profile, onPairingSuccess, onBack }: PatientPairingViewProps) {
  const [pairingCode, setPairingCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!pairingCode.trim()) {
      setError("Kode pairing wajib diisi");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/patient/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: profile.user_id,
          pairing_code: pairingCode.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghubungkan akun");
      }

      setSuccess("Berhasil! Menunggu verifikasi dokter...");
      setTimeout(() => {
        onPairingSuccess();
      }, 1500);
    } catch (e: any) {
      setError(e.message || "Gagal melakukan pairing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-deepspace font-sans relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-deepspace to-deepspace z-0"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-surface-card border border-white/10 p-8 rounded-2xl relative z-10 shadow-2xl glow-nebula-sm text-center"
        id="pairing-box"
      >
        <div className="inline-flex items-center justify-center p-4 bg-nebula/10 rounded-full mb-6 text-nebula border border-nebula/20">
          <Link2 className="w-8 h-8" />
        </div>

        <h2 className="font-display text-2xl font-bold text-gray-100 tracking-tight mb-2">
          Tautkan Akun Dokter
        </h2>
        
        <p className="text-sm text-gray-400 font-sans leading-relaxed mb-6">
          Masukkan 6-digit (atau 5-digit) kode unik yang diberikan oleh psikiater/psikolog Anda untuk memulai pemantauan klinis asinkron.
        </p>

        {error && (
          <div className="p-3 bg-red-300 text-black border border-red-500/30 text-xs rounded-xl mb-4 text-left flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-black flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-300 text-black border border-green-500/30 text-xs rounded-xl mb-4 text-left flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-black flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
              placeholder="INPUT KODE DOKTER (e.g. X7B9K)"
              className="w-full bg-surface-sunken text-gray-100 border-2 border-white/10 rounded-xl px-4 py-3.5 text-center text-lg font-mono font-bold uppercase tracking-widest focus:outline-none focus:border-nebula focus:ring-1 focus:ring-nebula/30"
              maxLength={10}
              required
              id="input-pairing-code"
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-star text-deepspace font-bold rounded-full text-sm hover:bg-yellow-300 transition-colors duration-200 glow-star-sm cursor-pointer font-sans"
              id="btn-verify-pairing"
            >
              {loading ? "Memverifikasi..." : "VERIFIKASI & HUBUNGKAN"}
            </button>
            
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                disabled={loading}
                className="w-full py-3 bg-white/5 text-gray-300 font-bold rounded-full text-sm hover:bg-white/10 transition-colors border border-white/10 cursor-pointer font-sans"
              >
                Kembali
              </button>
            )}
          </div>
        </form>


      </motion.div>
    </div>
  );
}
