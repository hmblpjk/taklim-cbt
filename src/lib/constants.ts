export const MABNA_LIST = [
  "Al-Farabi",
  "Ibn Khaldun",
  "Al-Muhasibi",
  "Ibn Sina",
  "Ibn Rusyd",
  "Al-Ghazali",
  "Khadijah Al-Kubra",
  "Fatimah Az-Zahra",
  "Asma binti Abi Bakr",
  "Ummu Salamah",
  "Ar-Razi",
  "Al-Khawarizmi",
  "Rabi'ah Al-Adawiyah"
];

export interface ExamCategoryOption {
  id: string;
  name: string;
  code: string;
}

export const EXAM_CATEGORIES: ExamCategoryOption[] = [
  { id: "afkar", name: "Taklim Afkar", code: "AFKAR" },
  { id: "quran", name: "Taklim Al-Qur'an", code: "QURAN" },
];

export interface Question {
  id: number;
  question: string;
  options: {
    key: "A" | "B" | "C" | "D";
    text: string;
  }[];
  // Correct key answer only stored in admin key storage, excluded in public payload
  answerKey?: "A" | "B" | "C" | "D";
  kategori?: string;
}

export interface CandidateIdentity {
  nama: string;
  nim: string;
  mabna: string;
  token: string;
  kategori?: string;
  kategoriName?: string;
}

export interface SubmissionPayload {
  nama: string;
  nim: string;
  mabna: string;
  token: string;
  kategori: string;
  kategoriName: string;
  answers: Record<string, "A" | "B" | "C" | "D">;
  tabSwitches: number;
  durationSeconds: number;
  submittedAt: string;
}

export interface ExamResult {
  nim: string;
  nama: string;
  mabna: string;
  kategori: string;
  kategoriName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  tabSwitches: number;
  durationSeconds: number;
  submittedAt: string;
  answers: Record<string, "A" | "B" | "C" | "D">;
}
