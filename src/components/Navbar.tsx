import { LogOut, Activity, User, ShieldAlert } from "lucide-react";
import { Profile } from "../types";

interface NavbarProps {
  profile: Profile;
  onLogout: () => void;
}

export default function Navbar({ profile, onLogout }: NavbarProps) {
  return (
    <header className="w-full bg-deepspace border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
      <div className="flex items-center gap-3">
        <img 
          src="/RUANGTARA.svg" 
          className="h-10 rounded-lg border border-white/5 shadow-md" 
          alt="RUANGTARA Logo" 
        />
        <div className="hidden sm:block">
          <span className="text-[10px] text-gray-400 font-mono tracking-wider block">
            DEMOCRATIZING MENTAL HEALTHCARE THROUGH AI CO-PILOT
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User profile capsule */}
        <div className="flex items-center gap-2 bg-surface-card border border-white/5 px-3 py-1.5 rounded-full">
          <div className={`p-1 rounded-full ${profile.role === "doctor" ? "bg-yellow-400/10 text-yellow-400" : "bg-nebula/10 text-nebula"}`}>
            <User className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="text-xs font-semibold text-gray-200 block font-sans leading-tight">
              {profile.full_name}
            </span>
            <span className="text-[9px] text-gray-400 font-mono block leading-none uppercase">
              {profile.role === "doctor" ? "DOKTER SP.KJ" : profile.role === "developer" ? "SUPER ADMIN" : "PASIEN"}
            </span>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={onLogout}
          className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Sign Out"
          id="btn-logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
