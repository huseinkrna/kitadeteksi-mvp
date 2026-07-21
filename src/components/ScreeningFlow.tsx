import { useState } from "react";
import { ClipboardList, ArrowLeft, ArrowRight, ShieldCheck, HelpCircle, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DASS21_QUESTIONS, DASS21_OPTIONS, PHQ9_QUESTIONS, PHQ9_OPTIONS, GAD7_QUESTIONS, GAD7_OPTIONS } from "../lib/clinical-algorithms/questions";
import { Profile, ScreeningResult } from "../types";

interface ScreeningFlowProps {
  profile: Profile;
  onFinish: () => void;
  onRedAlert: () => void;
}

export default function ScreeningFlow({ profile, onFinish, onRedAlert }: ScreeningFlowProps) {
  const [currentModule, setCurrentModule] = useState<"dass21" | "phq9" | "gad7">("dass21");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [screeningError, setScreeningError] = useState("");
  const [finalResult, setFinalResult] = useState<ScreeningResult | null>(null);

  const getQuestionsList = () => {
    if (currentModule === "dass21") return DASS21_QUESTIONS;
    if (currentModule === "phq9") return PHQ9_QUESTIONS;
    return GAD7_QUESTIONS;
  };

  const getOptionsList = () => {
    if (currentModule === "dass21") return DASS21_OPTIONS;
    if (currentModule === "phq9") return PHQ9_OPTIONS;
    return GAD7_OPTIONS;
  };

  const questions = getQuestionsList();
  const options = getOptionsList();
  const currentQuestion = questions[currentIdx];

  const handleSelectOption = (val: number) => {
    const updated = [...answers];
    updated[currentIdx] = val;
    setAnswers(updated);

    // Auto advance or submit after 250ms for smooth user experience
    setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx((prev) => prev + 1);
      } else {
        handleSubmitModule(updated);
      }
    }, 250);
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (answers[currentIdx] !== undefined && currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handleSubmitModule = async (overrideAnswers?: any) => {
    const finalAnswers = Array.isArray(overrideAnswers) ? overrideAnswers : answers;
    
    if (finalAnswers.length < questions.length || finalAnswers.some((a) => a === undefined)) {
      setScreeningError("Silakan jawab semua pertanyaan terlebih dahulu");
      return;
    }

    try {
      setLoading(true);
      setScreeningError("");

      const res = await fetch("/api/screenings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: profile.user_id,
          test_type: currentModule,
          answers: finalAnswers
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan hasil penapisan");
      }

      if (currentModule === "dass21") {
        const nextPath = data.nextStep; // "LANJUT_PHQ9" | "LANJUT_GAD7" | "SELESAI_NORMAL" | "SELESAI_WITH_WARNING"
        if (nextPath === "LANJUT_PHQ9") {
          setCurrentModule("phq9");
          setCurrentIdx(0);
          setAnswers([]);
        } else if (nextPath === "LANJUT_GAD7") {
          setCurrentModule("gad7");
          setCurrentIdx(0);
          setAnswers([]);
        } else {
          setFinalResult(data.result);
        }
      } else if (currentModule === "phq9") {
        if (data.is_critical) {
          onRedAlert(); // Blocks UI immediately
        } else {
          setFinalResult(data.result);
        }
      } else {
        setFinalResult(data.result);
      }
    } catch (e: any) {
      setScreeningError(e.message || "Gagal mengirim data penapisan");
    } finally {
      setLoading(false);
    }
  };

  if (finalResult) {
    return (
      <div className="max-w-md mx-auto p-4 py-4 md:py-8 font-sans min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="bg-surface-card border border-white/10 rounded-3xl overflow-hidden shadow-2xl glow-nebula-sm flex flex-col w-full p-6 md:p-8 text-center items-center">
          <ShieldCheck className="w-16 h-16 text-green-500 mb-6" />
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Penapisan Selesai</h2>
          <p className="text-gray-400 mb-8 max-w-md text-sm leading-relaxed">
            Terima kasih telah mengisi penapisan klinis. Hasil ini membantu dokter dalam mengevaluasi dinamika kesehatan Anda.
          </p>
          
          <div className="bg-surface-sunken border border-white/5 w-full p-6 rounded-xl text-left mb-8 space-y-4">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Interpretasi Kondisi</span>
              <span className="text-lg font-bold text-nebula">{finalResult.dominant_category}</span>
            </div>
            <div className="pt-4 border-t border-white/5">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block mb-2">Detail Skor Anda</span>
              <div className="flex flex-wrap gap-3">
                {finalResult.test_type === "dass21" ? (
                  <>
                    <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10"><span className="text-xs text-gray-400">Depresi:</span> <span className="font-bold text-gray-200 ml-1">{finalResult.raw_scores.dep}</span></div>
                    <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10"><span className="text-xs text-gray-400">Cemas:</span> <span className="font-bold text-gray-200 ml-1">{finalResult.raw_scores.anx}</span></div>
                    <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10"><span className="text-xs text-gray-400">Stres:</span> <span className="font-bold text-gray-200 ml-1">{finalResult.raw_scores.str}</span></div>
                  </>
                ) : (
                  <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10"><span className="text-xs text-gray-400">Total Skor:</span> <span className="font-bold text-gray-200 ml-1">{finalResult.raw_scores.total}</span></div>
                )}
              </div>
            </div>
          </div>
          
          {(!finalResult.dominant_category?.toLowerCase().includes("parah") && !finalResult.dominant_category?.toLowerCase().includes("berat") && !finalResult.dominant_category?.toLowerCase().includes("sangat")) && (
            <div className="bg-green-500/10 border border-green-500/20 w-full p-6 rounded-xl text-left mb-8 space-y-3">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <Heart className="w-5 h-5" />
                <span className="font-bold text-sm">Tips Relaksasi: Teknik Pernapasan 4-7-8</span>
              </div>
              <p className="text-sm text-gray-300">
                Teknik pernapasan ini sangat membantu untuk menenangkan pikiran dan meredakan ketegangan ringan. Lakukan langkah berikut:
              </p>
              <ul className="text-sm text-gray-400 list-disc pl-5 space-y-1">
                <li>Tarik napas dalam melalui hidung selama <strong className="text-gray-200">4 detik</strong>.</li>
                <li>Tahan napas Anda selama <strong className="text-gray-200">7 detik</strong>.</li>
                <li>Hembuskan napas perlahan melalui mulut selama <strong className="text-gray-200">8 detik</strong>.</li>
                <li>Ulangi siklus ini hingga 4 kali.</li>
              </ul>
            </div>
          )}

          <button
            onClick={onFinish}
            className="px-8 py-3 bg-nebula text-deepspace font-bold rounded-full hover:bg-opacity-80 transition-all glow-nebula-sm flex items-center gap-2 cursor-pointer"
          >
            Tutup & Kembali ke Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIdx + 1) / questions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto p-4 py-4 md:py-8 font-sans h-[calc(100vh-80px)] flex flex-col">
      <div className="bg-surface-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl glow-nebula-sm flex flex-col flex-1">
        
        {/* Module Header */}
        <div className="bg-surface-sunken px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-nebula">
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs font-semibold font-mono tracking-wider uppercase">
              {currentModule === "dass21" 
                ? "Universal Baseline (DASS-21)" 
                : currentModule === "phq9" 
                  ? "Modul Depresi Lanjutan (PHQ-9)" 
                  : "Modul Kecemasan Lanjutan (GAD-7)"
              }
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-400 font-mono hidden sm:block">
              Pertanyaan {currentIdx + 1} dari {questions.length}
            </div>
            <button 
              onClick={onFinish}
              className="text-xs text-red-400 font-bold hover:text-red-300 transition-colors cursor-pointer border border-red-500/30 px-3 py-1.5 rounded-full"
            >
              Batal Tes
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-deepspace h-1.5">
          <div 
            className="bg-nebula h-1.5 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="p-6 md:p-8 flex flex-col flex-1 overflow-hidden">
          {screeningError && (
            <div className="p-3 bg-red-500/20 text-red-200 border border-red-500/30 text-xs rounded-xl mb-6 flex-shrink-0">
              {screeningError}
            </div>
          )}

          {/* Question Text */}
          <div className="mb-6 flex flex-col justify-center flex-1">
            {currentQuestion?.domain && (
              <span className="text-[10px] font-mono bg-deepspace text-nebula px-2.5 py-1 rounded-full w-fit mb-3 uppercase font-bold tracking-wider">
                DOMAIN: {currentQuestion.domain === "D" ? "Depresi" : currentQuestion.domain === "A" ? "Kecemasan" : "Stres"}
              </span>
            )}
            <h2 className="text-xl md:text-2xl font-bold text-gray-100 font-sans leading-snug">
              {currentQuestion?.text}
            </h2>
          </div>

          {/* Options (Radio buttons) */}
          <div className="space-y-3 flex-shrink-0 w-full" id="screening-options">
            {options.map((opt) => {
              const isSelected = answers[currentIdx] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectOption(opt.value)}
                  className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? "bg-nebula/10 text-gray-100 border-nebula shadow-md glow-nebula-sm"
                      : "bg-surface-sunken text-gray-400 border-white/5 hover:border-white/20 hover:text-gray-200"
                  }`}
                >
                  <span className="font-sans font-medium">{opt.label}</span>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    isSelected ? "border-nebula" : "border-gray-600 group-hover:border-gray-400"
                  }`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-nebula" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/5 flex-shrink-0">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className={`flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-full border transition-colors cursor-pointer ${
                currentIdx === 0
                  ? "border-transparent text-gray-600 cursor-not-allowed"
                  : "border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              id="btn-prev-question"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>

            {currentIdx === questions.length - 1 ? (
              <button
                onClick={handleSubmitModule}
                disabled={loading || answers[currentIdx] === undefined}
                className={`flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-full cursor-pointer transition-all ${
                  answers[currentIdx] === undefined
                    ? "bg-gray-700/50 text-gray-500 border border-gray-600/30 cursor-not-allowed"
                    : "bg-star text-deepspace hover:bg-yellow-300 glow-star-sm"
                }`}
                id="btn-submit-screening"
              >
                {loading ? "Mengolah..." : "Selesaikan Modul"}
                <ShieldCheck className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={answers[currentIdx] === undefined}
                className={`flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-full border transition-colors cursor-pointer ${
                  answers[currentIdx] === undefined
                    ? "border-transparent text-gray-600 cursor-not-allowed"
                    : "border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                }`}
                id="btn-next-question"
              >
                Lanjut
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Privacy statement */}
          <div className="flex items-center gap-2 justify-center mt-6 text-[11px] text-gray-500 font-sans flex-shrink-0">
            <HelpCircle className="w-3.5 h-3.5 text-nebula" />
            <span>Semua data penapisan dilindungi oleh enkripsi medis RLS.</span>
          </div>

        </div>
      </div>
    </div>
  );
}
