import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { SubmissionPayload, EXAM_CATEGORIES } from "@/lib/constants";
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

    // 4. Ingestion to Redis Queue
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
