import { useState, FormEvent } from "react";
import { Sparkles, Activity, ShieldCheck, Mail, Lock, User, Phone, CheckCircle2, ShieldAlert, RefreshCw, LogOut, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { Profile } from "../types";

interface AuthPageProps {
  onAuthSuccess: (profile: Profile) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // Hanya bayangan/kosong by default
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [role, setRole] = useState<"patient" | "doctor" | "developer">("patient");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showUnverifiedScreen, setShowUnverifiedScreen] = useState(false);
  const [unverifiedProfile, setUnverifiedProfile] = useState<Profile | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleCheckVerification = async () => {
    if (!unverifiedProfile) return;
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedProfile.email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memverifikasi");
      }
      if (data.profile.is_verified) {
        setSuccess("Akun Terverifikasi! Mengalihkan ke dashboard...");
        setTimeout(() => {
          onAuthSuccess(data.profile);
        }, 1000);
      } else {
        setError("Akun Anda masih dalam antrean verifikasi dokter pengawas. Harap hubungi dokter pengawas Anda.");
      }
    } catch (e: any) {
      setError(e.message || "Gagal memeriksa status verifikasi.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowUnverifiedScreen(false);
    setUnverifiedProfile(null);
    setIsLogin(true);
    setPassword("");
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Email wajib diisi");
      return;
    }

    const payload = isLogin 
      ? { email, password } 
      : { email, password, full_name: fullName, phone_number: phoneNumber, birth_date: birthDate, role };

    try {
      setLoading(true);
      const url = isLogin ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Terjadi kesalahan");
      }

      if (isLogin) {
        setSuccess("Login Berhasil! Mengalihkan...");
        setTimeout(() => {
          onAuthSuccess(data.profile);
        }, 800);
      } else {
        setSuccess("Registrasi Berhasil! Akun pasien baru memerlukan verifikasi oleh dokter sebelum dapat login.");
        setTimeout(() => {
          setIsLogin(true);
          setPassword("");
          setError("");
          setSuccess("");
        }, 2500);
      }
    } catch (e: any) {
      setError(e.message || "Gagal menghubungkan ke server");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleType: "patient" | "doctor" | "developer") => {
    const demoEmail = roleType === "doctor" ? "doctor@kitadeteksi.com" : roleType === "developer" ? "developer@kitadeteksi.com" : "budi@kitadeteksi.com";
    const demoPassword = "password";
    
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsLogin(true);
    
    setError("");
    setSuccess("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-deepspace font-sans relative overflow-hidden">
      {/* Background stars animation */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-deepspace to-deepspace z-0"></div>

      {/* Floating abstract decorative objects */}
      <motion.div 
        animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        className="absolute top-12 left-12 w-24 h-24 rounded-full bg-nebula/10 blur-xl z-0"
      ></motion.div>
      <motion.div 
        animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
        className="absolute bottom-16 right-16 w-32 h-32 rounded-full bg-indigo-500/10 blur-2xl z-0"
      ></motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={`w-full max-w-md border p-8 rounded-2xl relative z-10 shadow-2xl transition-colors duration-500 ${
          !isLogin && role === 'doctor' 
            ? 'bg-emerald-950/40 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.15)]' 
            : 'bg-surface-card border-white/10 glow-nebula-md'
        }`}
        id="auth-box"
      >
        {/* Brand / Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img 
              src="/logo.svg" 
              className="h-20 rounded-xl shadow-lg border border-white/5 transition-transform hover:scale-105" 
              alt="KITADETEKSI Logo" 
            />
          </div>
          <p className="text-xs text-nebula font-mono uppercase tracking-widest mt-2">
            Kita Bantu Deteksi Gejala
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="p-3 bg-red-300 text-black border border-red-500 text-xs rounded-xl mb-4 font-sans font-bold shadow-sm"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="p-3 bg-green-300 text-black border border-green-500 text-xs rounded-xl mb-4 flex items-center gap-2 font-sans font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-black" />
            {success}
          </motion.div>
        )}

        {showUnverifiedScreen ? (
          /* UNVERIFIED PATIENT SCREEN BLOCK */
          <div className="space-y-6">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex flex-col items-center text-center">
              <ShieldAlert className="w-10 h-10 text-yellow-400 mb-3 animate-pulse" />
              <h3 className="text-sm font-bold text-yellow-200 font-sans">Menunggu Verifikasi Dokter</h3>
              <p className="text-xs text-gray-400 mt-2 font-sans leading-relaxed">
                Sesuai dengan protokol klinis <strong>KITADETEKSI</strong>, akun pasien baru wajib melalui proses 
                verifikasi dokter pengawas terlebih dahulu untuk memastikan legalitas dan keselamatan asinkronous medis.
              </p>
            </div>

            <div className="text-xs space-y-1.5 bg-surface-sunken p-4 rounded-xl border border-white/5 text-gray-300 font-mono">
              <p><span className="text-gray-500">NAMA:</span> {unverifiedProfile?.full_name}</p>
              <p><span className="text-gray-500">EMAIL:</span> {unverifiedProfile?.email}</p>
              <p><span className="text-gray-500">HP:</span> {unverifiedProfile?.phone_number}</p>
              <p><span className="text-gray-500">STATUS:</span> <span className="text-yellow-400 animate-pulse">BELUM DIVERIFIKASI</span></p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleCheckVerification}
                disabled={loading}
                className="w-full py-2.5 bg-nebula text-deepspace font-bold rounded-full text-xs hover:bg-opacity-80 transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Memeriksa..." : "Perbarui Status Verifikasi"}
              </button>
              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full py-2.5 bg-surface-sunken hover:bg-white/5 border border-white/10 text-gray-300 rounded-full text-xs transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
              >
                <LogOut className="w-4 h-4" />
                Kembali ke Login
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD LOGIN / REGISTRATION FORM */
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* REGISTER EXTRA FIELDS */}
          {!isLogin && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-4 overflow-hidden"
            >
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider font-sans">
                  Daftar Sebagai
                </label>
                <div className="grid grid-cols-2 gap-3" id="role-selector">
                  <button
                    type="button"
                    onClick={() => setRole("patient")}
                    className={`py-2 px-4 rounded-xl text-xs font-semibold border transition-all ${
                      role === "patient"
                        ? "bg-sky-500 text-white border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.4)]"
                        : "bg-surface-sunken text-gray-400 border-white/5 hover:border-white/20"
                    }`}
                  >
                    Pasien
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("doctor")}
                    className={`py-2 px-4 rounded-xl text-xs font-semibold border transition-all ${
                      role === "doctor"
                        ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                        : "bg-surface-sunken text-gray-400 border-white/5 hover:border-white/20"
                    }`}
                  >
                    Dokter
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-sans">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className={`w-full bg-surface-sunken text-gray-200 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 font-sans ${!isLogin && role === 'doctor' ? 'focus:border-emerald-500 focus:ring-emerald-500/30' : !isLogin && role === 'patient' ? 'focus:border-sky-500 focus:ring-sky-500/30' : 'focus:border-nebula focus:ring-nebula/30'}`}
                    required={!isLogin}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-sans">
                  Nomor HP Aktif
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Contoh: +628123456789"
                    className={`w-full bg-surface-sunken text-gray-200 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 font-sans ${!isLogin && role === 'doctor' ? 'focus:border-emerald-500 focus:ring-emerald-500/30' : !isLogin && role === 'patient' ? 'focus:border-sky-500 focus:ring-sky-500/30' : 'focus:border-nebula focus:ring-nebula/30'}`}
                    required={!isLogin}
                  />
                </div>
              </div>

              {/* Tanggal Lahir */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-sans">
                  Tanggal Lahir
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className={`w-full bg-surface-sunken text-gray-200 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 font-sans ${!isLogin && role === 'doctor' ? 'focus:border-emerald-500 focus:ring-emerald-500/30' : !isLogin && role === 'patient' ? 'focus:border-sky-500 focus:ring-sky-500/30' : 'focus:border-nebula focus:ring-nebula/30'}`}
                    required={!isLogin}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-sans">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Contoh: pasien@email.com"
                className={`w-full bg-surface-sunken text-gray-200 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 font-sans ${!isLogin && role === 'doctor' ? 'focus:border-emerald-500 focus:ring-emerald-500/30' : !isLogin && role === 'patient' ? 'focus:border-sky-500 focus:ring-sky-500/30' : 'focus:border-nebula focus:ring-nebula/30'}`}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider font-sans">
              Sandi / Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi Anda"
                className={`w-full bg-surface-sunken text-gray-200 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 font-sans ${!isLogin && role === 'doctor' ? 'focus:border-emerald-500 focus:ring-emerald-500/30' : !isLogin && role === 'patient' ? 'focus:border-sky-500 focus:ring-sky-500/30' : 'focus:border-nebula focus:ring-nebula/30'}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                title={showPassword ? "Sembunyikan Sandi" : "Tampilkan Sandi"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 bg-star text-deepspace font-bold rounded-full text-sm hover:bg-yellow-300 transition-colors duration-200 glow-star-sm cursor-pointer font-sans"
            id="auth-submit-btn"
          >
            {loading ? "Memproses..." : isLogin ? "Masuk ke Dashboard" : "Daftar Akun Baru"}
          </button>
        </form>

        {/* Toggle Login/Register */}
        <div className="text-center mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-nebula hover:underline cursor-pointer"
          >
            {isLogin ? "Belum punya akun? Daftar gratis di sini" : "Sudah punya akun? Masuk sekarang"}
          </button>
          
          {isLogin && (
            <button
              type="button"
              onClick={() => alert("Jika Anda lupa sandi, silakan hubungi Developer via WhatsApp: 085694495592")}
              className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
            >
              Lupa Sandi?
            </button>
          )}
        </div>

        </>
        )}

      </motion.div>
    </div>
  );
}
