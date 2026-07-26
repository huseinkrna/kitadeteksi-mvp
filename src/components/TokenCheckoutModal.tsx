import React, { useState, useEffect } from "react";
import { X, Check, ShieldCheck, Zap, Award, Sparkles, QrCode, ArrowRight, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TokenCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess?: (tokensAdded: number, newBalance: number) => void;
}

interface TierOption {
  id: string;
  title: string;
  tokens: number;
  price: number;
  discount: string;
  perToken: number;
  label?: string;
  isBestSeller?: boolean;
}

const PRICING_TIERS: TierOption[] = [
  {
    id: "tier_1",
    title: "Cek Ombak 🌊",
    tokens: 1,
    price: 50000,
    discount: "0%",
    perToken: 50000,
    label: "Nyoba Dulu"
  },
  {
    id: "tier_2",
    title: "Curhat Santai 💬",
    tokens: 3,
    price: 142500,
    discount: "Hemat 5%",
    perToken: 47500,
    label: "Paling Pas"
  },
  {
    id: "tier_3",
    title: "Deeptalk ✨",
    tokens: 5,
    price: 217500,
    discount: "HEMAT 13%",
    perToken: 43500,
    label: "PALING HEMAT",
    isBestSeller: true
  },
  {
    id: "tier_4",
    title: "Sultan 👑",
    tokens: 10,
    price: 400000,
    discount: "Hemat 20%",
    perToken: 40000,
    label: "Hemat 100 Ribu"
  }
];

export default function TokenCheckoutModal({ isOpen, onClose, userId, onSuccess }: TokenCheckoutModalProps) {
  const [step, setStep] = useState<"pricing" | "qris">("pricing");
  const [selectedTier, setSelectedTier] = useState<TierOption>(PRICING_TIERS[2]); // Default ke Tier 3 Best Seller
  const [orderId, setOrderId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 menit countdown untuk QRIS

  useEffect(() => {
    if (isOpen) {
      setStep("pricing");
      setSelectedTier(PRICING_TIERS[2]);
      setTimeLeft(900);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if (step === "qris" && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(number);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleProceedToQRIS = async (tier: TierOption) => {
    try {
      setLoading(true);
      setSelectedTier(tier);
      const res = await fetch("/api/payment/checkout-dummy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, tier_id: tier.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat transaksi QRIS");

      setOrderId(data.transaction.order_id);
      setStep("qris");
    } catch (e: any) {
      alert(e.message || "Gagal memulai checkout");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateSuccess = async () => {
    try {
      setSimulating(true);
      const res = await fetch("/api/payment/simulate-success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Simulasi gagal");

      if (onSuccess) {
        onSuccess(selectedTier.tokens, data.wallet?.token_balance || 0);
      }
      onClose();
    } catch (e: any) {
      alert(e.message || "Terjadi kesalahan saat simulasi pembayaran");
    } finally {
      setSimulating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-deepspace border border-white/10 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden relative"
      >
        {/* Header Bar */}
        <div className="bg-surface-card border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-nebula/20 flex items-center justify-center text-nebula">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100 leading-tight">
                {step === "pricing" ? "Top Up Token Konsultasi 24 Jam" : "Pembayaran QRIS Dinamis"}
              </h3>
              <p className="text-[11px] text-gray-400">
                {step === "pricing" ? "Sistem Token Freemium Hook - Aktifkan saat Anda siap konsultasi" : "Midtrans Sandbox Simulation Mode"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {step === "pricing" ? (
            <div className="space-y-6">
              {/* Info Banner */}
              <div className="bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl p-4 flex items-start gap-3 shadow-md">
                <Award className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-white text-sm">Mengapa Menggunakan Token Konsultasi?</p>
                  <p className="leading-relaxed font-normal text-slate-300">
                    Setiap 1 Token memberikan akses ruang chat konsultasi bersama dokter spesialis jiwa selama <span className="bg-amber-400 text-black font-extrabold px-1.5 py-0.5 rounded shadow-sm inline-block uppercase tracking-wider text-[11px]">tepat 24 jam</span>. Waktu mundur tidak langsung aktif saat dibeli, melainkan baru dimulai sejak Anda mengaktifkannya di dalam ruang chat!
                  </p>
                </div>
              </div>

              {/* Decoy Effect Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PRICING_TIERS.map((tier) => {
                  const isSelected = selectedTier.id === tier.id;
                  const isBest = tier.isBestSeller;

                  return (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedTier(tier)}
                      className={`group relative rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.25)] ring-2 ring-amber-400 md:scale-102 z-10"
                          : isBest
                          ? "bg-gradient-to-br from-sky-50/60 to-indigo-50/40 border-sky-300 shadow-md hover:border-sky-400 hover:bg-sky-50"
                          : "bg-white border-gray-200 hover:border-sky-300 hover:bg-sky-50/50"
                      }`}
                    >
                      {/* Ribbon Label (Nyoba Dulu, Paling Pas, Paling Hemat, Hemat 100 Ribu) */}
                      {tier.label && (
                        <div className="absolute -top-3 left-4 bg-slate-900 border border-slate-700 text-white font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-md z-20">
                          {tier.label}
                        </div>
                      )}

                      {/* Ribbon Selected (Di Kanan) */}
                      {isSelected && (
                        <div className="absolute -top-3 right-4 bg-amber-500 text-black font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1 z-20">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          DIPILIH
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-start mb-2 mt-1">
                          <div>
                            <span className="text-xs text-gray-600 font-bold block uppercase tracking-wider">{tier.title}</span>
                            <h4 className="text-2xl font-black text-slate-800 flex items-baseline gap-1 mt-0.5">
                              {tier.tokens} <span className="text-xs font-bold text-gray-700">Token</span>
                            </h4>
                          </div>
                          {tier.discount !== "0%" && (
                            <span className="bg-green-100 text-green-700 border border-green-300 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                              {tier.discount}
                            </span>
                          )}
                        </div>

                        <div className="my-3 pt-3 border-t border-gray-200 flex justify-between items-baseline">
                          <span className="text-base font-black text-slate-800">{formatRupiah(tier.price)}</span>
                          <span className="text-[11px] text-gray-600 font-mono font-semibold">({formatRupiah(tier.perToken)}/tok)</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProceedToQRIS(tier);
                        }}
                        disabled={loading}
                        className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer ${
                          isSelected
                            ? "bg-amber-500 text-black group-hover:bg-sky-200 group-hover:text-slate-900 hover:!bg-sky-300 shadow-md"
                            : isBest
                            ? "bg-sky-500 text-white group-hover:bg-sky-200 group-hover:text-slate-900 hover:!bg-sky-300 shadow-sm"
                            : "bg-gray-100 text-gray-800 group-hover:bg-sky-200 group-hover:text-slate-900 hover:!bg-sky-300"
                        }`}
                      >
                        {loading && isSelected ? "Memproses..." : "Pilih Paket Ini"}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Prominent Bottom Buy Button */}
              <div className="pt-2">
                <button
                  onClick={() => handleProceedToQRIS(selectedTier)}
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black font-extrabold rounded-2xl text-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  {loading ? "Memproses Transaksi..." : `Beli Sekarang (${selectedTier.title}) — ${formatRupiah(selectedTier.price)}`}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 pt-1 font-mono font-medium">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                Dukung oleh integrasi payment gateway Midtrans & QRIS Dinamis
              </div>
            </div>
          ) : (
            /* QRIS SIMULATION VIEW */
            <div className="flex flex-col items-center justify-center space-y-6 py-2">
              <div className="text-center space-y-1">
                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                  Midtrans Sandbox Mode
                </span>
                <h4 className="text-lg font-black text-slate-800 mt-2">Pindai QRIS untuk Pembayaran</h4>
                <p className="text-xs text-slate-800 font-bold">
                  Total tagihan: <strong className="text-slate-800 font-mono font-black text-sm">{formatRupiah(selectedTier.price)}</strong> ({selectedTier.tokens} Token)
                </p>
                <p className="text-[10px] font-mono text-gray-500">ID Pesanan: {orderId}</p>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-5 rounded-3xl shadow-xl flex flex-col items-center relative border-4 border-gray-100">
                <div className="w-48 h-48 bg-gray-100 rounded-xl flex flex-col items-center justify-center relative overflow-hidden border border-gray-300">
                  <QrCode className="w-36 h-36 text-gray-800" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent animate-pulse" />
                </div>
                <div className="mt-3 flex items-center justify-between w-full text-[10px] font-bold text-gray-700 px-1">
                  <span>QRIS NMM / GPN</span>
                  <span className="text-red-600 font-mono">Exp: {formatTime(timeLeft)}</span>
                </div>
              </div>

              {/* Escape Hatch Button for Demo */}
              <div className="w-full max-w-md bg-amber-50 border border-amber-300 rounded-2xl p-4 text-center space-y-3 shadow-lg">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-800">
                  <Zap className="w-4 h-4 text-amber-600" />
                  FITUR ESCAPE HATCH (LIVE DEMO)
                </div>
                <p className="text-[11px] text-slate-800 font-bold leading-relaxed">
                  Dalam sesi demonstrasi presentasi, tekan tombol di bawah ini untuk menyimulasikan *Webhook Midtrans* berhasil menerima pembayaran dan langsung menambahkan token ke akun Anda.
                </p>
                <button
                  onClick={handleSimulateSuccess}
                  disabled={simulating}
                  className="w-full py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black font-extrabold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  {simulating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menambahkan Token...
                    </>
                  ) : (
                    <>
                      ⚡ Simulasikan Pembayaran Berhasil
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => setStep("pricing")}
                className="text-xs text-gray-600 hover:text-red-600 font-bold underline transition-colors cursor-pointer"
              >
                Kembali pilih paket lain
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
