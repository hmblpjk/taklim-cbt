"use client";

import React, { useEffect, useState } from "react";
import { Question, ExamResult, EXAM_CATEGORIES } from "@/lib/constants";
import { parseExcelQuestions, generateTemplateExcel, ExcelValidationError } from "@/lib/excel-parser";
import {
  Lock,
  Upload,
  Plus,
  Trash2,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Database,
  CheckCircle,
  AlertCircle,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Layers,
  ArrowRight,
  LogOut,
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  
  const [activeTab, setActiveTab] = useState<"builder" | "upload" | "status" | "results">("status");
  const [builderCategory, setBuilderCategory] = useState<string>("afkar");
  const [resultsCategoryFilter, setResultsCategoryFilter] = useState<string>("all");

  const [questionsMap, setQuestionsMap] = useState<Record<string, Question[]>>({
    afkar: [],
    quran: [],
  });

  const [excelErrors, setExcelErrors] = useState<ExcelValidationError[]>([]);
  const [queueLength, setQueueLength] = useState(0);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("afkar");
  
  // Dynamic Exam Token State
  const [examToken, setExamToken] = useState<string>("TAKLIM2026");
  const [newTokenInput, setNewTokenInput] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRowNim, setExpandedRowNim] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Check saved session
  useEffect(() => {
    const savedPass = sessionStorage.getItem("admin_pass");
    if (savedPass) {
      setPassword(savedPass);
      verifyPassword(savedPass);
    }
  }, []);

  const verifyPassword = async (passToTest: string) => {
    setLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/admin/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passToTest }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_pass", passToTest);
        setQueueLength(data.queueLength || 0);
        setResults(data.results || []);
        setActiveCategory(data.activeCategory || "afkar");
        setExamToken(data.examToken || "TAKLIM2026");
        setNewTokenInput(data.examToken || "TAKLIM2026");
        setQuestionsMap({
          afkar: data.questionsAfkar || [],
          quran: data.questionsQuran || [],
        });
      } else {
        setAuthError(data.message || "Password Admin salah.");
      }
    } catch (err) {
      setAuthError("Gagal menghubungi server admin.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPassword(password);
  };

  // Change active category in system (e.g. Day 1 -> Afkar, Day 2 -> Qur'an)
  const handleChangeActiveCategory = async (newCategory: string) => {
    setLoading(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/admin/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, setActiveCategory: newCategory }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveCategory(newCategory);
        const catObj = EXAM_CATEGORIES.find((c) => c.id === newCategory);
        setStatusMessage(
          newCategory !== "none"
            ? `Berhasil mengaktifkan sesi ujian: ${catObj ? catObj.name : newCategory}!`
            : "Sesi ujian saat ini telah DITUTUP (Nonaktif)."
        );
      }
    } catch (err) {
      alert("Gagal mengubah sesi ujian aktif.");
    } finally {
      setLoading(false);
    }
  };

  // Change dynamic Exam Token
  const handleSaveNewExamToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenInput.trim()) {
      alert("Token Ujian tidak boleh kosong.");
      return;
    }

    setLoading(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/admin/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, setExamToken: newTokenInput.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setExamToken(data.examToken);
        setNewTokenInput(data.examToken);
        setStatusMessage(`Berhasil memperbarui Token Ujian Masal menjadi: "${data.examToken}"!`);
      } else {
        alert(data.message || "Gagal memperbarui token ujian.");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat memperbarui token ujian.");
    } finally {
      setLoading(false);
    }
  };

  // Form Builder Handlers for currently selected builderCategory
  const currentQuestions = questionsMap[builderCategory] || [];

  const handleAddQuestion = () => {
    const newId = currentQuestions.length > 0 ? Math.max(...currentQuestions.map((q) => q.id)) + 1 : 1;
    const updated = [
      ...currentQuestions,
      {
        id: newId,
        question: "",
        options: [
          { key: "A", text: "" },
          { key: "B", text: "" },
          { key: "C", text: "" },
          { key: "D", text: "" },
        ],
        answerKey: "A",
        kategori: builderCategory,
      },
    ];

    setQuestionsMap({ ...questionsMap, [builderCategory]: updated as Question[] });
  };

  const handleDeleteQuestion = (id: number) => {
    const updated = currentQuestions.filter((q) => q.id !== id);
    setQuestionsMap({ ...questionsMap, [builderCategory]: updated });
  };

  const handleUpdateQuestion = (id: number, field: string, value: any) => {
    const updated = currentQuestions.map((q) => (q.id === id ? { ...q, [field]: value } : q));
    setQuestionsMap({ ...questionsMap, [builderCategory]: updated });
  };

  const handleUpdateOption = (qId: number, optKey: "A" | "B" | "C" | "D", text: string) => {
    const updated = currentQuestions.map((q) => {
      if (q.id === qId) {
        const newOpts = q.options.map((o) => (o.key === optKey ? { ...o, text } : o));
        return { ...q, options: newOpts };
      }
      return q;
    });
    setQuestionsMap({ ...questionsMap, [builderCategory]: updated });
  };

  // File Excel Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      const { questions: parsed, errors } = parseExcelQuestions(buffer, builderCategory);
      setExcelErrors(errors);

      if (parsed.length > 0) {
        setQuestionsMap({ ...questionsMap, [builderCategory]: parsed });
        const catObj = EXAM_CATEGORIES.find((c) => c.id === builderCategory);
        setStatusMessage(`Berhasil memuat ${parsed.length} soal untuk ${catObj?.name || builderCategory}!`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    const blob = generateTemplateExcel();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Template_Soal_Taklim_CBT.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Publish Action per category
  const handlePublish = async (categoryToPublish = builderCategory, setActive = true) => {
    const qList = questionsMap[categoryToPublish] || [];
    const catObj = EXAM_CATEGORIES.find((c) => c.id === categoryToPublish);

    if (qList.length === 0) {
      alert(`Bank soal untuk ${catObj?.name || categoryToPublish} tidak boleh kosong.`);
      return;
    }
    setLoading(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, questions: qList, kategori: categoryToPublish, setActive }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage(data.message);
        if (setActive) setActiveCategory(categoryToPublish);
      } else {
        alert(data.message || "Gagal mempublikasikan soal.");
      }
    } catch (e: any) {
      alert("Terjadi kesalahan sistem saat publish.");
    } finally {
      setLoading(false);
    }
  };

  // Drain Queue Action
  const handleDrainQueue = async () => {
    setLoading(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/admin/drain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage(data.message);
        setResults(data.results || []);
        setQueueLength(0);
      } else {
        alert(data.message || "Gagal memproses antrean.");
      }
    } catch (e) {
      alert("Gagal menghubungi server drain queue.");
    } finally {
      setLoading(false);
    }
  };

  // Clear Test Data Action
  const handleClearTestData = async () => {
    if (!confirm("Apakah Anda yakin ingin mengosongkan data simulasi test & unblock seluruh NIM agar bisa login kembali?")) return;
    setLoading(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/admin/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, clearTestData: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage(data.message || "Berhasil mengosongkan data simulasi!");
        setResults([]);
        setQueueLength(0);
      } else {
        alert(data.message || "Gagal mengosongkan data.");
      }
    } catch (e) {
      alert("Gagal mengosongkan data simulasi.");
    } finally {
      setLoading(false);
    }
  };

  // Export Excel
  const handleExportExcel = (kategoriTarget = resultsCategoryFilter) => {
    window.open(
      `/api/admin/export?password=${encodeURIComponent(password)}&kategori=${kategoriTarget}`,
      "_blank"
    );
  };

  // Admin Login View (Frosted Glass with Campus Drone Background)
  if (!isAuthenticated) {
    return (
      <main className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-6 overflow-hidden select-none">
        {/* Fullscreen Drone Campus Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
          style={{ backgroundImage: "url('/images/bg-mahad.jpg')" }}
        />
        
        {/* Subtle Vignette & Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/70 backdrop-blur-[2px]" />

        {/* Admin Glass Login Card */}
        <div className="relative z-10 w-full max-w-[400px] animate-fade-in my-auto">
          <div className="bg-white/15 backdrop-blur-2xl border border-white/30 rounded-[36px] p-7 md:p-9 shadow-2xl shadow-black/70 ring-1 ring-white/20 space-y-6">
            
            <div className="space-y-1 text-left">
              <div className="w-12 h-12 bg-emerald-500/25 border border-emerald-400/40 rounded-2xl flex items-center justify-center text-emerald-300 mb-3 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-md">
                Panel Admin CBT
              </h1>
              <p className="text-xs text-white/80 font-medium">
                Masukkan Password Otorisasi Panitia MSAA
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {authError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/30 border border-rose-400/50 text-white text-xs font-semibold text-center animate-slide-up shadow-md">
                  {authError}
                </div>
              )}

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Password Admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-5 pr-12 py-3.5 rounded-2xl bg-black/30 border border-white/30 text-sm text-white placeholder-white/60 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/30 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/70 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-2 rounded-2xl font-extrabold text-sm text-white tracking-wide bg-gradient-to-r from-[#84cc16] via-[#10b981] to-[#059669] hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-emerald-950/60 disabled:opacity-50"
              >
                {loading ? "Memeriksa..." : "Masuk Panel Admin"}
              </button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-white/70 font-medium tracking-wide">
                Taklim CBT MSAA &copy; 2026
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const filteredResults = results.filter((r) => {
    const matchesCategory = resultsCategoryFilter === "all" || r.kategori === resultsCategoryFilter;
    const matchesSearch =
      r.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.mabna.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeCatObj = EXAM_CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Header Admin */}
      <header className="bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Dashboard Admin Placement Test</h1>
            <p className="text-xs text-slate-400">Taklim CBT MSAA &bull; Multi-Category & Token Control</p>
          </div>
        </div>

        <button
          onClick={() => {
            sessionStorage.removeItem("admin_pass");
            setIsAuthenticated(false);
          }}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold luxe-button-secondary flex items-center space-x-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar Admin</span>
        </button>
      </header>

      {/* Control Tabs Nav */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("status")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
              activeTab === "status"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Jadwal & Token</span>
            {queueLength > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                Queue: {queueLength}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("builder")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
              activeTab === "builder"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Form Builder</span>
          </button>

          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
              activeTab === "upload"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Excel</span>
          </button>

          <button
            onClick={() => setActiveTab("results")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
              activeTab === "results"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Rekap Nilai ({results.length})</span>
          </button>
        </div>

        {/* Active Exam & Token Badges */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
            <Key className="w-3.5 h-3.5 text-lime-400" />
            <span className="text-slate-400">Token:</span>
            <span className="font-mono font-bold text-lime-300">{examToken}</span>
          </div>

          <span className={`px-3 py-1 rounded-xl font-bold border ${
            activeCategory !== "none"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
          }`}>
            {activeCategory !== "none" ? activeCatObj?.name || activeCategory : "DITUTUP"}
          </span>
        </div>
      </div>

      {statusMessage && (
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Tab Contents */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {/* TAB 1: CONTROL & JADWAL & TOKEN UJIAN */}
        {activeTab === "status" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-white">Jadwal Ujian & Pengelolaan Token</h2>
              <p className="text-xs text-slate-400">
                Atur bidang ujian aktif dan perbarui Token Ujian Masal kapan saja tanpa perlu merestart server.
              </p>
            </div>

            {/* Token Editor Card */}
            <div className="luxe-card p-6 rounded-3xl border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Key className="w-4 h-4 text-lime-400" />
                <span>Pengelolaan Token Ujian Masal Peserta</span>
              </h3>

              <form onSubmit={handleSaveNewExamToken} className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Token Ujian Aktif Saat Ini
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Masukkan Token Baru (Contoh: TAKLIM2026)"
                      value={newTokenInput}
                      onChange={(e) => setNewTokenInput(e.target.value.toUpperCase())}
                      className="w-full pl-4 pr-10 py-3 rounded-xl luxe-input text-sm uppercase tracking-widest font-mono font-bold text-lime-300 placeholder-slate-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3.5 rounded-xl font-bold text-xs luxe-button-primary flex items-center justify-center space-x-2 shrink-0 self-end disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Token Baru</span>
                </button>
              </form>
            </div>

            {/* Active Switcher Card */}
            <div className="luxe-card p-6 rounded-3xl border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Sakelar Buka / Tutup Sesi Ujian Hari Ini</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {EXAM_CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  const qCount = (questionsMap[cat.id] || []).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleChangeActiveCategory(cat.id)}
                      disabled={loading}
                      className={`p-5 rounded-2xl border text-left transition-all ${
                        isActive
                          ? "bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30"
                          : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                          {cat.code}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-extrabold">
                            AKTIF BUKA
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{cat.name}</h4>
                      <p className="text-xs text-slate-400">{qCount} Soal Siap &bull; Bebas Akses Peserta</p>
                    </button>
                  );
                })}

                {/* Option to Close All Exams */}
                <button
                  onClick={() => handleChangeActiveCategory("none")}
                  disabled={loading}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    activeCategory === "none"
                      ? "bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30"
                      : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                      OFF
                    </span>
                    {activeCategory === "none" && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                        DITUTUP
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Tutup Seluruh Ujian</h4>
                  <p className="text-xs text-slate-400">Peserta tidak dapat melakukan login / tes.</p>
                </button>
              </div>
            </div>

            {/* Dashboard Monitoring Counters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="luxe-card p-6 rounded-3xl space-y-2 border-slate-800">
                <span className="text-xs text-slate-400 font-semibold uppercase">Antrean Submit Redis</span>
                <div className="text-2xl font-extrabold text-amber-400 flex items-center space-x-2">
                  <Layers className="w-6 h-6" />
                  <span>{queueLength} Submission</span>
                </div>
                <p className="text-[11px] text-slate-400">Siap ditarik & dihitung nilainya</p>
              </div>

              <div className="luxe-card p-6 rounded-3xl space-y-2 border-slate-800">
                <span className="text-xs text-slate-400 font-semibold uppercase">Hasil Rekap Taklim Afkar</span>
                <div className="text-2xl font-extrabold text-emerald-400 flex items-center space-x-2">
                  <FileSpreadsheet className="w-6 h-6" />
                  <span>{results.filter((r) => r.kategori === "afkar").length} Peserta</span>
                </div>
                <p className="text-[11px] text-slate-400">Soal Aktif: {(questionsMap["afkar"] || []).length} Nomor</p>
              </div>

              <div className="luxe-card p-6 rounded-3xl space-y-2 border-slate-800">
                <span className="text-xs text-slate-400 font-semibold uppercase">Hasil Rekap Taklim Qur'an</span>
                <div className="text-2xl font-extrabold text-teal-400 flex items-center space-x-2">
                  <FileSpreadsheet className="w-6 h-6" />
                  <span>{results.filter((r) => r.kategori === "quran").length} Peserta</span>
                </div>
                <p className="text-[11px] text-slate-400">Soal Aktif: {(questionsMap["quran"] || []).length} Nomor</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="luxe-card p-6 rounded-3xl space-y-4 border-slate-800">
              <h3 className="text-sm font-bold text-white">Aksi Pengelolaan Antrean</h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleDrainQueue}
                  disabled={loading || queueLength === 0}
                  className="px-5 py-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors flex items-center space-x-2 disabled:opacity-40"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  <span>Tarik & Rekap Nilai dari Redis Queue</span>
                </button>

                <button
                  onClick={() => handleExportExcel("all")}
                  className="px-5 py-3 rounded-xl text-xs font-bold luxe-button-primary flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Ekspor Semua Rekap Nilai (Excel Multi-Sheet)</span>
                </button>

                <button
                  onClick={handleClearTestData}
                  disabled={loading}
                  className="px-5 py-3 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reset Data Simulasi & Unblock Seluruh NIM</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FORM BUILDER (PER CATEGORY) */}
        {activeTab === "builder" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Form Builder Interaktif</h2>
                <p className="text-xs text-slate-400">Pilih bidang taklim yang ingin dikelola bank soalnya.</p>
              </div>

              {/* Category Selector Tabs */}
              <div className="flex space-x-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                {EXAM_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setBuilderCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      builderCategory === cat.id
                        ? "bg-emerald-500 text-slate-950 shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Soal {cat.name} ({(questionsMap[cat.id] || []).length})
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">
                Mengelola Soal: {EXAM_CATEGORIES.find((c) => c.id === builderCategory)?.name}
              </span>

              <div className="flex space-x-2">
                <button
                  onClick={handleAddQuestion}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold luxe-button-secondary flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Soal</span>
                </button>

                <button
                  onClick={() => handlePublish(builderCategory, true)}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-bold luxe-button-primary flex items-center space-x-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Publish {EXAM_CATEGORIES.find((c) => c.id === builderCategory)?.name}</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {currentQuestions.map((q, qIdx) => (
                <div key={q.id} className="luxe-card rounded-2xl p-6 border-slate-800 space-y-4 relative">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Soal Nomor {qIdx + 1} ({EXAM_CATEGORIES.find((c) => c.id === builderCategory)?.name})
                    </span>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="Hapus Soal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Pertanyaan */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                      Teks Pertanyaan
                    </label>
                    <textarea
                      rows={2}
                      value={q.question}
                      onChange={(e) => handleUpdateQuestion(q.id, "question", e.target.value)}
                      placeholder="Masukkan pertanyaan di sini..."
                      className="w-full p-3 rounded-xl luxe-input text-xs text-white placeholder-slate-600 resize-y"
                    />
                  </div>

                  {/* Pilihan Ganda A-D */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt) => (
                      <div key={opt.key} className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-900 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0 border border-slate-800">
                          {opt.key}
                        </span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleUpdateOption(q.id, opt.key, e.target.value)}
                          placeholder={`Teks pilihan ${opt.key}`}
                          className="w-full p-2.5 rounded-xl luxe-input text-xs text-white placeholder-slate-600"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Kunci Jawaban Radio */}
                  <div className="pt-2 flex items-center space-x-4 border-t border-slate-800 text-xs">
                    <span className="font-semibold text-slate-400">Kunci Jawaban Benar:</span>
                    <div className="flex space-x-4">
                      {(["A", "B", "C", "D"] as const).map((key) => (
                        <label key={key} className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`key_${builderCategory}_${q.id}`}
                            checked={q.answerKey === key}
                            onChange={() => handleUpdateQuestion(q.id, "answerKey", key)}
                            className="accent-emerald-500"
                          />
                          <span className={q.answerKey === key ? "font-bold text-emerald-400" : "text-slate-400"}>
                            Pilihan {key}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: UPLOAD EXCEL (PER CATEGORY) */}
        {activeTab === "upload" && (
          <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-white">Upload Soal via Excel / CSV</h2>
              <p className="text-xs text-slate-400">
                Pilih kategori bidang taklim lalu unggah file Excel soal.
              </p>
            </div>

            {/* Target Category Selector */}
            <div className="luxe-card p-4 rounded-2xl flex items-center justify-between border-slate-800">
              <span className="text-xs font-bold text-slate-300">Target Bidang Soal:</span>
              <div className="flex space-x-2">
                {EXAM_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setBuilderCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      builderCategory === cat.id
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Download Card */}
            <div className="luxe-card p-5 rounded-2xl flex items-center justify-between border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Belum Memiliki Format File?</h4>
                  <p className="text-[11px] text-slate-400">Unduh template standar Excel untuk diisi.</p>
                </div>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="px-3.5 py-2 rounded-xl text-xs font-bold luxe-button-secondary flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Template .xlsx</span>
              </button>
            </div>

            {/* Drag Drop Area */}
            <div className="luxe-card p-8 rounded-3xl border-2 border-dashed border-slate-800 hover:border-emerald-500/40 text-center space-y-4 cursor-pointer transition-colors">
              <Upload className="w-10 h-10 text-emerald-400 mx-auto" />
              <div>
                <p className="text-xs font-bold text-white">
                  Klik atau Tarik File Excel Soal ({EXAM_CATEGORIES.find((c) => c.id === builderCategory)?.name})
                </p>
                <p className="text-[11px] text-slate-400">Mendukung format .xlsx dan .csv</p>
              </div>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excelInput"
              />
              <label
                htmlFor="excelInput"
                className="inline-block px-5 py-2.5 rounded-xl text-xs font-bold luxe-button-primary cursor-pointer"
              >
                Pilih File Excel
              </label>
            </div>

            {/* Validation Errors Display */}
            {excelErrors.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <h4 className="text-xs font-bold text-rose-400 flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Ditemukan Error Validasi Schema File Excel ({excelErrors.length})</span>
                </h4>
                <ul className="text-[11px] text-rose-300 space-y-1 max-h-40 overflow-y-auto pl-4 list-disc">
                  {excelErrors.map((err, idx) => (
                    <li key={idx}>Baris {err.row}: {err.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REKAP NILAI & EXPORT EXCEL PER CATEGORY */}
        {activeTab === "results" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Rekapitulasi Nilai & Detail Jawaban</h2>
                <p className="text-xs text-slate-400">Total {results.length} lembar jawaban peserta dari semua bidang.</p>
              </div>

              <div className="flex items-center space-x-3 flex-wrap gap-2">
                <button
                  onClick={handleDrainQueue}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center space-x-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>Tarik Nilai Baru</span>
                </button>

                {/* Export Buttons */}
                <button
                  onClick={() => handleExportExcel("afkar")}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold luxe-button-secondary text-emerald-400 flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel Afkar</span>
                </button>

                <button
                  onClick={() => handleExportExcel("quran")}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold luxe-button-secondary text-teal-400 flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel Qur'an</span>
                </button>

                <button
                  onClick={() => handleExportExcel("all")}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold luxe-button-primary flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel Semua Bidang</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Category Filter Tabs */}
              <div className="flex space-x-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setResultsCategoryFilter("all")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    resultsCategoryFilter === "all"
                      ? "bg-emerald-500 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Semua Bidang ({results.length})
                </button>
                {EXAM_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setResultsCategoryFilter(cat.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      resultsCategoryFilter === cat.id
                        ? "bg-emerald-500 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {cat.name} ({results.filter((r) => r.kategori === cat.id).length})
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Cari Nama, NIM, Mabna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl luxe-input text-xs text-white placeholder-slate-600"
                />
              </div>
            </div>

            {/* Results Table */}
            <div className="luxe-card rounded-2xl overflow-hidden border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5 font-bold">No</th>
                      <th className="p-3.5 font-bold">NIM</th>
                      <th className="p-3.5 font-bold">Nama Lengkap</th>
                      <th className="p-3.5 font-bold">Mabna</th>
                      <th className="p-3.5 font-bold">Bidang Taklim</th>
                      <th className="p-3.5 font-bold">Skor Akhir</th>
                      <th className="p-3.5 font-bold">Persentase</th>
                      <th className="p-3.5 font-bold">Tab Switch</th>
                      <th className="p-3.5 font-bold text-center">Detail Jawaban</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                          Belum ada data nilai peserta untuk filter ini. Klik "Tarik & Rekap Nilai" jika peserta sudah submit.
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((res, idx) => {
                        const isExpanded = expandedRowNim === `${res.nim}_${res.kategori}`;
                        return (
                          <React.Fragment key={`${res.nim}_${res.kategori}`}>
                            <tr className="hover:bg-slate-900/60 transition-colors">
                              <td className="p-3.5 text-slate-500">{idx + 1}</td>
                              <td className="p-3.5 font-mono text-emerald-400 font-semibold">{res.nim}</td>
                              <td className="p-3.5 font-semibold text-white">{res.nama}</td>
                              <td className="p-3.5 text-slate-300">{res.mabna}</td>
                              <td className="p-3.5 font-bold">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                                  {res.kategoriName || res.kategori}
                                </span>
                              </td>
                              <td className="p-3.5 font-extrabold text-white">
                                {res.score} / {res.totalQuestions}
                              </td>
                              <td className="p-3.5 font-bold text-teal-400">{res.percentage}%</td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    res.tabSwitches > 0 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                                  }`}
                                >
                                  {res.tabSwitches}x
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                <button
                                  onClick={() => setExpandedRowNim(isExpanded ? null : `${res.nim}_${res.kategori}`)}
                                  className="px-2.5 py-1 rounded-lg luxe-button-secondary text-[11px] inline-flex items-center space-x-1"
                                >
                                  <span>{isExpanded ? "Tutup" : "Rincian Q1..Q" + res.totalQuestions}</span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Answer Breakdown Row */}
                            {isExpanded && (
                              <tr className="bg-slate-950">
                                <td colSpan={9} className="p-4 border-t border-slate-800">
                                  <div className="space-y-2">
                                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                      Rincian Jawaban Per Nomor - {res.nama} ({res.nim}) &bull; {res.kategoriName}
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(res.answers).map(([qNum, choice]) => (
                                        <div
                                          key={qNum}
                                          className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] flex items-center space-x-1.5"
                                        >
                                          <span className="text-slate-400 font-bold">Q{qNum}:</span>
                                          <span className="font-extrabold text-emerald-400">{choice}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
