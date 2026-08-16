"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Taklim CBT Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0b132b] via-[#1c2541] to-[#0b132b] text-white">
      <div className="glass-card max-w-md w-full rounded-3xl p-8 text-center space-y-6">
        <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Terjadi Kendala Sistem</h2>
          <p className="text-xs text-slate-400">
            {error.message || "Aplikasi mengalami kesalahan yang tidak terduga."}
          </p>
        </div>

        <button
          onClick={() => reset()}
          className="w-full py-3 rounded-xl font-semibold text-xs glow-button text-white flex items-center justify-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Muat Ulang Komponen</span>
        </button>
      </div>
    </div>
  );
}
