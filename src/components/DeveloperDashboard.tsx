import React, { useState, useEffect } from "react";
import { Profile } from "../types";
import { Database, Users, FileText, Activity, ShieldAlert, RefreshCw } from "lucide-react";

interface DeveloperDashboardProps {
  profile: Profile;
}

export default function DeveloperDashboard({ profile }: DeveloperDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/all-data");
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error("Gagal mengambil data admin", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  if (!data) return <div className="p-8 text-center text-white">Loading data...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center border-b border-slate-700 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Database className="w-8 h-8 text-nebula" />
              Developer Super Admin
            </h1>
            <p className="text-slate-400 mt-1">Sistem Pemantauan Global KITADETEKSI</p>
          </div>
          <button 
            onClick={fetchAllData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Profil</p>
                <h3 className="text-3xl font-bold text-white mt-2">{data.profiles?.length || 0}</h3>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Penapisan</p>
                <h3 className="text-3xl font-bold text-white mt-2">{data.screening_results?.length || 0}</h3>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Jurnal Harian</p>
                <h3 className="text-3xl font-bold text-white mt-2">{data.journals?.length || 0}</h3>
              </div>
              <FileText className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tiket Konsultasi</p>
                <h3 className="text-3xl font-bold text-white mt-2">{data.consultation_tickets?.length || 0}</h3>
              </div>
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* VERIFICATION SECTION */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
          <div className="bg-slate-950 p-4 border-b border-slate-700">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest font-mono">Verifikasi Profil (Dokter & Pasien)</h2>
          </div>
          <div className="p-4 bg-slate-900 overflow-x-auto max-h-[400px] overflow-y-auto">
            {data.profiles?.filter((p: Profile) => !p.is_verified).length === 0 ? (
              <p className="text-sm text-slate-400">Tidak ada profil yang menunggu verifikasi.</p>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-800 border-b border-slate-700 text-slate-400">
                    <th className="p-3">Nama</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.profiles?.filter((p: Profile) => !p.is_verified).map((p: Profile) => (
                    <tr key={p.user_id} className="border-b border-slate-800/50">
                      <td className="p-3 font-semibold">{p.full_name}</td>
                      <td className="p-3 uppercase text-xs">{p.role}</td>
                      <td className="p-3">{p.email}</td>
                      <td className="p-3">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/admin/verify-profile", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ profile_id: p.user_id, admin_id: profile.user_id })
                              });
                              if (res.ok) {
                                alert("Profil berhasil diverifikasi!");
                                fetchAllData();
                              } else {
                                alert("Gagal verifikasi profil.");
                              }
                            } catch (e) {
                              alert("Terjadi kesalahan sistem.");
                            }
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded cursor-pointer transition-all"
                        >
                          Verifikasi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ACCOUNT LIST SECTION */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
          <div className="bg-slate-950 p-4 border-b border-slate-700">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest font-mono">Daftar Akun Pengguna</h2>
          </div>
          <div className="p-4 bg-slate-900 overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700 text-slate-400">
                  <th className="p-3">Nama</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Email (Akun)</th>
                  <th className="p-3">Sandi</th>
                  <th className="p-3">Tanggal Lahir</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.profiles?.map((p: Profile) => (
                  <tr key={p.user_id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="p-3 font-semibold text-slate-200">{p.full_name}</td>
                    <td className="p-3 uppercase text-xs text-slate-400">{p.role}</td>
                    <td className="p-3 text-nebula">{p.email}</td>
                    <td className="p-3 text-red-300 font-mono text-xs">{p.password || "N/A"}</td>
                    <td className="p-3 text-slate-400">{p.birth_date || "Tidak diisi"}</td>
                    <td className="p-3">
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Yakin ingin menghapus akun ${p.full_name}?`)) return;
                          try {
                            const res = await fetch("/api/admin/delete-profile", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ target_user_id: p.user_id })
                            });
                            if (res.ok) {
                              alert("Akun berhasil dihapus!");
                              fetchAllData();
                            } else {
                              alert("Gagal menghapus akun.");
                            }
                          } catch (e) {
                            alert("Terjadi kesalahan sistem.");
                          }
                        }}
                        className="px-3 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/30 hover:border-red-600 text-[10px] font-bold rounded cursor-pointer transition-all uppercase tracking-wider"
                      >
                        Hapus Akun
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RAW DATA VIEWER */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
          <div className="bg-slate-950 p-4 border-b border-slate-700">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest font-mono">Database Dump Viewer</h2>
          </div>
          <div className="p-4 bg-slate-900 overflow-x-auto max-h-[600px] overflow-y-auto">
            <pre className="text-[11px] font-mono text-green-400">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}
