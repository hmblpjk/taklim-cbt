import * as XLSX from "xlsx";
import { Question, ExamResult, EXAM_CATEGORIES } from "./constants";

export interface ExcelValidationError {
  row: number;
  message: string;
}

export function parseExcelQuestions(arrayBuffer: ArrayBuffer, defaultKategori: string = "afkar"): {
  questions: Question[];
  errors: ExcelValidationError[];
} {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);
  const questions: Question[] = [];
  const errors: ExcelValidationError[] = [];

  rawData.forEach((row, index) => {
    const rowNum = index + 2; // header is row 1
    
    // Normalize keys
    const nomor = row.nomor || row.Nomor || row.no || row.No || (index + 1);
    const pertanyaan = (row.pertanyaan || row.Pertanyaan || row.soal || row.Soal || "").toString().trim();
    const optA = (row.pilihan_a || row.Pilihan_A || row.a || row.A || "").toString().trim();
    const optB = (row.pilihan_b || row.Pilihan_B || row.b || row.B || "").toString().trim();
    const optC = (row.pilihan_c || row.Pilihan_C || row.c || row.C || "").toString().trim();
    const optD = (row.pilihan_d || row.Pilihan_D || row.d || row.D || "").toString().trim();
    const kunci = (row.kunci_jawaban || row.Kunci_Jawaban || row.kunci || row.Kunci || "").toString().trim().toUpperCase();

    if (!pertanyaan) {
      errors.push({ row: rowNum, message: "Pertanyaan tidak boleh kosong" });
    }
    if (!optA || !optB || !optC || !optD) {
      errors.push({ row: rowNum, message: "Seluruh Pilihan A, B, C, dan D wajib diisi" });
    }
    if (!["A", "B", "C", "D"].includes(kunci)) {
      errors.push({ row: rowNum, message: `Kunci jawaban harus A, B, C, atau D (Ditemukan: "${kunci}")` });
    }

    if (errors.length === 0 || errors.every(e => e.row !== rowNum)) {
      questions.push({
        id: Number(nomor) || (index + 1),
        question: pertanyaan,
        options: [
          { key: "A", text: optA },
          { key: "B", text: optB },
          { key: "C", text: optC },
          { key: "D", text: optD },
        ],
        answerKey: kunci as "A" | "B" | "C" | "D",
        kategori: defaultKategori,
      });
    }
  });

  return { questions, errors };
}

export function generateTemplateExcel(): Blob {
  const sampleData = [
    {
      nomor: 1,
      pertanyaan: "Apakah rukun Islam yang pertama?",
      pilihan_a: "Mengucapkan Dua Kalimat Syahadat",
      pilihan_b: "Mendirikan Shalat",
      pilihan_c: "Menunaikan Zakat",
      pilihan_d: "Menjalankan Puasa Ramadan",
      kunci_jawaban: "A",
    },
    {
      nomor: 2,
      pertanyaan: "Berapakah jumlah rakaat shalat Subuh?",
      pilihan_a: "3 Rakaat",
      pilihan_b: "4 Rakaat",
      pilihan_c: "2 Rakaat",
      pilihan_d: "1 Rakaat",
      kunci_jawaban: "C",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Soal");
  
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function exportResultsToExcel(
  results: ExamResult[],
  totalQuestionsCountMap: Record<string, number>,
  kategoriFilter?: string
): Blob {
  const workbook = XLSX.utils.book_new();

  const categoriesToExport = kategoriFilter && kategoriFilter !== "all"
    ? EXAM_CATEGORIES.filter((c) => c.id === kategoriFilter)
    : EXAM_CATEGORIES;

  // Generate a sheet per category
  categoriesToExport.forEach((cat) => {
    const catResults = results.filter((r) => r.kategori === cat.id);
    const totalQCount = totalQuestionsCountMap[cat.id] || 0;

    const sheetRows = catResults.map((res, idx) => {
      const rowObj: Record<string, any> = {
        No: idx + 1,
        NIM: res.nim,
        Nama: res.nama,
        Mabna: res.mabna,
        "Bidang Taklim": res.kategoriName || cat.name,
        "Total Skor": res.score,
        "Total Soal": res.totalQuestions || totalQCount,
        "Persentase (%)": `${res.percentage}%`,
        "Tab Switch (Kali)": res.tabSwitches,
        "Durasi (Menit)": Math.round(res.durationSeconds / 60),
        "Waktu Submit": res.submittedAt ? new Date(res.submittedAt).toLocaleString("id-ID") : "-",
      };

      // Add per question columns Q1, Q2, Q3 ...
      const qCount = res.totalQuestions || totalQCount;
      for (let q = 1; q <= qCount; q++) {
        rowObj[`Q${q}`] = res.answers[q] || "-";
      }

      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(
      sheetRows.length > 0
        ? sheetRows
        : [
            {
              No: "-",
              NIM: "-",
              Nama: "Belum Ada Data Peserta",
              Mabna: "-",
              "Bidang Taklim": cat.name,
              "Total Skor": 0,
            },
          ]
    );

    XLSX.utils.book_append_sheet(workbook, worksheet, cat.name.replace(/[\/\\\?\*\[\]]/g, ""));
  });

  // Also append all combined results sheet if exporting all
  if (!kategoriFilter || kategoriFilter === "all") {
    const allRows = results.map((res, idx) => {
      const rowObj: Record<string, any> = {
        No: idx + 1,
        NIM: res.nim,
        Nama: res.nama,
        Mabna: res.mabna,
        "Bidang Taklim": res.kategoriName,
        "Total Skor": res.score,
        "Total Soal": res.totalQuestions,
        "Persentase (%)": `${res.percentage}%`,
        "Tab Switch (Kali)": res.tabSwitches,
        "Durasi (Menit)": Math.round(res.durationSeconds / 60),
        "Waktu Submit": res.submittedAt ? new Date(res.submittedAt).toLocaleString("id-ID") : "-",
      };
      for (let q = 1; q <= res.totalQuestions; q++) {
        rowObj[`Q${q}`] = res.answers[q] || "-";
      }
      return rowObj;
    });

    if (allRows.length > 0) {
      const allWorksheet = XLSX.utils.json_to_sheet(allRows);
      XLSX.utils.book_append_sheet(workbook, allWorksheet, "Semua Hasil Combined");
    }
  }

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
