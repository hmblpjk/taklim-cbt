"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CandidateIdentity, SubmissionPayload } from "@/lib/constants";
import { shuffleQuestionsForNim, RandomizedQuestion } from "@/lib/randomizer";
import {
  Clock,
  CheckCircle2,
  Send,
  Flag,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  User,
  LogOut,
  Sparkles,
} from "lucide-react";

export default function ExamPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState<CandidateIdentity | null>(null);
  const [questions, setQuestions] = useState<RandomizedQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Answers stored as mapping: question.originalId -> selected originalKey ("A" | "B" | "C" | "D")
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes default
  const [tabSwitches, setTabSwitches] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const endTimeRef = useRef<number>(Date.now() + 3600 * 1000);

  // 1. Initialize Session, Verify Token & Load Questions
  useEffect(() => {
    const sessionStr = sessionStorage.getItem("cbt_user");
    if (!sessionStr) {
      router.push("/");
      return;
    }

    try {
      const user: CandidateIdentity = JSON.parse(sessionStr);
      setIdentity(user);
      const catKey = user.kategori || "afkar";

      // Verify token again before allowing question load
      fetch("/api/exam/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nim: user.nim, token: user.token }),
      })
        .then((res) => res.json())
        .then((vData) => {
          if (!vData.success) {
            sessionStorage.removeItem("cbt_user");
            router.push("/");
            return;
          }

          // Persistent Timer Setup per category
          const savedStartTime = localStorage.getItem(`cbt_start_time_${user.nim}_${catKey}`);
          const savedEndTime = localStorage.getItem(`cbt_end_time_${user.nim}_${catKey}`);
          const now = Date.now();

          if (savedStartTime && savedEndTime) {
            startTimeRef.current = parseInt(savedStartTime, 10);
            endTimeRef.current = parseInt(savedEndTime, 10);
          } else {
            startTimeRef.current = now;
            endTimeRef.current = now + 3600 * 1000; // 60 minutes
            localStorage.setItem(`cbt_start_time_${user.nim}_${catKey}`, startTimeRef.current.toString());
            localStorage.setItem(`cbt_end_time_${user.nim}_${catKey}`, endTimeRef.current.toString());
          }

          const remainingSeconds = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
          setTimeLeft(remainingSeconds);

          // Restore local answers if exists
          const savedAnswers = localStorage.getItem(`cbt_answers_${user.nim}_${catKey}`);
          if (savedAnswers) setAnswers(JSON.parse(savedAnswers));

          const savedFlags = localStorage.getItem(`cbt_flags_${user.nim}_${catKey}`);
          if (savedFlags) setFlagged(JSON.parse(savedFlags));

          // Fetch public questions
          return fetch("/api/exam/questions");
        })
        .then((res) => (res ? res.json() : null))
        .then((data) => {
          if (data && data.success && data.questions) {
            const randomized = shuffleQuestionsForNim(data.questions, `${user.nim}_${catKey}`);
            setQuestions(randomized);
          }
        })
        .catch((err) => {
          console.error("Gagal memuat ujian:", err);
          router.push("/");
        })
        .finally(() => setLoading(false));
    } catch (e) {
      router.push("/");
    }
  }, [router]);

  // 2. Persistent Timer Countdown
  useEffect(() => {
    if (isSubmitted || loading) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        triggerSubmit(true); // Auto-submit when time expires
      }
    };

    updateTimer(); // Initial check
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted, loading]);

  // 3. Silent Tab Switch Detection (Anti-Cheat for Admin Dashboard)
  useEffect(() => {
    if (isSubmitted || loading) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
      }
    };

    const handleBlur = () => {
      setTabSwitches((prev) => prev + 1);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isSubmitted, loading]);

  // 4. Save Answer Per Click
  const handleSelectOption = (questionId: number, originalKey: "A" | "B" | "C" | "D") => {
    if (!identity) return;
    const catKey = identity.kategori || "afkar";
    const newAnswers = { ...answers, [questionId]: originalKey };
    setAnswers(newAnswers);
    localStorage.setItem(`cbt_answers_${identity.nim}_${catKey}`, JSON.stringify(newAnswers));
  };

  const toggleFlag = (questionId: number) => {
    if (!identity) return;
    const catKey = identity.kategori || "afkar";
    const newFlags = { ...flagged, [questionId]: !flagged[questionId] };
    setFlagged(newFlags);
    localStorage.setItem(`cbt_flags_${identity.nim}_${catKey}`, JSON.stringify(newFlags));
  };

  // 5. Submit Action with Random Jitter (0 - 3000 ms)
  const triggerSubmit = async (autoSubmit = false) => {
    if (!identity || isSubmitting) return;
    const catKey = identity.kategori || "afkar";

    setIsSubmitting(true);
    setSubmitError("");

    // Anti-spike client-side jitter delay
    const jitterMs = Math.floor(Math.random() * 2500) + 500;
    await new Promise((resolve) => setTimeout(resolve, jitterMs));

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    const payload: SubmissionPayload = {
      nama: identity.nama,
      nim: identity.nim,
      mabna: identity.mabna,
      token: identity.token,
      kategori: catKey,
      kategoriName: identity.kategoriName || "Taklim CBT",
      answers: Object.fromEntries(
        Object.entries(answers).map(([k, v]) => [k, v])
      ),
      tabSwitches,
      durationSeconds,
      submittedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsSubmitted(true);
        setShowConfirmModal(false);
        // Clear local storage progress upon success
        localStorage.removeItem(`cbt_answers_${identity.nim}_${catKey}`);
        localStorage.removeItem(`cbt_flags_${identity.nim}_${catKey}`);
        localStorage.removeItem(`cbt_start_time_${identity.nim}_${catKey}`);
        localStorage.removeItem(`cbt_end_time_${identity.nim}_${catKey}`);
      } else {
        if (data.alreadySubmitted) {
          setIsSubmitted(true);
          setShowConfirmModal(false);
          localStorage.removeItem(`cbt_answers_${identity.nim}_${catKey}`);
          localStorage.removeItem(`cbt_flags_${identity.nim}_${catKey}`);
          localStorage.removeItem(`cbt_start_time_${identity.nim}_${catKey}`);
          localStorage.removeItem(`cbt_end_time_${identity.nim}_${catKey}`);
        } else {
          setSubmitError(data.message || "Gagal mengumpulkan jawaban. Memencet ulang...");
        }
      }
    } catch (err: any) {
      setSubmitError("Koneksi terganggu. Sistem akan mencoba kembali...");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format Timer mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d16] text-white">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-400">Memuat paket soal & mengacak berdasarkan NIM...</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#090d16]">
        <div className="luxe-card max-w-md w-full rounded-3xl p-8 text-center space-y-6 animate-fade-in border-slate-800">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Ujian Berhasil Dikumpulkan!</h2>
            <p className="text-xs text-slate-400">
              Jawaban Anda telah tersimpan dengan aman. Terima kasih telah mengikuti Placement Test Taklim.
            </p>
          </div>

          <div className="luxe-card-subtle rounded-2xl p-4 text-left space-y-2.5 text-xs border border-slate-800">
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Nama Lengkap</span>
              <span className="font-bold text-white">{identity?.nama}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">NIM</span>
              <span className="font-mono font-semibold text-emerald-400">{identity?.nim}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Bidang Taklim</span>
              <span className="font-semibold text-white">{identity?.kategoriName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Mabna</span>
              <span className="text-slate-200">{identity?.mabna}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Jumlah Terjawab</span>
              <span className="font-bold text-white">
                {Object.keys(answers).length} dari {questions.length} Soal
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              sessionStorage.clear();
              router.push("/");
            }}
            className="w-full py-3 rounded-xl font-bold text-xs luxe-button-secondary flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Kembali ke Halaman Utama</span>
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white leading-tight">{identity?.nama}</h2>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/30 uppercase">
                {identity?.kategoriName || "Placement Test"}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              NIM: {identity?.nim} &bull; {identity?.mabna}
            </p>
          </div>
        </div>

        {/* Timer & Submit Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-emerald-400 font-mono text-xs font-bold shadow-inner">
            <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold luxe-button-primary flex items-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Selesai Ujian</span>
          </button>
        </div>
      </header>

      {/* Main Body Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Column: Question Area (3 Cols) */}
        <div className="md:col-span-3 space-y-4 flex flex-col justify-between">
          {currentQ && (
            <div className="luxe-card rounded-3xl p-6 md:p-8 space-y-6 flex-1 border-slate-800">
              {/* Question Number Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Soal Nomor {currentIndex + 1} dari {questions.length}</span>
                </span>

                <button
                  onClick={() => toggleFlag(currentQ.originalId)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    flagged[currentQ.originalId]
                      ? "bg-amber-500/20 border border-amber-500/40 text-amber-400 font-semibold"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{flagged[currentQ.originalId] ? "Ragu-ragu (Aktif)" : "Tandai Ragu-ragu"}</span>
                </button>
              </div>

              {/* Question Text */}
              <div className="text-base md:text-lg font-medium text-slate-100 leading-relaxed">
                {currentQ.question}
              </div>

              {/* Options List */}
              <div className="space-y-3 pt-2">
                {currentQ.displayOptions.map((opt) => {
                  const isSelected = answers[currentQ.originalId] === opt.originalKey;
                  return (
                    <button
                      key={opt.displayKey}
                      onClick={() => handleSelectOption(currentQ.originalId, opt.originalKey)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start space-x-4 ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30"
                          : "bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                          isSelected
                            ? "bg-emerald-500 text-slate-950 font-extrabold"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {opt.displayKey}
                      </div>
                      <div className="text-xs md:text-sm font-medium pt-1 leading-relaxed">
                        {opt.text}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Pagination Controls */}
          <div className="flex items-center justify-between bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2.5 rounded-xl luxe-button-secondary disabled:opacity-30 disabled:pointer-events-none text-xs font-bold flex items-center space-x-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <span className="text-xs text-slate-400 font-medium">
              Terjawab: <strong className="text-emerald-400">{answeredCount}</strong> / {questions.length}
            </span>

            <button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              disabled={currentIndex === questions.length - 1}
              className="px-4 py-2.5 rounded-xl luxe-button-secondary disabled:opacity-30 disabled:pointer-events-none text-xs font-bold flex items-center space-x-1.5"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Question Grid Navigation (1 Col) */}
        <div className="luxe-card rounded-3xl p-5 space-y-4 border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Navigasi Soal
            </h3>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pb-3 border-b border-slate-800/80">
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Terjawab</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>Ragu</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />
                <span>Belum</span>
              </div>
            </div>

            {/* Grid Buttons */}
            <div className="grid grid-cols-5 gap-2 pt-3 max-h-[360px] overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isAnswered = Boolean(answers[q.originalId]);
                const isFlagged = Boolean(flagged[q.originalId]);
                const isCurrent = idx === currentIndex;

                let btnClass = "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800";
                if (isAnswered) btnClass = "bg-emerald-500 text-slate-950 font-bold border-emerald-400";
                if (isFlagged) btnClass = "bg-amber-500 text-slate-950 font-bold border-amber-400";
                if (isCurrent) btnClass += " ring-2 ring-white ring-offset-2 ring-offset-slate-900";

                return (
                  <button
                    key={q.originalId}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl text-xs font-semibold border flex items-center justify-center transition-all ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full py-3 rounded-xl text-xs font-bold luxe-button-primary flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Kumpulkan Jawaban</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation & Submit Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="luxe-card max-w-md w-full rounded-3xl p-6 md:p-8 space-y-6 border-slate-800">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Konfirmasi Pengumpulkan</h3>
              <p className="text-xs text-slate-400">
                Apakah Anda yakin ingin menyelesaikan dan mengumpulkan lembar jawaban ujian Ini?
              </p>
            </div>

            <div className="luxe-card-subtle p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Soal Terjawab:</span>
                <span className="font-bold text-emerald-400">{answeredCount} dari {questions.length} Soal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Belum Diisi:</span>
                <span className="font-bold text-rose-400">{questions.length - answeredCount} Soal</span>
              </div>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="py-3 rounded-xl font-bold text-xs luxe-button-secondary"
              >
                Kembali Periksa
              </button>

              <button
                onClick={() => triggerSubmit(false)}
                disabled={isSubmitting}
                className="py-3 rounded-xl font-bold text-xs luxe-button-primary flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Mengirim Jitter...</span>
                ) : (
                  <span>Ya, Kumpulkan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
