import { Question } from "./constants";

// Simple string hash function to generate numeric seed from NIM
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) || 12345;
}

// Mulberry32 PRNG
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RandomizedQuestion extends Question {
  originalId: number;
  displayOptions: {
    displayKey: "A" | "B" | "C" | "D";
    originalKey: "A" | "B" | "C" | "D";
    text: string;
  }[];
}

/**
 * Deterministically shuffles questions and their options based on NIM seed.
 */
export function shuffleQuestionsForNim(
  questions: Question[],
  nim: string
): RandomizedQuestion[] {
  const seed = hashString(nim.trim());
  const random = mulberry32(seed);

  // Deep clone questions
  const clone: Question[] = JSON.parse(JSON.stringify(questions));

  // Fisher-Yates shuffle questions
  for (let i = clone.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }

  const keys: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];

  return clone.map((q) => {
    const shuffledOpts = [...q.options];
    for (let i = shuffledOpts.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffledOpts[i], shuffledOpts[j]] = [shuffledOpts[j], shuffledOpts[i]];
    }

    const displayOptions = shuffledOpts.map((opt, idx) => ({
      displayKey: keys[idx],
      originalKey: opt.key,
      text: opt.text,
    }));

    return {
      ...q,
      originalId: q.id,
      displayOptions,
    };
  });
}
