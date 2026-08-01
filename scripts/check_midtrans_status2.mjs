import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import pkg from "midtrans-client";
const { CoreApi } = pkg;

// Load .env.local manual (Node tak auto-load)
const envPath = path.resolve(".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
console.log("Server key loaded:", SERVER_KEY ? `ya (${SERVER_KEY.length} chars)` : "TIDAK");
console.log("Client key loaded:", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ? "ya" : "TIDAK");

if (SERVER_KEY) {
  const core = new CoreApi({
    isProduction: false,
    serverKey: SERVER_KEY,
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "",
  });
  try {
    const status = await core.transaction.status("book-35730f0b-1785591304350");
    console.log("\nMidtrans status:", JSON.stringify({
      order_id: status.order_id,
      transaction_status: status.transaction_status,
      fraud_status: status.fraud_status,
      payment_type: status.payment_type,
      transaction_id: status.transaction_id,
      gross_amount: status.gross_amount,
      status_code: status.status_code,
    }, null, 1));
  } catch (e) {
    console.log("\nMidtrans status error:", e.message, e.httpStatusCode || "");
  }
} else {
  console.log("Tidak bisa cek status — server key kosong");
}
