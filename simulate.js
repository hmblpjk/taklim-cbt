/**
 * TAKLIM CBT - SIMULATOR LOAD TEST 5.000 PESERTA
 * 
 * Penggunaan:
 * node simulate.js [TARGET_URL] [JUMLAH_PESERTA] [TOKEN] [KATEGORI]
 * 
 * Contoh Target Lokal:
 * node simulate.js http://localhost:3000/api/exam/submit 1000 TAKLIM2026 afkar
 * 
 * Contoh Target Production (Vercel / Subdomain):
 * node simulate.js https://cbt.hmblpjk.my.id/api/exam/submit 5000 TAKLIM2026 afkar
 */

const http = require("http");
const https = require("https");

const targetUrl = process.argv[2] || "http://localhost:3000/api/exam/submit";
const totalParticipants = parseInt(process.argv[3] || "1000", 10);
const examToken = process.argv[4] || "TAKLIM2026";
const examCategory = process.argv[5] || "afkar";

const BATCH_SIZE = 50; // Requests per concurrent batch

const mabnaList = [
  "Al-Farabi", "Ibn Khaldun", "Al-Muhasibi", "Ibn Sina", "Ibn Rusyd",
  "Al-Ghazali", "Khadijah Al-Kubra", "Fatimah Az-Zahra", "Asma binti Abi Bakr"
];

function generatePayload(idx) {
  const nim = (230605110000 + idx).toString();
  const mabna = mabnaList[idx % mabnaList.length];
  const options = ["A", "B", "C", "D"];
  
  const answers = {};
  for (let q = 1; q <= 20; q++) {
    answers[q] = options[Math.floor(Math.random() * options.length)];
  }

  return {
    nama: `Mahasantri Simulasi #${idx}`,
    nim: nim,
    mabna: mabna,
    token: examToken,
    kategori: examCategory,
    answers: answers,
    tabSwitches: Math.floor(Math.random() * 2),
    durationSeconds: 1200 + Math.floor(Math.random() * 600),
    submittedAt: new Date().toISOString(),
  };
}

function sendRequest(urlStr, payload) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const data = JSON.stringify(payload);
    const parsedUrl = new URL(urlStr);
    const requestModule = parsedUrl.protocol === "https:" ? https : http;

    const req = requestModule.request(
      parsedUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            latencyMs: Date.now() - startTime,
            success: res.statusCode === 200,
          });
        });
      }
    );

    req.on("error", (err) => {
      resolve({
        status: 500,
        latencyMs: Date.now() - startTime,
        success: false,
        error: err.message,
      });
    });

    req.write(data);
    req.end();
  });
}

async function run() {
  console.log("==========================================================");
  console.log("🚀 TAKLIM CBT - MEMULAI SIMULASI LOAD TEST PESERTA");
  console.log("==========================================================");
  console.log(`📌 Target Endpoint : ${targetUrl}`);
  console.log(`👥 Jumlah Peserta   : ${totalParticipants} Mahasantri`);
  console.log(`🔑 Token Ujian      : ${examToken}`);
  console.log(`📚 Bidang Taklim    : ${examCategory.toUpperCase()}`);
  console.log("----------------------------------------------------------\n");

  const startTime = Date.now();
  let successCount = 0;
  let failedCount = 0;
  let totalLatency = 0;

  const totalBatches = Math.ceil(totalParticipants / BATCH_SIZE);

  for (let b = 0; b < totalBatches; b++) {
    const startIdx = b * BATCH_SIZE + 1;
    const endIdx = Math.min((b + 1) * BATCH_SIZE, totalParticipants);
    const promises = [];

    for (let i = startIdx; i <= endIdx; i++) {
      const payload = generatePayload(i);
      promises.push(sendRequest(targetUrl, payload));
    }

    const results = await Promise.all(promises);

    results.forEach((r) => {
      if (r.success) {
        successCount++;
      } else {
        failedCount++;
      }
      totalLatency += r.latencyMs;
    });

    const progress = Math.round((endIdx / totalParticipants) * 100);
    console.log(`⚡ Batch ${b + 1}/${totalBatches} (${startIdx}-${endIdx}) | Progress: ${progress}% | Sukses: ${successCount}`);
  }

  const totalTimeMs = Date.now() - startTime;
  const avgLatency = Math.round(totalLatency / totalParticipants);
  const rps = Math.round((totalParticipants / totalTimeMs) * 1000);

  console.log("\n==========================================================");
  console.log("📊 HASIL AKHIR SIMULASI LOAD TEST");
  console.log("==========================================================");
  console.log(`✅ Total Request Berhasil : ${successCount} (${((successCount / totalParticipants) * 100).toFixed(2)}%)`);
  console.log(`❌ Total Request Gagal    : ${failedCount} (${((failedCount / totalParticipants) * 100).toFixed(2)}%)`);
  console.log(`⏱️ Total Waktu Ingestion  : ${(totalTimeMs / 1000).toFixed(2)} Detik`);
  console.log(`⚡ Rata-rata Latensi      : ${avgLatency} ms / request`);
  console.log(`🔥 Ingestion Throughput   : ${rps} Request / Detik`);
  console.log("==========================================================");
}

run();
