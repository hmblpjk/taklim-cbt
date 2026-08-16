import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { localDb } from "@/lib/supabase";
import { EXAM_CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}

export async function POST(req: NextRequest) {
  try {
    const { nim, token } = await req.json();

    if (!nim || !nim.trim()) {
      return NextResponse.json(
        { success: false, message: "Silakan isi NIM Anda." },
        { status: 400 }
      );
    }

    if (!token || !token.trim()) {
      return NextResponse.json(
        { success: false, message: "Silakan masukkan Token Ujian." },
        { status: 400 }
      );
    }

    // 1. Verify Active Category
    const activeCategory = localDb.getActiveCategory();
    if (!activeCategory || activeCategory === "none") {
      return NextResponse.json(
        { success: false, message: "Saat ini tidak ada sesi ujian yang sedang dibuka oleh panitia." },
        { status: 403 }
      );
    }

    const catObj = EXAM_CATEGORIES.find((c) => c.id === activeCategory);
    const kategoriName = catObj ? catObj.name : activeCategory;

    // 2. Verify Dynamic Exam Token from localDb
    const expectedToken = localDb.getExamToken();
    if (token.trim().toUpperCase() !== expectedToken.trim().toUpperCase()) {
      return NextResponse.json(
        { success: false, message: "Token Ujian salah! Silakan minta token yang benar kepada panitia." },
        { status: 401 }
      );
    }

    const cleanNim = nim.trim();

    // 3. Anti Double-Submit Check Per Category Redis Set `submitted_nims_[kategori]`
    const redisSetKey = `submitted_nims_${activeCategory}`;
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

    return NextResponse.json({
      success: true,
      activeCategory,
      kategoriName,
      message: `Token valid. Selamat mengerjakan ${kategoriName}!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memverifikasi token." },
      { status: 500 }
    );
  }
}
