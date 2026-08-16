import { createClient } from "@supabase/supabase-js";
import { Question, ExamResult, EXAM_CATEGORIES } from "./constants";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasSupabase = Boolean(supabaseUrl && supabaseKey);

export const supabase = hasSupabase
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

// Local Memory Database Fallback for Published Questions, Results, & Dynamic Exam Token
class LocalDatabase {
  // Questions mapped by kategori (e.g. "afkar" -> Question[], "quran" -> Question[])
  private questionsMap: Record<string, Question[]> = {};
  // Answer keys mapped by kategori -> (qId -> key)
  private answerKeysMap: Record<string, Record<string, "A" | "B" | "C" | "D">> = {};
  private results: ExamResult[] = [];

  // Currently Active Category controlled by Admin (e.g. "afkar" on Day 1, "quran" on Day 2, or "none")
  private activeCategory: string = "afkar";

  // Dynamic Exam Token configurable from Admin Panel
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

    // Build answer key maps
    Object.keys(this.questionsMap).forEach((cat) => {
      this.answerKeysMap[cat] = {};
      this.questionsMap[cat].forEach((q) => {
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
    this.questionsMap[kategori] = newQuestions.map((q) => ({
      ...q,
      kategori,
    }));

    this.answerKeysMap[kategori] = {};
    newQuestions.forEach((q) => {
      if (q.answerKey) this.answerKeysMap[kategori][q.id.toString()] = q.answerKey;
    });
  }

  saveResults(newResults: ExamResult[]) {
    this.results = [...this.results, ...newResults];
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
