import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0b132b] via-[#1c2541] to-[#0b132b] text-white">
      <div className="glass-card max-w-md w-full rounded-3xl p-8 text-center space-y-6">
        <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Halaman Tidak Ditemukan (404)</h2>
          <p className="text-xs text-slate-400">
            Halaman yang Anda cari tidak tersedia atau alamat URL salah.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center w-full py-3 rounded-xl font-semibold text-xs glow-button text-white space-x-2"
        >
          <Home className="w-4 h-4" />
          <span>Kembali ke Halaman Utama</span>
        </Link>
      </div>
    </div>
  );
}
