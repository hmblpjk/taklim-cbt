import { NextRequest, NextResponse } from "next/server";
import { localDb } from "@/lib/supabase";
import { exportResultsToExcel } from "@/lib/excel-parser";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const password = searchParams.get("password");
    const kategori = searchParams.get("kategori") || "all";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (password !== adminPassword) {
      return NextResponse.json(
        { success: false, message: "Password Admin salah." },
        { status: 401 }
      );
    }

    const results = localDb.getResults(kategori);
    const totalQMap = localDb.getTotalQuestionsCountMap();

    const excelBlob = exportResultsToExcel(results, totalQMap, kategori);
    const buffer = Buffer.from(await excelBlob.arrayBuffer());

    const katSuffix = kategori !== "all" ? `_${kategori.toUpperCase()}` : "_SEMUA_BIDANG";
    const filename = `Rekap_Nilai_Taklim${katSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengunduh file Excel." },
      { status: 500 }
    );
  }
}
