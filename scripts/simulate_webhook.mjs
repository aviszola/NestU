import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
const envPath = path.resolve(".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
console.log("Server key tersedia:", SERVER_KEY ? "YA" : "TIDAK (kosong di .env.local)");

if (!SERVER_KEY) {
  console.log("Tidak bisa kirim webhook simulasi — butuh server key dari Vercel env");
  process.exit(0);
}

// Simulasi webhook settlement untuk booking 35730f0b
const orderId = "book-35730f0b-1785591304350";
const statusCode = "200";
const grossAmount = "9630000";
const signatureKey = crypto
  .createHash("sha512")
  .update(orderId + statusCode + grossAmount + SERVER_KEY)
  .digest("hex");

const payload = {
  transaction_time: new Date().toISOString(),
  transaction_status: "settlement",
  transaction_id: "7a49d094-31d6-48e8-9399-292002b838d7",
  status_code: statusCode,
  gross_amount: grossAmount,
  signature_key: signatureKey,
  order_id: orderId,
  payment_type: "bank_transfer",
  fraud_status: "accept",
};

console.log("Mengirim webhook settlement simulasi ke production...");
const res = await fetch("https://nets-u.vercel.app/api/payment/webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
console.log("Status:", res.status);
console.log("Body:", await res.text());
