"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MABNA_LIST } from "@/lib/constants";
import { User, IdCard, Home, Key, Sparkles, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [nim, setNim] = useState("");
  const [mabna, setMabna] = useState(MABNA_LIST[0]);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [kategoriName, setKategoriName] = useState<string>("Loading...");
  const [fetchingExamInfo, setFetchingExamInfo] = useState(true);

  // Load Active Exam Category from Server
  useEffect(() => {
    fetch("/api/exam/questions")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.activeCategory) {
          setActiveCategory(data.activeCategory);
          setKategoriName(data.kategoriName || data.activeCategory);
        } else {
          setActiveCategory("none");
          setKategoriName("Sesi Ditutup");
        }
      })
      .catch(() => {
        setActiveCategory("none");
        setKategoriName("Sesi Ditutup");
      })
      .finally(() => setFetchingExamInfo(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!nama.trim()) {
      setError("Silakan isi Nama Lengkap Anda.");
      return;
    }
    if (!nim.trim()) {
      setError("Silakan isi Nomor Induk Mahasiswa (NIM).");
      return;
    }
    if (!mabna) {
      setError("Silakan pilih Mabna / Gedung Anda.");
      return;
    }
    if (!token.trim()) {
      setError("Silakan masukkan Token Ujian.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/exam/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nim: nim.trim(),
          token: token.trim().toUpperCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Token Ujian tidak valid.");
        setLoading(false);
        return;
      }

      // Save identity to sessionStorage
      const userSession = {
        nama: nama.trim(),
        nim: nim.trim(),
        mabna: mabna.trim(),
        token: token.trim().toUpperCase(),
        kategori: data.activeCategory,
        kategoriName: data.kategoriName,
      };

      sessionStorage.setItem("cbt_user", JSON.stringify(userSession));
      router.push("/exam");
    } catch (err) {
      setError("Gagal menghubungkan ke server untuk verifikasi token.");
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-6 overflow-hidden select-none">
      {/* Fullscreen Drone Campus Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style={{ backgroundImage: "url('/images/bg-mahad.jpg')" }}
      />

      {/* Subtle Vignette & Dark Overlay for optimal readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60 backdrop-blur-[2px]" />

      {/* Main Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-[420px] animate-fade-in my-auto">
        <div className="bg-white/15 backdrop-blur-2xl border border-white/30 rounded-[36px] p-7 md:p-9 shadow-2xl shadow-black/70 ring-1 ring-white/20 space-y-6">

          {/* Header Title Section */}
          <div className="space-y-1 text-left">
            <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
              Placement Test Taklim
            </h1>
            <p className="text-xs text-white/80 font-medium">
              Portal Ujian Mandiri Mahasantri MSAA
            </p>
          </div>

          {/* Active Exam Category Banner */}
          <div>
            {fetchingExamInfo ? (
              <div className="py-2.5 px-4 rounded-2xl bg-black/20 border border-white/10 text-center text-xs text-white/70 animate-pulse">
                Memeriksa jadwal ujian aktif...
              </div>
            ) : activeCategory && activeCategory !== "none" ? (
              <div className="py-2.5 px-4 rounded-2xl bg-emerald-500/25 border border-emerald-400/40 text-center flex items-center justify-center space-x-2 text-xs text-white shadow-inner">
                <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse shrink-0" />
                <span className="font-extrabold tracking-wide uppercase">{kategoriName}</span>
              </div>
            ) : (
              <div className="py-2.5 px-4 rounded-2xl bg-amber-500/25 border border-amber-400/40 text-center flex items-center justify-center space-x-2 text-xs text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="font-semibold">Sesi Ujian Ditutup Panitia</span>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/30 border border-rose-400/50 text-white text-xs font-semibold text-center animate-slide-up shadow-md">
                {error}
              </div>
            )}

            {/* Field 1: Nama Lengkap */}
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Nama Lengkap"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full pl-5 pr-12 py-3.5 rounded-2xl bg-black/30 border border-white/30 text-sm text-white placeholder-white/60 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/30 transition-all shadow-inner"
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-white/70">
                <User className="w-5 h-5" />
              </div>
            </div>

            {/* Field 2: NIM */}
            <div className="relative">
              <input
                type="text"
                required
                placeholder="NIM (Nomor Induk Mahasiswa)"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                className="w-full pl-5 pr-12 py-3.5 rounded-2xl bg-black/30 border border-white/30 text-sm text-white placeholder-white/60 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/30 transition-all shadow-inner font-mono"
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-white/70">
                <IdCard className="w-5 h-5" />
              </div>
            </div>

            {/* Field 3: Mabna Dropdown */}
            <div className="relative">
              <select
                value={mabna}
                onChange={(e) => setMabna(e.target.value)}
                className="w-full pl-5 pr-12 py-3.5 rounded-2xl bg-black/40 border border-white/30 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-white focus:ring-2 focus:ring-white/30 transition-all shadow-inner"
              >
                {MABNA_LIST.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    Mabna {m}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-white/70">
                <Home className="w-5 h-5" />
              </div>
            </div>

            {/* Field 4: Token Ujian */}
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Token Ujian"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                className="w-full pl-5 pr-12 py-3.5 rounded-2xl bg-black/30 border border-white/30 text-sm text-lime-300 placeholder-white/60 uppercase tracking-widest font-mono font-bold focus:outline-none focus:border-white focus:ring-2 focus:ring-white/30 transition-all shadow-inner"
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-white/70">
                <Key className="w-5 h-5" />
              </div>
            </div>

            {/* Action Button: Mulai Ujian */}
            <button
              type="submit"
              disabled={loading || activeCategory === "none"}
              className="w-full py-4 mt-2 rounded-2xl font-extrabold text-base text-white tracking-wide bg-gradient-to-r from-[#84cc16] via-[#10b981] to-[#059669] hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-emerald-950/60 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <span>Memverifikasi Token...</span>
              ) : activeCategory === "none" ? (
                <span>Sesi Ujian Belum Dibuka</span>
              ) : (
                <span>Mulai Ujian</span>
              )}
            </button>
          </form>

          {/* Footer watermark matching reference */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-white/70 font-medium tracking-wide">
              Taklim CBT MSAA &copy; 2026 | Abyan
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
