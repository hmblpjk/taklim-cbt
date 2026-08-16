import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { localDb } from "@/lib/supabase";
import { SubmissionPayload, ExamResult, EXAM_CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (password !== adminPassword) {
      return NextResponse.json(
        { success: false, message: "Password Admin salah." },
        { status: 401 }
      );
    }

    let processedCount = 0;
    const newResults: ExamResult[] = [];

    // Drain queue items
    while (true) {
      const itemStr = await redis.rpop("exam_submission_queue");
      if (!itemStr) break;

      let payload: SubmissionPayload;
      try {
        payload = JSON.parse(itemStr);
      } catch (e) {
        continue;
      }

      const itemCategory = payload.kategori || "afkar";
      const catObj = EXAM_CATEGORIES.find((c) => c.id === itemCategory);
      const kategoriName = payload.kategoriName || (catObj ? catObj.name : itemCategory);

      const answerKeys = await localDb.getAnswerKeys(itemCategory);
      const questions = await localDb.getQuestions(itemCategory);
      const totalQuestionsCount = questions.length;

      // Calculate score
      let score = 0;
      const candidateAnswers = payload.answers || {};

      Object.entries(answerKeys).forEach(([qId, correctKey]) => {
        const candidateChoice = candidateAnswers[qId];
        if (candidateChoice && candidateChoice.toUpperCase() === correctKey.toUpperCase()) {
          score += 1;
        }
      });

      const percentage = totalQuestionsCount > 0
        ? Math.round((score / totalQuestionsCount) * 100)
        : 0;

      newResults.push({
        nim: payload.nim,
        nama: payload.nama,
        mabna: payload.mabna,
        kategori: itemCategory,
        kategoriName,
        score,
        totalQuestions: totalQuestionsCount,
        percentage,
        tabSwitches: payload.tabSwitches || 0,
        durationSeconds: payload.durationSeconds || 0,
        submittedAt: payload.submittedAt || new Date().toISOString(),
        answers: candidateAnswers,
      });

      processedCount++;
    }

    if (newResults.length > 0) {
      await localDb.saveResults(newResults);
    }

    const currentResults = await localDb.getResults();

    return NextResponse.json({
      success: true,
      processedCount,
      totalAccumulatedResults: currentResults.length,
      results: currentResults,
      message: `Berhasil memproses & merekap ${processedCount} lembar jawaban dari antrean Redis!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memproses antrean nilai." },
      { status: 500 }
    );
  }
}
