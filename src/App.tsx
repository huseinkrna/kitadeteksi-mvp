import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import AuthPage from "./components/AuthPage";
import PatientPairingView from "./components/PatientPairingView";
import PatientDashboard from "./components/PatientDashboard";
import PatientTicketView from "./components/PatientTicketView";
import ScreeningFlow from "./components/ScreeningFlow";
import DoctorDashboard from "./components/DoctorDashboard";
import DoctorTicketView from "./components/DoctorTicketView";
import RedAlertModal from "./components/RedAlertModal";
import DeveloperDashboard from "./components/DeveloperDashboard";
import PwaPrompt from "./components/PwaPrompt";
import { Profile } from "./types";

export default function App() {
  const [user, setUser] = useState<Profile | null>(null);
  const [paired, setPaired] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<"dashboard" | "screening" | "ticket">("dashboard");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isCritical, setIsCritical] = useState<boolean>(false);
  const [doctorName, setDoctorName] = useState("Dr. Sarah, Sp.KJ");
  const [checkingPairing, setCheckingPairing] = useState(false);

  // Load user session from local storage on mount
  useEffect(() => {
    const cached = localStorage.getItem("kitadeteksi_session");
    if (cached) {
      try {
        const profile = JSON.parse(cached);
        setUser(profile);
      } catch (e) {
        console.error("Gagal mengurai cache session", e);
      }
    }
  }, []);

  // Fetch pairing status or verification status whenever user state changes
  useEffect(() => {
    if (!user) {
      setPaired(false);
      return;
    }

    const checkStatus = async () => {
      try {
        setCheckingPairing(true);
        if (user.role === "patient") {
          const res = await fetch(`/api/patient/pairing-status?patient_id=${user.user_id}`);
          const data = await res.json();
          setPaired(!!data.paired);
          if (data.paired && data.doctor) {
            setDoctorName(data.doctor.full_name);
          }
          if (data.is_verified !== undefined && data.is_verified !== user.is_verified) {
            const updatedUser = { ...user, is_verified: data.is_verified };
            setUser(updatedUser);
            localStorage.setItem("kitadeteksi_session", JSON.stringify(updatedUser));
          }
        } else if (user.role === "doctor" && !user.is_verified) {
          const res = await fetch(`/api/profile/status?user_id=${user.user_id}`);
          const data = await res.json();
          if (data.is_verified === true) {
            const updatedUser = { ...user, is_verified: true };
            setUser(updatedUser);
            localStorage.setItem("kitadeteksi_session", JSON.stringify(updatedUser));
          }
        }
      } catch (e) {
        console.error("Gagal mengecek status:", e);
      } finally {
        setCheckingPairing(false);
      }
    };

    checkStatus();
  }, [user]);

  // Handle successful login/registration
  const handleAuthSuccess = (profile: Profile) => {
    setUser(profile);
    localStorage.setItem("kitadeteksi_session", JSON.stringify(profile));
    setActivePage("dashboard");
  };

  // Sign out user
  const handleLogout = () => {
    setUser(null);
    setPaired(false);
    setActivePage("dashboard");
    setSelectedTicketId(null);
    setIsCritical(false);
    localStorage.removeItem("kitadeteksi_session");
  };

  // 1. If not authenticated, show Auth Page
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // 2. If patient and not yet paired, force Onboarding Pairing Screen
  if (user.role === "patient" && !paired) {
    if (checkingPairing) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-deepspace text-gray-400 font-sans">
          <p>Mengecek status akun...</p>
        </div>
      );
    }
    return (
      <PatientPairingView
        profile={user}
        onPairingSuccess={() => setPaired(true)}
        onBack={handleLogout}
      />
    );
  }

  // 2.5 If patient is paired but NOT verified yet, show Waiting for Verification
  if (user.role === "patient" && paired && !user.is_verified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-deepspace font-sans text-center">
        <div className="bg-surface-card border border-white/10 p-8 rounded-2xl max-w-md shadow-2xl glow-nebula-sm">
          <h2 className="text-2xl font-bold text-gray-100 mb-4 tracking-tight">Menunggu Verifikasi Dokter</h2>
          <p className="text-gray-400 mb-6 leading-relaxed text-sm">
            Akun Anda telah berhasil ditautkan dengan <strong>{doctorName}</strong>.<br/><br/>
            Namun, saat ini Anda masih menunggu persetujuan (verifikasi) dari dokter Anda agar dapat menggunakan fitur dashboard secara penuh.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-3 bg-nebula text-white font-bold rounded-full text-sm hover:bg-sky-600 transition-colors"
            >
              Muat Ulang (Cek Status)
            </button>
            <button 
              onClick={handleLogout} 
              className="w-full py-3 bg-white/5 text-gray-300 font-bold rounded-full text-sm hover:bg-white/10 transition-colors border border-white/10"
            >
              Kembali / Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2.7 If doctor is not verified yet, show Waiting for Superadmin Verification
  if (user.role === "doctor" && !user.is_verified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-deepspace font-sans text-center">
        <div className="bg-surface-card border border-white/10 p-8 rounded-2xl max-w-md shadow-2xl glow-nebula-sm">
          <h2 className="text-2xl font-bold text-gray-100 mb-4 tracking-tight">Menunggu Verifikasi Admin</h2>
          <p className="text-gray-400 mb-6 leading-relaxed text-sm">
            Akun Psikiater Anda telah berhasil didaftarkan ke sistem KITADETEKSI.<br/><br/>
            Sesuai protokol keamanan dan validasi lisensi medis, akun Anda harus diverifikasi oleh Super Admin (Developer) sebelum Anda dapat mengakses Dashboard Klinis dan mulai menerima pasien.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-3 bg-emerald-600 text-white font-bold rounded-full text-sm hover:bg-emerald-700 transition-colors"
            >
              Cek Status Verifikasi
            </button>
            <button 
              onClick={handleLogout} 
              className="w-full py-3 bg-white/5 text-gray-300 font-bold rounded-full text-sm hover:bg-white/10 transition-colors border border-white/10"
            >
              Kembali / Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Render appropriate Dashboard Experience based on Roles
  return (
    <div className="min-h-screen bg-deepspace text-gray-200 flex flex-col font-sans">
      
      {/* Universal Top Header */}
      <Navbar profile={user} onLogout={handleLogout} />

      {/* Main Routing Views */}
      <div className="flex-1">
        {user.role === "patient" ? (
          /* PATIENT PAGES */
          activePage === "screening" ? (
            <ScreeningFlow
              profile={user}
              onFinish={() => {
                setActivePage("dashboard");
              }}
              onRedAlert={() => {
                setIsCritical(true);
                setActivePage("dashboard");
              }}
            />
          ) : activePage === "ticket" && selectedTicketId ? (
            <PatientTicketView
              ticketId={selectedTicketId}
              patientId={user.user_id}
              doctorName={doctorName}
              onBack={() => setActivePage("dashboard")}
            />
          ) : (
            <PatientDashboard
              profile={user}
              onStartScreening={() => setActivePage("screening")}
              onViewTicket={(id) => {
                setSelectedTicketId(id);
                setActivePage("ticket");
              }}
              onRedAlert={() => setIsCritical(true)}
              onProfileUpdate={handleAuthSuccess}
            />
          )
        ) : user.role === "doctor" ? (
          /* DOCTOR PAGES */
          activePage === "ticket" && selectedTicketId ? (
            <DoctorTicketView
              ticketId={selectedTicketId}
              doctorId={user.user_id}
              onBack={() => setActivePage("dashboard")}
            />
          ) : (
            <DoctorDashboard
              profile={user}
              onViewTicket={(id) => {
                setSelectedTicketId(id);
                setActivePage("ticket");
              }}
              onProfileUpdate={handleAuthSuccess}
            />
          )
        ) : (
          /* DEVELOPER PAGES */
          <DeveloperDashboard profile={user} />
        )}
      </div>

      {/* GLOBAL RED ALERT CRITICAL LOCKING MODAL */}
      <RedAlertModal 
        isOpen={isCritical} 
        onClose={() => setIsCritical(false)} 
      />
      
      {/* PWA INSTALL PROMPT */}
      <PwaPrompt />

    </div>
  );
}
