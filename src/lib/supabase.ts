import { createClient } from "@supabase/supabase-js";
import { Question, ExamResult, EXAM_CATEGORIES } from "./constants";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasSupabase = Boolean(
  supabaseUrl && 
  supabaseKey && 
  !supabaseUrl.includes("your-project-id") && 
  !supabaseKey.includes("your_supabase")
);

export const supabase = hasSupabase
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

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
    this.syncFromSupabase();
  }

  private rebuildAnswerKeys() {
    Object.keys(this.questionsMap).forEach((cat) => {
      this.answerKeysMap[cat] = {};
      (this.questionsMap[cat] || []).forEach((q) => {
        if (q.answerKey) this.answerKeysMap[cat][q.id.toString()] = q.answerKey;
      });
    });
  }

  // Load existing questions and results from Supabase PostgreSQL if connected
  async syncFromSupabase() {
    if (!supabase) return;
    try {
      // 1. Fetch questions from Supabase
      const { data: dbQuestions, error: qErr } = await supabase
        .from("exam_questions")
        .select("*");

      if (!qErr && dbQuestions && dbQuestions.length > 0) {
        const newMap: Record<string, Question[]> = { afkar: [], quran: [] };
        dbQuestions.forEach((row: any) => {
          const cat = row.category_id || "afkar";
          if (!newMap[cat]) newMap[cat] = [];
          newMap[cat].push({
            id: row.question_number,
            question: row.question_text,
            options: row.options,
            answerKey: row.answer_key,
            kategori: cat,
          });
        });

        Object.keys(newMap).forEach((cat) => {
          if (newMap[cat].length > 0) {
            newMap[cat].sort((a, b) => a.id - b.id);
            this.questionsMap[cat] = newMap[cat];
          }
        });
        this.rebuildAnswerKeys();
      }

      // 2. Fetch results from Supabase
      const { data: dbResults, error: rErr } = await supabase
        .from("exam_results")
        .select("*");

      if (!rErr && dbResults && dbResults.length > 0) {
        this.results = dbResults.map((row: any) => ({
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
      }
    } catch (e) {
      console.warn("Supabase sync warning:", e);
    }
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

  getQuestions(kategori?: string): Question[] {
    const targetCat = kategori || this.activeCategory;
    return this.questionsMap[targetCat] || [];
  }

  getPublicQuestions(kategori?: string): Question[] {
    const targetCat = kategori || this.activeCategory;
    const questions = this.questionsMap[targetCat] || [];
    return questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      kategori: q.kategori,
    }));
  }

  getAnswerKeys(kategori?: string): Record<string, "A" | "B" | "C" | "D"> {
    const targetCat = kategori || this.activeCategory;
    return this.answerKeysMap[targetCat] || {};
  }

  saveQuestions(kategori: string, newQuestions: Question[]) {
    this.questionsMap[kategori] = newQuestions.map((q, idx) => ({
      ...q,
      id: q.id || idx + 1,
      kategori,
    }));

    this.rebuildAnswerKeys();

    // Persist to Supabase if connected
    if (supabase) {
      const rows = newQuestions.map((q, idx) => ({
        category_id: kategori,
        question_number: q.id || idx + 1,
        question_text: q.question,
        options: q.options,
        answer_key: q.answerKey || "A",
      }));

      supabase
        .from("exam_questions")
        .upsert(rows, { onConflict: "category_id,question_number" })
        .then(({ error }) => {
          if (error) console.error("Gagal simpan soal ke Supabase:", error);
        });
    }
  }

  saveResults(newResults: ExamResult[]) {
    this.results = [...this.results, ...newResults];

    // Persist to Supabase if connected
    if (supabase) {
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

      supabase
        .from("exam_results")
        .upsert(rows, { onConflict: "nim,kategori" })
        .then(({ error }) => {
          if (error) console.error("Gagal simpan hasil ke Supabase:", error);
        });
    }
  }

  getResults(kategoriFilter?: string): ExamResult[] {
    if (!kategoriFilter || kategoriFilter === "all") {
      return this.results;
    }
    return this.results.filter((r) => r.kategori === kategoriFilter);
  }

  clearResults(kategoriFilter?: string) {
    if (!kategoriFilter || kategoriFilter === "all") {
      this.results = [];
    } else {
      this.results = this.results.filter((r) => r.kategori !== kategoriFilter);
    }
  }

  getTotalQuestionsCountMap(): Record<string, number> {
    const map: Record<string, number> = {};
    EXAM_CATEGORIES.forEach((c) => {
      map[c.id] = (this.questionsMap[c.id] || []).length;
    });
    return map;
  }
}

const globalForDb = globalThis as unknown as { localDb?: LocalDatabase };
export const localDb = globalForDb.localDb || new LocalDatabase();
if (process.env.NODE_ENV !== "production") globalForDb.localDb = localDb;
