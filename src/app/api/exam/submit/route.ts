import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { SubmissionPayload, ExamResult, EXAM_CATEGORIES } from "@/lib/constants";
import { localDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body: SubmissionPayload = await req.json();
    const { nama, nim, mabna, token, answers, tabSwitches, durationSeconds, kategori } = body;

    // 1. Basic Field Validation
    if (!nama || !nim || !mabna || !token) {
      return NextResponse.json(
        { success: false, message: "Lengkapi seluruh identitas (Nama, NIM, Mabna, dan Token)." },
        { status: 400 }
      );
    }

    const activeCat = kategori || localDb.getActiveCategory();
    const catObj = EXAM_CATEGORIES.find((c) => c.id === activeCat);
    const kategoriName = catObj ? catObj.name : activeCat;

    // 2. Verify Dynamic Exam Token from localDb
    const expectedToken = localDb.getExamToken();
    if (token.trim().toUpperCase() !== expectedToken.trim().toUpperCase()) {
      return NextResponse.json(
        { success: false, message: "Token Ujian tidak valid." },
        { status: 401 }
      );
    }

    const cleanNim = nim.trim();

    // 3. Anti Double-Submit Check per Category Redis Set
    const redisSetKey = `submitted_nims_${activeCat}`;
    const alreadySubmitted = await redis.sismember(redisSetKey, cleanNim);
    if (alreadySubmitted) {
      return NextResponse.json(
        {
          success: false,
          alreadySubmitted: true,
          message: `NIM ${cleanNim} sudah pernah mengumpulkan lembar jawaban untuk ${kategoriName}.`,
        },
        { status: 409 }
      );
    }

    // 4. Ingestion to Redis Queue & Mark Set
    const payload: SubmissionPayload = {
      nama: nama.trim(),
      nim: cleanNim,
      mabna: mabna.trim(),
      token: token.trim(),
      kategori: activeCat,
      kategoriName,
      answers: answers || {},
      tabSwitches: Number(tabSwitches) || 0,
      durationSeconds: Number(durationSeconds) || 0,
      submittedAt: new Date().toISOString(),
    };

    await redis.lpush("exam_submission_queue", JSON.stringify(payload));
    await redis.sadd(redisSetKey, cleanNim);

    // 5. Instantly calculate score and save to Supabase Database
    try {
      const answerKeys = await localDb.getAnswerKeys(activeCat);
      const questions = await localDb.getQuestions(activeCat);
      const totalQuestionsCount = questions.length || 2;

      let score = 0;
      const candidateAnswers = answers || {};
      Object.entries(answerKeys).forEach(([qId, correctKey]) => {
        const candidateChoice = candidateAnswers[qId];
        if (candidateChoice && candidateChoice.toString().toUpperCase() === correctKey.toString().toUpperCase()) {
          score += 1;
        }
      });

      const percentage = totalQuestionsCount > 0
        ? Math.round((score / totalQuestionsCount) * 100)
        : 0;

      const result: ExamResult = {
        nim: cleanNim,
        nama: nama.trim(),
        mabna: mabna.trim(),
        kategori: activeCat,
        kategoriName,
        score,
        totalQuestions: totalQuestionsCount,
        percentage,
        tabSwitches: Number(tabSwitches) || 0,
        durationSeconds: Number(durationSeconds) || 0,
        submittedAt: payload.submittedAt,
        answers: candidateAnswers,
      };

      await localDb.saveResults([result]);
    } catch (saveErr) {
      console.warn("Direct Supabase save warning:", saveErr);
    }

    const executionMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Lembar jawaban ${kategoriName} berhasil dikumpulkan!`,
      executionMs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengumpulkan lembar jawaban." },
      { status: 500 }
    );
  }
}
