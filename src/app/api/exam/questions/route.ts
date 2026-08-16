import { NextResponse } from "next/server";
import { localDb } from "@/lib/supabase";
import { EXAM_CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activeCategory = localDb.getActiveCategory();
    if (!activeCategory || activeCategory === "none") {
      return NextResponse.json(
        { success: false, message: "Sesi ujian saat ini sedang ditutup." },
        { status: 403 }
      );
    }

    const publicQuestions = await localDb.getPublicQuestions(activeCategory);
    const catObj = EXAM_CATEGORIES.find((c) => c.id === activeCategory);

    const response = NextResponse.json({
      success: true,
      activeCategory,
      kategoriName: catObj ? catObj.name : activeCategory,
      totalQuestions: publicQuestions.length,
      questions: publicQuestions,
    });

    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat soal" },
      { status: 500 }
    );
  }
}
