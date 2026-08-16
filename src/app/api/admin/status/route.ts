import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { localDb, supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}

export async function POST(req: NextRequest) {
  try {
    const { password, setActiveCategory, setExamToken, clearTestData } = await req.json();
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

    // Reset Test Data Action (Clear Redis Anti-Double Submit sets and empty Redis Queue)
    if (clearTestData) {
      await redis.del("submitted_nims_afkar");
      await redis.del("submitted_nims_quran");
      await redis.del("exam_submission_queue");
      await localDb.clearResults("all");
    }

    const queueLength = await redis.llen("exam_submission_queue");
    const results = await localDb.getResults();
    const activeCategory = localDb.getActiveCategory();
    const examToken = localDb.getExamToken();
    const questionsAfkar = await localDb.getQuestions("afkar");
    const questionsQuran = await localDb.getQuestions("quran");

    return NextResponse.json({
      success: true,
      queueLength,
      resultsCount: results.length,
      activeCategory,
      examToken,
      examStatus: activeCategory !== "none" ? "PUBLISHED" : "CLOSED",
      results,
      questionsAfkar,
      questionsQuran,
      message: clearTestData ? "Berhasil mengosongkan data simulasi test & reset anti double-submit!" : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat status admin." },
      { status: 500 }
    );
  }
}
