import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Question, ExamResult, EXAM_CATEGORIES } from "./constants";

export const getSupabase = (): SupabaseClient | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY;

  if (
    !url ||
    !key ||
    url.includes("your-project-id") ||
    key.includes("your_supabase")
  ) {
    return null;
  }
  try {
    return createClient(url, key, { auth: { persistSession: false } });
  } catch (e) {
    console.warn("Gagal inisialisasi Supabase client:", e);
    return null;
  }
};

class LocalDatabase {
  private questionsMap: Record<string, Question[]> = {};
  private answerKeysMap: Record<string, Record<string, "A" | "B" | "C" | "D">> = {};
  private results: ExamResult[] = [];
  private activeCategory: string = "afkar";
  private examToken: string = process.env.NEXT_PUBLIC_EXAM_TOKEN || "TAKLIM2026";

  constructor() {
    // Initial demo questions for Taklim Afkar
    this.questionsMap["afkar"] = [
      {
        id: 1,
        question: "[Taklim Afkar] Apakah rukun Islam yang pertama?",
        options: [
          { key: "A", text: "Mengucapkan Dua Kalimat Syahadat" },
          { key: "B", text: "Mendirikan Shalat 5 Waktu" },
          { key: "C", text: "Menunaikan Zakat Mal & Fitrah" },
          { key: "D", text: "Menjalankan Puasa di Bulan Ramadan" },
        ],
        answerKey: "A",
        kategori: "afkar",
      },
      {
        id: 2,
        question: "[Taklim Afkar] Berapakah jumlah rakaat shalat Subuh?",
        options: [
          { key: "A", text: "3 Rakaat" },
          { key: "B", text: "4 Rakaat" },
          { key: "C", text: "2 Rakaat" },
          { key: "D", text: "1 Rakaat" },
        ],
        answerKey: "C",
        kategori: "afkar",
      },
    ];

    // Initial demo questions for Taklim Al-Qur'an
    this.questionsMap["quran"] = [
      {
        id: 1,
        question: "[Taklim Qur'an] Surah apakah dalam Al-Qur'an yang dijuluki sebagai 'Ummul Qur'an'?",
        options: [
          { key: "A", text: "Surah Al-Ikhlas" },
          { key: "B", text: "Surah Al-Fatihah" },
          { key: "C", text: "Surah Yasin" },
          { key: "D", text: "Surah Al-Baqarah" },
        ],
        answerKey: "B",
        kategori: "quran",
      },
      {
        id: 2,
        question: "[Taklim Qur'an] Kitab suci Al-Qur'an diturunkan kepada Nabi...",
        options: [
          { key: "A", text: "Nabi Musa AS" },
          { key: "B", text: "Nabi Isa AS" },
          { key: "C", text: "Nabi Daud AS" },
          { key: "D", text: "Nabi Muhammad SAW" },
        ],
        answerKey: "D",
        kategori: "quran",
      },
    ];

    this.rebuildAnswerKeys();
  }

  private rebuildAnswerKeys() {
    Object.keys(this.questionsMap).forEach((cat) => {
      this.answerKeysMap[cat] = {};
      (this.questionsMap[cat] || []).forEach((q) => {
        if (q.answerKey) this.answerKeysMap[cat][q.id.toString()] = q.answerKey;
      });
    });
  }

  getExamToken(): string {
    return this.examToken;
  }

  setExamToken(newToken: string) {
    if (newToken && newToken.trim()) {
      this.examToken = newToken.trim().toUpperCase();
    }
  }

  getActiveCategory(): string {
    return this.activeCategory;
  }

  setActiveCategory(kategori: string) {
    this.activeCategory = kategori;
  }

  async getQuestions(kategori?: string): Promise<Question[]> {
    const targetCat = kategori || this.activeCategory;
    const client = getSupabase();
    if (client) {
      try {
        const { data, error } = await client
          .from("exam_questions")
          .select("*")
          .eq("category_id", targetCat)
          .order("question_number", { ascending: true });

        if (!error && data && data.length > 0) {
          const qList = data.map((row: any) => ({
            id: row.question_number,
            question: row.question_text,
            options: row.options,
            answerKey: row.answer_key,
            kategori: targetCat,
          }));
          this.questionsMap[targetCat] = qList;
          this.rebuildAnswerKeys();
          return qList;
        }
      } catch (e) {
        console.warn("Gagal fetch questions dari Supabase:", e);
      }
    }
    return this.questionsMap[targetCat] || [];
  }

  async getPublicQuestions(kategori?: string): Promise<Question[]> {
    const questions = await this.getQuestions(kategori);
    return questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      kategori: q.kategori,
    }));
  }

  async getAnswerKeys(kategori?: string): Promise<Record<string, "A" | "B" | "C" | "D">> {
    await this.getQuestions(kategori);
    const targetCat = kategori || this.activeCategory;
    return this.answerKeysMap[targetCat] || {};
  }

  async saveQuestions(kategori: string, newQuestions: Question[]): Promise<void> {
    this.questionsMap[kategori] = newQuestions.map((q, idx) => ({
      ...q,
      id: q.id || idx + 1,
      kategori,
    }));

    this.rebuildAnswerKeys();

    const client = getSupabase();
    if (client) {
      const rows = newQuestions.map((q, idx) => ({
        category_id: kategori,
        question_number: q.id || idx + 1,
        question_text: q.question,
        options: q.options,
        answer_key: q.answerKey || "A",
      }));

      const { error } = await client
        .from("exam_questions")
        .upsert(rows, { onConflict: "category_id,question_number" });

      if (error) console.error("Gagal simpan soal ke Supabase:", error);
    }
  }

  async saveResults(newResults: ExamResult[]): Promise<void> {
    this.results = [...this.results, ...newResults];

    const client = getSupabase();
    if (client) {
      const rows = newResults.map((r) => ({
        nim: r.nim,
        nama: r.nama,
        mabna: r.mabna,
        kategori: r.kategori,
        kategori_name: r.kategoriName,
        score: r.score,
        total_questions: r.totalQuestions,
        percentage: r.percentage,
        tab_switches: r.tabSwitches || 0,
        duration_seconds: r.durationSeconds || 0,
        answers: r.answers || {},
        submitted_at: r.submittedAt || new Date().toISOString(),
      }));

      const { error } = await client
        .from("exam_results")
        .upsert(rows, { onConflict: "nim,kategori" });

      if (error) {
        console.error("Gagal simpan hasil ke Supabase:", error);
      }
    }
  }

  async getResults(kategoriFilter?: string): Promise<ExamResult[]> {
    const client = getSupabase();
    if (client) {
      try {
        let query = client.from("exam_results").select("*");
        if (kategoriFilter && kategoriFilter !== "all") {
          query = query.eq("kategori", kategoriFilter);
        }
        const { data, error } = await query;
        if (!error && data) {
          const dbResults = data.map((row: any) => ({
            nim: row.nim,
            nama: row.nama,
            mabna: row.mabna,
            kategori: row.kategori,
            kategoriName: row.kategori_name,
            score: row.score,
            totalQuestions: row.total_questions,
            percentage: row.percentage,
            tabSwitches: row.tab_switches || 0,
            durationSeconds: row.duration_seconds || 0,
            submittedAt: row.submitted_at,
            answers: row.answers || {},
          }));
          this.results = dbResults;
          return dbResults;
        } else if (error) {
          console.warn("Supabase fetch results error:", error);
        }
      } catch (e) {
        console.warn("Gagal fetch results dari Supabase:", e);
      }
    }

    if (!kategoriFilter || kategoriFilter === "all") {
      return this.results;
    }
    return this.results.filter((r) => r.kategori === kategoriFilter);
  }

  async clearResults(kategoriFilter?: string): Promise<void> {
    const client = getSupabase();
    if (!kategoriFilter || kategoriFilter === "all") {
      this.results = [];
      if (client) {
        await client.from("exam_results").delete().neq("id", 0);
      }
    } else {
      this.results = this.results.filter((r) => r.kategori !== kategoriFilter);
      if (client) {
        await client.from("exam_results").delete().eq("kategori", kategoriFilter);
      }
    }
  }

  async getTotalQuestionsCountMap(): Promise<Record<string, number>> {
    const map: Record<string, number> = {};
    for (const c of EXAM_CATEGORIES) {
      const qs = await this.getQuestions(c.id);
      map[c.id] = qs.length;
    }
    return map;
  }
}

const globalForDb = globalThis as unknown as { localDb?: LocalDatabase };
export const localDb = globalForDb.localDb || new LocalDatabase();
if (process.env.NODE_ENV !== "production") globalForDb.localDb = localDb;
