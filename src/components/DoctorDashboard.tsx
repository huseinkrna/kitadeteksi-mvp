import React, { useState, useEffect } from "react";
import { 
  Search, AlertTriangle, Clock, MessageSquare, 
  ArrowRight, Heart, Calendar, HelpCircle, ShieldCheck, RefreshCw, User, Clipboard, CheckCircle2, FileText, Edit2, ShieldAlert
} from "lucide-react";
import { Profile, ConsultationTicket, PatientEnrichedProfile, ScreeningResult, Journal, Medication, parseRegimen } from "../types";
import TrendChart from "./TrendChart";

interface DoctorDashboardProps {
  profile: Profile;
  onViewTicket: (ticketId: string) => void;
  onProfileUpdate?: (updatedProfile: Profile) => void;
}

export default function DoctorDashboard({ profile, onViewTicket, onProfileUpdate }: DoctorDashboardProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"antrean" | "verifikasi" | "profil">("antrean");

  const [patients, setPatients] = useState<PatientEnrichedProfile[]>([]);
  const [tickets, setTickets] = useState<ConsultationTicket[]>([]);
  const [unverifiedPatients, setUnverifiedPatients] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertPatientCount, setAlertPatientCount] = useState(0);

  // Selected Patient Clinical details
  const [selectedPatient, setSelectedPatient] = useState<PatientEnrichedProfile | null>(null);
  const [selectedPatientScreenings, setSelectedPatientScreenings] = useState<ScreeningResult[]>([]);
  const [selectedPatientJournals, setSelectedPatientJournals] = useState<Journal[]>([]);
  const [loadingPatientDetail, setLoadingPatientDetail] = useState(false);

  // Medication regimen editing state
  const [isEditingRegimen, setIsEditingRegimen] = useState(false);
  const [regimenText, setRegimenText] = useState("");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [newObat, setNewObat] = useState("");
  const [newDosis, setNewDosis] = useState("");
  const [newWaktuPilihan, setNewWaktuPilihan] = useState("Pagi");
  const [newFrekuensi, setNewFrekuensi] = useState("1");
  const [newSatuan, setNewSatuan] = useState("Tablet");
  const [newStatus, setNewStatus] = useState("Aktif");

  // Doctor Profile editing state
  const [doctorName, setDoctorName] = useState(profile.full_name);
  const [doctorEmail, setDoctorEmail] = useState(profile.email);
  const [doctorPhone, setDoctorPhone] = useState(profile.phone_number);
  const [doctorBirthDate, setDoctorBirthDate] = useState(profile.birth_date || "");
  const [doctorPassword, setDoctorPassword] = useState("");
  const [doctorSpecialization, setDoctorSpecialization] = useState(profile.specialization || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // 15 seconds emergency countdown visual alert
  const [emergencyCountdown, setEmergencyCountdown] = useState<number | null>(null);
  const [countdownTicketId, setCountdownTicketId] = useState<string | null>(null);

  // Success messages alerts
  const [successMsg, setSuccessMsg] = useState("");

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      // Fetch paired patients
      const patientsRes = await fetch(`/api/doctor/patients?doctor_id=${profile.user_id}`);
      const patientsData = await patientsRes.json();
      const loadedPatients: PatientEnrichedProfile[] = patientsData.patients || [];
      setPatients(loadedPatients);

      // Fetch active tickets
      const ticketsRes = await fetch(`/api/tickets?doctor_id=${profile.user_id}`);
      const ticketsData = await ticketsRes.json();
      const activeTickets = ticketsData.tickets || [];
      setTickets(activeTickets);

      // Count critical escalated tickets instead of all high-risk patients
      const escalatedCount = activeTickets.filter((t: ConsultationTicket) => t.status === "escalated").length;
      setAlertPatientCount(escalatedCount);
    } catch (e) {
      console.error("Gagal memuat data dokter:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnverifiedPatients = async () => {
    try {
      const res = await fetch(`/api/doctor/unverified-patients?doctor_id=${profile.user_id}`);
      const data = await res.json();
      setUnverifiedPatients(data.patients || []);
    } catch (e) {
      console.error("Gagal memuat pasien belum diverifikasi:", e);
    }
  };

  useEffect(() => {
    fetchDoctorData();
    fetchUnverifiedPatients();
    // Simulate initial cron SLA check
    fetch("/api/cron/sla-check");
  }, [profile.user_id]);

  useEffect(() => {
    if (emergencyCountdown === null) return;
    if (emergencyCountdown === 0) {
      setEmergencyCountdown(null);
      setCountdownTicketId(null);
      setSuccessMsg("Status kritis/darurat pasien telah diredakan.");
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchDoctorData();
      return;
    }
    const interval = setInterval(() => {
      setEmergencyCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [emergencyCountdown]);

  const handleManualSlaCheck = async () => {
    try {
      const res = await fetch("/api/cron/sla-check");
      const data = await res.json();
      if (data.success) {
        fetchDoctorData();
        setSuccessMsg(`Audit SLA selesai. ${data.escalatedCount} tiket dinaikkan statusnya.`);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectPatient = async (p: PatientEnrichedProfile) => {
    setSelectedPatient(p);
    setRegimenText(p.regimen || "");
    setMedications(parseRegimen(p.regimen || ""));
    setIsEditingRegimen(false);
    try {
      setLoadingPatientDetail(true);
      const scrRes = await fetch(`/api/screenings?patient_id=${p.user_id}`);
      const scrData = await scrRes.json();
      setSelectedPatientScreenings(scrData.screenings || []);

      const jrnRes = await fetch(`/api/journals?patient_id=${p.user_id}`);
      const jrnData = await jrnRes.json();
      setSelectedPatientJournals(jrnData.journals || []);
    } catch (e) {
      console.error("Gagal memuat detail klinis pasien:", e);
    } finally {
      setLoadingPatientDetail(false);
    }
  };

  const handleVerifyPatient = async (patientId: string) => {
    try {
      const res = await fetch("/api/doctor/verify-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId, doctor_id: profile.user_id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memverifikasi");

      setSuccessMsg(`Pasien ${data.profile.full_name} berhasil diverifikasi!`);
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchUnverifiedPatients();
      fetchDoctorData();
    } catch (e: any) {
      alert(e.message || "Gagal memverifikasi pasien.");
    }
  };

  const handleUpdateRegimenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      const serialized = JSON.stringify(medications);
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedPatient.user_id,
          regimen: serialized
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg("Regimen medis resep pasien berhasil diperbarui!");
      setTimeout(() => setSuccessMsg(""), 4000);
      setIsEditingRegimen(false);
      fetchDoctorData();
      setSelectedPatient({
        ...selectedPatient,
        regimen: data.profile.regimen
      });
      setMedications(parseRegimen(data.profile.regimen));
    } catch (e: any) {
      alert(e.message || "Gagal memperbarui regimen");
    }
  };

  const handleDoctorProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
        const updates: any = {
          user_id: profile.user_id,
          full_name: doctorName,
          email: doctorEmail,
          phone_number: doctorPhone,
          birth_date: doctorBirthDate,
          specialization: doctorSpecialization
        };
        if (doctorPassword) {
          updates.password = doctorPassword;
        }

        const res = await fetch("/api/profile/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui");

      onProfileUpdate?.(data.profile);
      setSuccessMsg("Profil dokter Anda berhasil diperbarui!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e: any) {
      alert(e.message || "Gagal memperbarui profil dokter.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResolveEmergencyWithCountdown = (ticketId: string) => {
    fetch(`/api/tickets/${ticketId}/resolve-emergency`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctor_id: profile.user_id })
    })
    .then(res => res.json())
    .then(() => {
      fetchDoctorData(); // Panggil ulang untuk merefresh list tiket
    })
    .catch(e => {
      console.error("Gagal meredakan alarm kritis:", e);
    });
  };

  const handleExportPDF = (
    p: PatientEnrichedProfile, 
    scrs: ScreeningResult[], 
    jrns: Journal[]
  ) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Harap izinkan popup browser Anda untuk mengekspor Resume Medis.");
      return;
    }

    // Parse structured medications
    const parsedMeds = parseRegimen(p.regimen);
    const medTableHTML = parsedMeds.length === 0 
      ? '<p style="font-size: 12px; color: #64748b; font-style: italic;">Tidak ada regimen obat yang aktif terdaftar.</p>' 
      : `
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
              <th style="padding: 10px; font-weight: bold;">Nama Obat</th>
              <th style="padding: 10px; font-weight: bold;">Dosis</th>
              <th style="padding: 10px; font-weight: bold;">Waktu Minum</th>
              <th style="padding: 10px; font-weight: bold;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${parsedMeds.map(m => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; font-weight: bold; color: #1e293b;">${m.obat}</td>
                <td style="padding: 10px; color: #334155;">${m.dosis}</td>
                <td style="padding: 10px; color: #334155;">${m.waktu_minum}</td>
                <td style="padding: 10px;">
                  <span style="background: ${
                    m.status === "Aktif" ? "#dcfce7; color: #15803d;" :
                    m.status === "Selesai" ? "#f1f5f9; color: #475569;" :
                    "#fef3c7; color: #b45309;"
                  }; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase;">
                    ${m.status}
                  </span>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;

    // Generate SVG chart
    const sortedScrs = [...scrs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    let svgChartHTML = "";
    if (sortedScrs.length > 0) {
      const width = 600;
      const height = 180;
      const paddingLeft = 40;
      const paddingRight = 40;
      const paddingTop = 25;
      const paddingBottom = 35;
      
      const chartWidth = width - paddingLeft - paddingRight;
      const chartHeight = height - paddingTop - paddingBottom;
      
      let maxScore = 10;
      const dataPoints = sortedScrs.map((s) => {
        let score = 0;
        if (s.test_type === "dass21") {
          score = (s.raw_scores.dep || 0) + (s.raw_scores.anx || 0) + (s.raw_scores.str || 0);
        } else {
          score = s.raw_scores.total || 0;
        }
        if (score > maxScore) maxScore = score;
        return {
          date: new Date(s.created_at).toLocaleDateString("id-ID", { month: "short", day: "numeric" }),
          score,
          test_type: s.test_type.toUpperCase()
        };
      });
      
      maxScore = Math.ceil((maxScore + 2) / 5) * 5;
      
      const points = dataPoints.map((d, index) => {
        const x = paddingLeft + (dataPoints.length > 1 ? (index / (dataPoints.length - 1)) * chartWidth : chartWidth / 2);
        const y = paddingTop + chartHeight - (d.score / maxScore) * chartHeight;
        return { ...d, x, y };
      });
      
      let pathD = "";
      if (points.length > 1) {
        pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
      }
      
      const gridLines: string[] = [];
      const ticks = 4;
      for (let i = 0; i <= ticks; i++) {
        const val = (maxScore / ticks) * i;
        const y = paddingTop + chartHeight - (val / maxScore) * chartHeight;
        gridLines.push(`
          <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 4" />
          <text x="${paddingLeft - 8}" y="${y + 3}" font-family="sans-serif" font-size="9px" fill="#64748b" text-anchor="end">${val}</text>
        `);
      }
      
      const dotsAndLabels = points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#0284c7" stroke="#ffffff" stroke-width="1.5" />
        <text x="${p.x}" y="${p.y - 8}" font-family="sans-serif" font-size="9px" font-weight="bold" fill="#0f172a" text-anchor="middle">${p.score}</text>
        <text x="${p.x}" y="${paddingTop + chartHeight + 14}" font-family="sans-serif" font-size="8px" fill="#64748b" text-anchor="middle">${p.date}</text>
        <text x="${p.x}" y="${paddingTop + chartHeight + 23}" font-family="sans-serif" font-size="7px" font-weight="bold" fill="#0284c7" text-anchor="middle">${p.test_type}</text>
      `).join("");
      
      svgChartHTML = `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-top: 15px; margin-bottom: 25px;">
          <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #475569;">Grafik Tren Perkembangan Skor Penapisan Klinis</h3>
          <div style="width: 100%; max-width: 600px; margin: 0 auto;">
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
              <!-- Grid lines -->
              ${gridLines.join("")}
              <!-- Connection path -->
              ${points.length > 1 ? `<path d="${pathD}" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />` : ""}
              <!-- Dots and Labels -->
              ${dotsAndLabels}
            </svg>
          </div>
        </div>
      `;
    }

    const scrRows = scrs.map(s => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-family: monospace;">${new Date(s.created_at).toLocaleDateString("id-ID")}</td>
        <td style="padding: 10px; font-weight: bold; color: #1e293b;">${s.test_type.toUpperCase()}</td>
        <td style="padding: 10px;">${s.dominant_category}</td>
        <td style="padding: 10px;">
          ${s.is_critical 
            ? '<span style="background: #fee2e2; color: #ef4444; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">CRITICAL</span>' 
            : '<span style="background: #dcfce7; color: #22c55e; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">SAFE</span>'}
        </td>
        <td style="padding: 10px; font-family: monospace;">
          ${s.test_type === "dass21" 
            ? `Dep:${s.raw_scores.dep}, Anx:${s.raw_scores.anx}, Str:${s.raw_scores.str}`
            : `Total Score: ${s.raw_scores.total}`
          }
        </td>
      </tr>
    `).join("");

    const jrnRows = jrns.map(j => `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 6px;">
          <span>${new Date(j.created_at).toLocaleDateString("id-ID")}</span>
          <span style="font-weight: bold; color: #16a34a;">Skala Mood: ${j.mood_scale}/10</span>
        </div>
        <p style="margin: 0; font-size: 12px; font-style: italic; color: #334155;">"${j.content}"</p>
      </div>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Resume Medis Pasien - RUANGTARA</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; background-color: #ffffff; }
            .header { border-bottom: 3px double #cbd5e1; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
            .brand { font-size: 24px; font-weight: bold; color: #0284c7; letter-spacing: 1px; }
            .subtitle { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-top: 5px; }
            .section-title { font-size: 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 30px; margin-bottom: 15px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
            .bio-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px; }
            .bio-label { color: #64748b; font-weight: bold; }
            .med-pill { background: #fff1f2; border: 1px solid #fecdd3; padding: 12px; border-radius: 8px; font-size: 12px; color: #9f1239; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
            th { background: #f1f5f9; padding: 10px; font-weight: bold; text-align: left; border-bottom: 2px solid #cbd5e1; }
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
            .signature { margin-top: 40px; text-align: right; font-size: 12px; }
            @media print {
              body { padding: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="text-align: right; margin-bottom: 15px;">
            <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px;">Cetak Resume (Unduh PDF)</button>
          </div>

          <div class="header">
            <img src="/RUANGTARA.svg" style="height: 60px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;" alt="RUANGTARA Logo" />
            <div class="brand">RUMAH SAKIT MITRA RUANGTARA</div>
            <div class="subtitle">Democratizing Mental Healthcare Through AI Co-Pilot</div>
            <div style="font-size: 12px; margin-top: 10px; color: #334155; font-weight: 500;">LAPORAN RESUME RESMI PENUNJANG KLINIS</div>
          </div>

          <div class="bio-grid">
            <div><span class="bio-label">NAMA PASIEN:</span> ${p.full_name}</div>
            <div><span class="bio-label">ALAMAT EMAIL:</span> ${p.email}</div>
            <div><span class="bio-label">NOMOR TELEPON:</span> ${p.phone_number}</div>
            <div><span class="bio-label">DOKTER PENANGGUNG JAWAB:</span> ${profile.full_name}</div>
          </div>

          <div class="section-title">Aktivitas Regimen & Terapi Obat Saat Ini</div>
          ${medTableHTML}

          <!-- Dynamic SVG Trend Chart -->
          ${svgChartHTML}

          <div class="section-title">Riwayat Hasil Penapisan Klinis (DASS-21, PHQ-9, GAD-7)</div>
          ${scrs.length === 0 ? '<p style="font-size: 12px; color: #64748b; font-style: italic;">Belum ada riwayat pengisian penapisan.</p>' : `
            <table>
              <thead>
                <tr>
                  <th style="padding: 10px;">Tanggal Isi</th>
                  <th style="padding: 10px;">Jenis Penapisan</th>
                  <th style="padding: 10px;">Hasil / Kategori</th>
                  <th style="padding: 10px;">Status Risiko</th>
                  <th style="padding: 10px;">Skor Mentah</th>
                </tr>
              </thead>
              <tbody>
                ${scrRows}
              </tbody>
            </table>
          `}

          <div class="section-title">Catatan Log Jurnal Harian Pasien</div>
          ${jrns.length === 0 ? '<p style="font-size: 12px; color: #64748b; font-style: italic;">Belum ada tulisan jurnal harian.</p>' : `
            <div style="margin-top: 10px;">
              ${jrnRows}
            </div>
          `}

          <div class="signature">
            <p>Jakarta, ${new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <div style="margin-top: 50px; font-weight: bold; text-decoration: underline;">${profile.full_name}</div>
            <p style="font-size: 11px; color: #64748b; margin: 0;">Psikiater Spesialis Jiwa / Penanggung Jawab</p>
          </div>

          <div class="footer">
            <span>Dihasilkan secara otomatis oleh sistem RUANGTARA. Dokumen ini sah dan diakui secara klinis.</span>
            <span>Halaman 1 dari 1</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getSLATimeRemaining = (t: ConsultationTicket) => {
    const now = new Date();
    const deadline = new Date(t.sla_deadline || new Date(new Date(t.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString());
    const diffMs = deadline.getTime() - now.getTime();
    
    const isPast = diffMs < 0;
    const absMs = Math.abs(diffMs);
    const totalHours = Math.floor(absMs / (1000 * 60 * 60));
    const totalMins = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));

    const prefix = isPast ? "-" : "";
    const formatHours = totalHours.toString().padStart(2, "0");
    const formatMins = totalMins.toString().padStart(2, "0");

    return {
      text: `${prefix}${formatHours}:${formatMins} Jam`,
      isPast
    };
  };

  const filteredPatients = patients.filter((p) => 
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-70px)] bg-slate-50 text-slate-800 font-sans" id="doctor-dashboard">
      
      {/* LEFT PANEL: PATIENT ROSTER (Slate-900 Dark Roster Sidebar) */}
      <aside className="w-full md:w-80 bg-slate-900 text-slate-200 p-5 flex flex-col flex-shrink-0 space-y-6 border-r border-slate-800" id="doctor-roster-panel">
        
        {/* Search Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono block uppercase tracking-wider font-bold">DAFTAR ROSTER PASIEN</span>
            <button 
              onClick={fetchDoctorData}
              className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-nebula font-sans"
              id="search-patients-input"
            />
          </div>
        </div>

        {/* Patients Risk List with Interactive Click-selection */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* HIGH RISK */}
          <div className="space-y-2">
            <span className="text-[9px] text-red-400 font-mono uppercase tracking-wider font-extrabold block">RISIKO TINGGI (HIGH)</span>
            {filteredPatients.filter(p => p.riskLevel === "Tinggi").length === 0 ? (
              <p className="text-[10px] text-slate-500 italic font-sans pl-2">Tidak ada pasien risiko tinggi.</p>
            ) : (
              filteredPatients.filter(p => p.riskLevel === "Tinggi").map(p => (
                <div 
                  key={p.id} 
                  onClick={() => handleSelectPatient(p)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedPatient?.user_id === p.user_id 
                      ? "bg-red-950/40 border-red-500 shadow-md scale-[1.02]" 
                      : "bg-red-950/25 border-red-900/30 hover:border-red-500/40"
                  }`}
                >
                  <span className="text-xs font-bold text-slate-100 block">{p.full_name}</span>
                  <span className="text-[10px] font-mono text-red-300 block mt-1">
                    {p.latestScreening?.dominant_category || "Belum ada tes"}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* MEDIUM RISK */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-[9px] text-yellow-500 font-mono uppercase tracking-wider font-extrabold block">RISIKO SEDANG (MEDIUM)</span>
            {filteredPatients.filter(p => p.riskLevel === "Sedang").length === 0 ? (
              <p className="text-[10px] text-slate-500 italic font-sans pl-2">Tidak ada pasien risiko sedang.</p>
            ) : (
              filteredPatients.filter(p => p.riskLevel === "Sedang").map(p => (
                <div 
                  key={p.id} 
                  onClick={() => handleSelectPatient(p)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedPatient?.user_id === p.user_id 
                      ? "bg-yellow-950/40 border-yellow-500 shadow-md scale-[1.02]" 
                      : "bg-yellow-950/15 border-yellow-950/30 hover:border-yellow-500/40"
                  }`}
                >
                  <span className="text-xs font-bold text-slate-100 block">{p.full_name}</span>
                  <span className="text-[10px] font-mono text-yellow-300 block mt-1">
                    {p.latestScreening?.dominant_category || "Belum ada tes"}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* LOW RISK */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-[9px] text-green-400 font-mono uppercase tracking-wider font-extrabold block">RISIKO RENDAH (LOW)</span>
            {filteredPatients.filter(p => p.riskLevel === "Rendah").length === 0 ? (
              <p className="text-[10px] text-slate-500 italic font-sans pl-2">Tidak ada pasien risiko rendah.</p>
            ) : (
              filteredPatients.filter(p => p.riskLevel === "Rendah").map(p => (
                <div 
                  key={p.id} 
                  onClick={() => handleSelectPatient(p)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedPatient?.user_id === p.user_id 
                      ? "bg-green-950/40 border-green-500 shadow-md scale-[1.02]" 
                      : "bg-green-950/10 border-green-950/20 hover:border-green-500/40"
                  }`}
                >
                  <span className="text-xs font-bold text-slate-100 block">{p.full_name}</span>
                  <span className="text-[10px] font-mono text-green-300 block mt-1">
                    {p.latestScreening?.dominant_category || "Belum ada tes"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Diagnostic disclaimer */}
        <div className="pt-3 border-t border-slate-800 text-[9px] text-slate-400 font-sans leading-relaxed">
          <HelpCircle className="w-3.5 h-3.5 text-sky-400 inline mr-1" />
          <span>Skrining ini digunakan sebagai pendukung klinis. Diagnosa definitif wajib didasarkan pada wawancara klinis langsung oleh psikiater.</span>
        </div>
      </aside>

      {/* RIGHT PANEL: MAIN WORKSPACE (Slate-50 Clean High-Contrast Workspace) */}
      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto" id="doctor-queue-panel">
        
        {/* Workspace Tab Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Klinis Psikiater</h1>
            <p className="text-xs text-slate-500 font-medium">Mitra Pengawas: {profile.full_name} ({profile.specialization || "Spesialis Jiwa"})</p>
          </div>

          <div className="flex bg-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("antrean")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "antrean" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Antrean & Detail Pasien
            </button>
            <button
              onClick={() => {
                setActiveTab("verifikasi");
                fetchUnverifiedPatients();
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "verifikasi" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Verifikasi Pasien
              {unverifiedPatients.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("profil")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "profil" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Profil Saya
            </button>
          </div>
        </div>

        {/* Global Success / Action alerts */}
        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 15 SECONDS COUNTDOWN INTERVENTION ALARM BANNER (#9) */}
        {emergencyCountdown !== null && (
          <div className="p-4 bg-yellow-500/10 border-2 border-yellow-500 rounded-xl flex items-center justify-between shadow-md glow-yellow-sm">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-yellow-600 animate-bounce" />
              <div>
                <h4 className="text-sm font-bold text-yellow-800">Intervensi Klinis Dikirim!</h4>
                <p className="text-xs text-slate-600 font-sans mt-0.5">
                  Sistem sedang menerapkan aksi penanganan medis darurat. Alert Kritis pasien akan dinonaktifkan dalam <strong>{emergencyCountdown} detik</strong>...
                </p>
              </div>
            </div>
            <div className="text-2xl font-mono font-black text-yellow-700 px-4">
              {emergencyCountdown}s
            </div>
          </div>
        )}

        {/* Urgent Triage Notification Alert */}
        {alertPatientCount > 0 && emergencyCountdown === null && (
          <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 flex items-center justify-between shadow-sm animate-pulse" id="doctor-urgent-notification">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div>
                <h4 className="font-sans text-sm font-extrabold text-red-800">
                  ALERT: {alertPatientCount} PASIEN DALAM SITUASI DARURAT (Kritis)
                </h4>
                <p className="text-xs text-red-700 font-sans mt-0.5">
                  Pasien terindikasi memiliki tingkat kecemasan / depresi parah pada kuesioner terakhir. Harap segera berikan intervensi klinis di bawah.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Unverified SLA > 24H Alert */}
        {unverifiedPatients.some(p => p.created_at && Date.now() - new Date(p.created_at).getTime() > 24 * 60 * 60 * 1000) && (
          <div className="bg-amber-50 border-2 border-amber-500 rounded-xl p-4 flex items-center justify-between shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-500" />
              <div>
                <h4 className="font-sans text-sm font-extrabold text-amber-800">
                  PENGINGAT: ADA PASIEN BARU MENUNGGU VERIFIKASI &gt; 24 JAM
                </h4>
                <p className="text-xs text-amber-700 font-sans mt-0.5">
                  Harap segera verifikasi pasien baru di tab "Verifikasi Pasien". Jika dibiarkan lebih dari 72 jam, pasien akan otomatis dialihkan ke dokter lain.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: ANTREAN & DETAIL KLINIS */}
        {activeTab === "antrean" && (
          <div className="space-y-8">
            
            {/* Split Screen layout: Left is Table Queue, Right is Selected Patient Detail */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              
              {/* Queue Table (xl:col-span-7) */}
              <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6 xl:col-span-7">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Antrean Keluhan Pasien (SLA 24 Jam)</h2>
                    <p className="text-xs text-slate-500">Urut berdasarkan batas respons medis darurat terdekat.</p>
                  </div>
                  
                  <button
                    onClick={handleManualSlaCheck}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Audit SLA
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase font-mono tracking-wider font-bold">
                        <th className="py-3 px-2">ID</th>
                        <th className="py-3 px-2">Pasien</th>
                        <th className="py-3 px-2">Status</th>
                        <th className="py-3 px-2">Sisa SLA</th>
                        <th className="py-3 px-2 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 font-sans italic">
                            Belum ada antrean konsultasi masuk. Roster pasien Anda bersih.
                          </td>
                        </tr>
                      ) : (
                        tickets.map((t) => {
                          const sla = getSLATimeRemaining(t);
                          return (
                            <tr 
                              key={t.id} 
                              onClick={() => onViewTicket(t.id)}
                              className={`border-b border-slate-100 hover:bg-slate-50 transition-colors font-sans cursor-pointer ${
                                (t.status === "escalated" || t.status === "unassigned_emergency") ? "bg-red-50/50" : ""
                              }`}
                            >
                              <td className="py-4 px-2 font-mono font-bold text-sky-600">#{t.id}</td>
                              <td className="py-4 px-2">
                                <span className="font-bold text-slate-800 block">{t.patient_name}</span>
                                <span className="text-[10px] text-slate-500 block">{t.patient_email}</span>
                              </td>
                              <td className="py-4 px-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono tracking-wider ${
                                  (t.status === "escalated" || t.status === "unassigned_emergency")
                                    ? "bg-red-100 text-red-800 border border-red-200 animate-pulse"
                                    : "bg-amber-100 text-amber-800 border border-amber-200"
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-4 px-2">
                                <span className={`font-mono font-bold flex items-center gap-1 ${
                                  sla.isPast ? "text-red-500 animate-pulse" : "text-green-600"
                                }`}>
                                  <Clock className="w-3.5 h-3.5" />
                                  {sla.text}
                                </span>
                              </td>
                              <td className="py-4 px-2 text-right">
                                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  {(t.status === "escalated" || t.status === "unassigned_emergency") && (
                                    <button
                                      onClick={() => handleResolveEmergencyWithCountdown(t.id)}
                                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-full transition-all cursor-pointer"
                                      title="Redakan Situasi Darurat (15s reset)"
                                    >
                                      Tangani Darurat
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onViewTicket(t.id)}
                                    className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold rounded-full transition-all cursor-pointer"
                                  >
                                    Chat
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Patient Clinical Sheets (xl:col-span-5) */}
              <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm xl:col-span-5 space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Detail Klinis & Grafik Pasien</h2>
                  <p className="text-xs text-slate-500">Pilih pasien di roster kiri untuk meninjau dinamika mood.</p>
                </div>

                {selectedPatient ? (
                  <div className="space-y-6 font-sans">
                    
                    {/* Patient Biodata Card */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono block uppercase">Pasien Terpilih</span>
                          <h3 className="text-sm font-bold text-slate-800">{selectedPatient.full_name}</h3>
                          <span className="text-[10px] text-slate-500 font-mono block">{selectedPatient.email} | HP: {selectedPatient.phone_number}</span>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleExportPDF(selectedPatient, selectedPatientScreenings, selectedPatientJournals)}
                            className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                          >
                            <FileText className="w-3.5 h-3.5 text-sky-600" />
                            Resume PDF
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm("Apakah Anda yakin ingin menghapus pasien ini dari daftar Anda?")) return;
                              try {
                                const res = await fetch("/api/doctor/remove-patient", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ doctor_id: profile.user_id, patient_id: selectedPatient.user_id })
                                });
                                if (!res.ok) throw new Error("Gagal menghapus pasien");
                                setSuccessMsg("Pasien berhasil dihapus dari daftar Anda.");
                                setTimeout(() => setSuccessMsg(""), 4000);
                                setSelectedPatient(null);
                                fetchDoctorData();
                              } catch (e: any) {
                                alert(e.message);
                              }
                            }}
                            className="px-3 py-1 bg-white hover:bg-red-50 border border-red-200 text-red-600 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                          >
                            Hapus Pasien
                          </button>
                        </div>
                      </div>

                      {/* Pill: Active Medication Regimen Editor */}
                      <div className="pt-4 border-t border-slate-200">
                        <span className="text-[11px] text-slate-500 font-bold block uppercase tracking-wider mb-2">Terapi Regimen / Obat Pasien</span>
                        
                        {isEditingRegimen ? (
                          <div className="space-y-4 bg-slate-50 border border-slate-200 p-3.5 rounded-xl mt-1">
                            {/* List of current medications in edit mode */}
                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Daftar Obat Resep:</span>
                              {medications.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">Belum ada obat yang ditambahkan.</p>
                              ) : (
                                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold">
                                        <th className="p-2">Nama Obat</th>
                                        <th className="p-2">Dosis</th>
                                        <th className="p-2">Waktu</th>
                                        <th className="p-2">Status</th>
                                        <th className="p-2 text-right">Aksi</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {medications.map((med, index) => (
                                        <tr key={med.id || index} className="border-b border-slate-100 text-slate-700">
                                          <td className="p-2 font-medium">{med.obat}</td>
                                          <td className="p-2">{med.dosis}</td>
                                          <td className="p-2">{med.waktu_minum}</td>
                                          <td className="p-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                              med.status === "Aktif" ? "bg-green-100 text-green-700" :
                                              med.status === "Selesai" ? "bg-slate-100 text-slate-600" :
                                              "bg-amber-100 text-amber-700"
                                            }`}>
                                              {med.status}
                                            </span>
                                          </td>
                                          <td className="p-2 text-right">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setMedications(medications.filter(m => m.id !== med.id));
                                              }}
                                              className="text-[10px] text-red-600 hover:underline cursor-pointer font-semibold"
                                            >
                                              Hapus
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* Form to add a new medication */}
                            <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-3">
                              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block">Tambah Obat Baru</span>
                              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Nama Obat</label>
                                  <input
                                    type="text"
                                    value={newObat}
                                    onChange={(e) => setNewObat(e.target.value)}
                                    placeholder="Sertraline / Fluoxetine"
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-sky-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Dosis (mg/ml)</label>
                                  <input
                                    type="text"
                                    value={newDosis}
                                    onChange={(e) => setNewDosis(e.target.value)}
                                    placeholder="Misal: 50mg"
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-sky-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Waktu Minum</label>
                                  <select
                                    value={newWaktuPilihan}
                                    onChange={(e) => setNewWaktuPilihan(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-sky-500"
                                  >
                                    <option value="Pagi">Pagi</option>
                                    <option value="Siang">Siang</option>
                                    <option value="Sore">Sore</option>
                                    <option value="Malam">Malam</option>
                                  </select>
                                </div>
                                <div className="col-span-2 lg:col-span-1">
                                  <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Frekuensi & Jumlah</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      min="1"
                                      value={newFrekuensi}
                                      onChange={(e) => setNewFrekuensi(e.target.value)}
                                      className="w-1/3 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-sky-500"
                                      title="Kali sehari"
                                    />
                                    <span className="text-xs flex items-center text-slate-500">x</span>
                                    <select
                                      value={newSatuan}
                                      onChange={(e) => setNewSatuan(e.target.value)}
                                      className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-sky-500"
                                    >
                                      <option value="Tablet">Tablet</option>
                                      <option value="Kapsul">Kapsul</option>
                                      <option value="Sendok Takar">Sendok Takar</option>
                                      <option value="Tetes">Tetes</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="col-span-2 lg:col-span-1">
                                  <label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Status</label>
                                  <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-sky-500"
                                  >
                                    <option value="Aktif">Aktif</option>
                                    <option value="Selesai">Selesai</option>
                                    <option value="Diberhentikan">Diberhentikan</option>
                                  </select>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!newObat) {
                                    alert("Nama obat wajib diisi!");
                                    return;
                                  }
                                  const computedWaktu = `${newFrekuensi}x sehari, ${newSatuan}, ${newWaktuPilihan}`;
                                  const med: Medication = {
                                    id: `med-${Date.now()}`,
                                    obat: newObat,
                                    dosis: newDosis || "-",
                                    waktu_minum: computedWaktu,
                                    status: newStatus
                                  };
                                  setMedications([...medications, med]);
                                  setNewObat("");
                                  setNewDosis("");
                                  setNewWaktuPilihan("Pagi");
                                  setNewFrekuensi("1");
                                  setNewSatuan("Tablet");
                                  setNewStatus("Aktif");
                                }}
                                className="w-full py-1.5 mt-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-[10px] font-bold rounded cursor-pointer transition-all"
                              >
                                + Tambahkan Obat ke Resep
                              </button>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleUpdateRegimenSubmit}
                                className="px-4 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-700 transition-all cursor-pointer shadow"
                              >
                                Simpan Resep
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingRegimen(false);
                                  setMedications(parseRegimen(selectedPatient.regimen || ""));
                                }}
                                className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-all cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 mt-1">
                            {/* Read-only view list of medications */}
                            {parseRegimen(selectedPatient.regimen).length === 0 ? (
                              <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl gap-2">
                                <span className="text-xs text-slate-500 italic block leading-relaxed">
                                  Belum ada regimen obat terdaftar untuk pasien ini.
                                </span>
                                <button
                                  onClick={() => {
                                    setMedications(parseRegimen(selectedPatient.regimen || ""));
                                    setIsEditingRegimen(true);
                                  }}
                                  className="text-xs text-sky-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer flex-shrink-0"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Tambah
                                </button>
                              </div>
                            ) : (
                              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                                      <th className="p-2.5">Obat</th>
                                      <th className="p-2.5">Dosis</th>
                                      <th className="p-2.5">Waktu Minum</th>
                                      <th className="p-2.5">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {parseRegimen(selectedPatient.regimen).map((med, index) => (
                                      <tr key={med.id || index} className="border-b border-slate-100 last:border-0 text-slate-700 hover:bg-slate-50">
                                        <td className="p-2.5 font-medium text-slate-900">{med.obat}</td>
                                        <td className="p-2.5 text-slate-600">{med.dosis}</td>
                                        <td className="p-2.5 text-slate-600">{med.waktu_minum}</td>
                                        <td className="p-2.5">
                                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                            med.status === "Aktif" ? "bg-green-100 text-green-700" :
                                            med.status === "Selesai" ? "bg-slate-100 text-slate-600" :
                                            "bg-amber-100 text-amber-700"
                                          }`}>
                                            {med.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                <div className="bg-slate-50 px-3 py-2 border-t border-slate-100 flex justify-end">
                                  <button
                                    onClick={() => {
                                      setMedications(parseRegimen(selectedPatient.regimen || ""));
                                      setIsEditingRegimen(true);
                                    }}
                                    className="text-[11px] text-sky-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    Ubah Resep / Regimen Obat
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Patient Dynamic Mood/Screening Chart (#6) */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Grafik Dinamika Mood & Skor Penapisan</span>
                      {loadingPatientDetail ? (
                        <div className="h-64 flex items-center justify-center text-xs text-slate-500 font-mono">
                          Memuat grafik klinis...
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                          <TrendChart screenings={selectedPatientScreenings} journals={selectedPatientJournals} />
                        </div>
                      )}
                    </div>

                    {/* Recent Screenings Logs */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Histori Penapisan Terakhir</span>
                      <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                        {selectedPatientScreenings.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Belum ada riwayat penapisan.</p>
                        ) : (
                          selectedPatientScreenings.map((s) => (
                            <div key={s.id} className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs">
                              <div>
                                <span className="font-extrabold text-slate-700 block uppercase font-mono">{s.test_type}</span>
                                <span className="text-[10px] text-slate-500 block">{new Date(s.created_at).toLocaleDateString("id-ID")}</span>
                              </div>
                              <span className="font-semibold text-slate-800">{s.dominant_category}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-20 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-slate-400 text-xs">
                    Silakan klik salah satu nama pasien pada roster sebelah kiri untuk membuka lembar rekam klinis, 
                    mengubah regimen obat, melihat grafik perkembangan, dan mengunduh Resume Medis PDF.
                  </div>
                )}
              </section>

            </div>

          </div>
        )}

        {/* TAB 2: VERIFIKASI PENDAFTARAN PASIEN BARU */}
        {activeTab === "verifikasi" && (
          <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6 max-w-4xl mx-auto">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Antrean Verifikasi Registrasi Pasien</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifikasi pendaftaran akun pasien baru untuk menjamin legalitas asinkronous medis.
              </p>
            </div>

            <div className="space-y-4">
              {unverifiedPatients.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200 border-dashed text-slate-400 text-xs font-sans">
                  Tidak ada pendaftaran akun pasien baru yang menunggu verifikasi. Roster bersih!
                </div>
              ) : (
                unverifiedPatients.map((p) => (
                  <div key={p.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-800">{p.full_name}</h4>
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[9px] font-bold uppercase font-mono">BUTUH VERIFIKASI</span>
                      </div>
                      <p className="text-xs text-slate-500">{p.email} | HP: {p.phone_number}</p>
                      <span className="text-[10px] text-slate-400 font-mono block">Terdaftar pada: {new Date(p.created_at).toLocaleDateString("id-ID")}</span>
                    </div>

                    <button
                      onClick={() => handleVerifyPatient(p.user_id)}
                      className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-full transition-all cursor-pointer shadow-sm flex items-center gap-1"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Setujui & Verifikasi Akun
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* TAB 3: PROFIL DOKTER */}
        {activeTab === "profil" && (
          <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm max-w-lg mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Edit Profil Psikiater</h2>
              <p className="text-xs text-slate-500 mt-0.5">Kelola identitas formal rekam medis dan spesialisasi klinis Anda.</p>
            </div>

            <form onSubmit={handleDoctorProfileUpdate} className="space-y-4 font-sans text-xs">
              
              {/* Name */}
              <div>
                <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Nama Lengkap Dokter & Gelar</label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-sky-500 font-sans text-xs"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Alamat Email Resmi</label>
                <input
                  type="email"
                  value={doctorEmail}
                  onChange={(e) => setDoctorEmail(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-sky-500 font-sans text-xs"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Nomor HP / WhatsApp Aktif</label>
                <input
                  type="text"
                  value={doctorPhone}
                  onChange={(e) => setDoctorPhone(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-sky-500 font-sans text-xs"
                  required
                />
              </div>

              {/* Tanggal Lahir */}
              <div>
                <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Tanggal Lahir</label>
                <input
                  type="date"
                  value={doctorBirthDate}
                  onChange={(e) => setDoctorBirthDate(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-sky-500 font-sans text-xs"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Ganti Sandi (Kosongkan jika tidak diubah)</label>
                <input
                  type="password"
                  value={doctorPassword}
                  onChange={(e) => setDoctorPassword(e.target.value)}
                  placeholder="Masukkan sandi baru"
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-sky-500 font-sans text-xs"
                />
              </div>

              {/* Specialization */}
              <div>
                <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Spesialisasi Klinis / Jiwa</label>
                <input
                  type="text"
                  value={doctorSpecialization}
                  onChange={(e) => setDoctorSpecialization(e.target.value)}
                  placeholder="Contoh: Psikiatri Adiksi, Psikiatri Forensik, Spesialis Jiwa Anak"
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-sky-500 font-sans text-xs"
                  required
                />
              </div>

              {/* Pairing code display */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">KODE PAIRING UNIK PASIEN</span>
                <span className="text-xl font-mono font-black text-slate-900 tracking-widest block mt-1">
                  {profile.pairing_code || "BELUM DISET"}
                </span>
                <span className="text-[9px] text-slate-500 font-sans block mt-1">Bagikan kode ini kepada pasien baru Anda agar terhubung secara klinis.</span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-full transition-all cursor-pointer shadow-sm"
                >
                  {savingProfile ? "Menyimpan..." : "Simpan Perubahan Profil Psikiater"}
                </button>
              </div>

            </form>
          </section>
        )}

      </main>

    </div>
  );
}
