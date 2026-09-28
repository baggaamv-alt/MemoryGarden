// Creates (or signs in to) the demo caregiver account and a demo patient profile through the
// running app's own API. Usage: `npm run dev` in one terminal, then `npm run seed:demo`.
// Credentials come from .env.local / .env.example (DEMO_CAREGIVER_EMAIL / DEMO_CAREGIVER_PASSWORD).
import fs from "node:fs";

function readEnv() {
  const env = {};
  for (const file of [".env.example", ".env.local"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && m[2]) env[m[1]] = m[2];
    }
  }
  return { ...env, ...process.env };
}

const env = readEnv();
const BASE = env.APP_URL || "http://localhost:3000";
const email = env.DEMO_CAREGIVER_EMAIL || "demo@memorygarden.test";
const password = env.DEMO_CAREGIVER_PASSWORD || "GardenDemo#2026";
let cookie = "";

async function call(path, body, method = body ? "POST" : "GET") {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", Origin: BASE, Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie?.() ?? [];
  for (const c of set) {
    const [pair] = c.split(";");
    const [name] = pair.split("=");
    cookie = [...cookie.split("; ").filter((x) => x && !x.startsWith(name + "=")), pair].join("; ");
  }
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

let r = await call("/api/auth/signup", { name: "Demo Caregiver", email, password });
if (r.status === 409) r = await call("/api/auth/login", { email, password });
if (r.status >= 400) {
  console.error("Could not sign in:", r.data);
  process.exit(1);
}
const list = await call("/api/caregiver/patients");
let patient = list.data.patients?.find((p) => p.addressAs === "Amma");
if (!patient) {
  const created = await call("/api/caregiver/patients", {
    name: "Lakshmi Devi",
    addressAs: "Amma",
    language: "en",
    relationship: "Daughter",
    hometown: "Guntur",
    starterPack: true,
  });
  patient = created.data;
}
console.log(`Demo caregiver: ${email}`);
console.log(`Demo patient: ${patient.id} (${patient.code ?? "existing"})`);
console.log(`Open ${BASE}/login, then upload photos under Memories.`);
