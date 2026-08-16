import { NextRequest, NextResponse } from "next/server";
import { localDb } from "@/lib/supabase";
import { Question, EXAM_CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}

export async function POST(req: NextRequest) {
  try {
    const { password, questions, kategori, setActive } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (password !== adminPassword) {
      return NextResponse.json(
        { success: false, message: "Password Admin salah." },
        { status: 401 }
      );
    }

    const targetCategory = kategori || "afkar";
    const catObj = EXAM_CATEGORIES.find((c) => c.id === targetCategory);
    const catName = catObj ? catObj.name : targetCategory;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { success: false, message: `Bank soal untuk ${catName} tidak boleh kosong.` },
        { status: 400 }
      );
    }

    // Save questions for specific category
    await localDb.saveQuestions(targetCategory, questions as Question[]);

    if (setActive) {
      localDb.setActiveCategory(targetCategory);
    }

    return NextResponse.json({
      success: true,
      activeCategory: localDb.getActiveCategory(),
      message: `Berhasil mempublikasikan ${questions.length} soal ${catName} ke Supabase & Edge CDN!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mempublikasikan soal." },
      { status: 500 }
    );
  }
}
