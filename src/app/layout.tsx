import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taklim CBT - MSAA UIN MALANG",
  description: "Sistem CBT Placement Test Serverless High-Concurrency Bebas Crash",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className="bg-[#0b132b] text-slate-100 min-h-screen antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
