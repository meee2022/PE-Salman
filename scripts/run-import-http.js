/**
 * HTTP-based data migration runner for PE supervision system.
 *
 * Uses the Convex HTTP API directly (no CLI subprocess).
 * Calls activity:importSupervisorLogs per supervisor.
 *
 * Run with: node scripts/run-import-http.js
 */
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const DATA_PATH = path.join(__dirname, "activity-import.json");
const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

// Load env file to get Convex URL
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Remove inline comment
    const hashIdx = val.indexOf(" #");
    if (hashIdx !== -1) val = val.slice(0, hashIdx).trim();
    env[key] = val;
  }
  return env;
}

const env = loadEnv();
const CONVEX_URL = env.NEXT_PUBLIC_CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || "https://brazen-ox-309.convex.cloud";
// HTTP API endpoint for mutations
const MUTATION_URL = `${CONVEX_URL}/api/mutation`;

console.log("=== PE Activity Data Migration (HTTP) ===");
console.log(`Logs: ${data.logs.length} | Supervisors: ${data.supervisors.length}`);
console.log(`Convex URL: ${CONVEX_URL}\n`);

function httpRequest(urlStr, payload) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new url.URL(urlStr);
    const bodyStr = JSON.stringify(payload);
    const isHttps = parsedUrl.protocol === "https:";
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    };

    const mod = isHttps ? https : http;
    const req = mod.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === "success") {
            resolve(parsed.value);
          } else {
            reject(new Error(parsed.errorMessage || JSON.stringify(parsed)));
          }
        } catch (e) {
          reject(new Error(`JSON parse error: ${data.slice(0, 300)}`));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.write(bodyStr);
    req.end();
  });
}

function callMutation(path, args) {
  return httpRequest(MUTATION_URL, {
    path,
    args,
    format: "json",
  });
}

async function main() {
  // Group logs by supervisor seq
  const bySeq = {};
  for (const log of data.logs) {
    if (!bySeq[log.supervisorSeq]) bySeq[log.supervisorSeq] = [];
    bySeq[log.supervisorSeq].push(log);
  }

  let totalInserted = 0;
  let totalUpdated = 0;
  let failed = 0;

  for (const sup of data.supervisors) {
    const logs = bySeq[sup.seq] || [];
    if (logs.length === 0) {
      console.log(`  [${sup.seq}] ${sup.name}: no logs, skipping`);
      continue;
    }

    const logArgs = logs.map((l) => ({
      date: l.date,
      code: l.code,
      ...(l.notes ? { note: l.notes } : {}),
    }));

    try {
      const result = await callMutation("activity:importSupervisorLogs", {
        supervisorName: sup.name,
        academicYear: data.academicYear,
        logs: logArgs,
        token: "SEED_BYPASS_TOKEN",
      });
      console.log(`  [${sup.seq}] ${sup.name}: inserted=${result.inserted} updated=${result.updated}`);
      totalInserted += result.inserted || 0;
      totalUpdated += result.updated || 0;
    } catch (err) {
      console.error(`  [${sup.seq}] ${sup.name}: FAILED - ${err.message.slice(0, 300)}`);
      failed++;
    }
  }

  console.log("\n=== Migration Complete ===");
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total updated:  ${totalUpdated}`);
  console.log(`Grand total:    ${totalInserted + totalUpdated}`);
  if (failed > 0) console.log(`Failed: ${failed} supervisors`);

  // Recompute summaries
  console.log("\nRecomputing summaries...");
  try {
    const recomputed = await callMutation("activity:recomputeAllSummaries", {
      academicYear: data.academicYear,
      token: "SEED_BYPASS_TOKEN",
    });
    console.log("Summaries recomputed for supervisors:", recomputed);
  } catch (err) {
    console.error("Recompute failed:", err.message.slice(0, 300));
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
