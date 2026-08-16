"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global CBT Error:", error);
  }, [error]);

  return (
    <html lang="id">
      <body className="bg-[#0b132b] text-white min-h-screen flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full rounded-3xl p-8 text-center space-y-6">
          <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Global Application Error</h2>
            <p className="text-xs text-slate-400">
              {error.message || "Terjadi kesalahan fatal pada aplikasi."}
            </p>
          </div>

          <button
            onClick={() => reset()}
            className="w-full py-3 rounded-xl font-semibold text-xs glow-button text-white flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Coba Lagi</span>
          </button>
        </div>
      </body>
    </html>
  );
}
