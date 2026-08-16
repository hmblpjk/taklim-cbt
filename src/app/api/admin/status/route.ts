import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { localDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}

export async function POST(req: NextRequest) {
  try {
    const { password, setActiveCategory, setExamToken } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (password !== adminPassword) {
      return NextResponse.json(
        { success: false, message: "Password Admin salah." },
        { status: 401 }
      );
    }

    if (setActiveCategory) {
      localDb.setActiveCategory(setActiveCategory);
    }

    if (setExamToken) {
      localDb.setExamToken(setExamToken);
    }

    const queueLength = await redis.llen("exam_submission_queue");
    const results = localDb.getResults();
    const activeCategory = localDb.getActiveCategory();
    const examToken = localDb.getExamToken();

    return NextResponse.json({
      success: true,
      queueLength,
      resultsCount: results.length,
      activeCategory,
      examToken,
      examStatus: activeCategory !== "none" ? "PUBLISHED" : "CLOSED",
      results,
      questionsAfkar: localDb.getQuestions("afkar"),
      questionsQuran: localDb.getQuestions("quran"),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat status admin." },
      { status: 500 }
    );
  }
}
