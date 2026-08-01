import { Snap, CoreApi } from "midtrans-client";
import type { CustomerDetails, ItemDetails } from "midtrans-client";

let snapInstance: Snap | null = null;
let coreInstance: CoreApi | null = null;

function isConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY && process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY);
}

function getSnap(): Snap {
  if (!isConfigured()) {
    throw new Error("Midtrans belum dikonfigurasi. Isi MIDTRANS_SERVER_KEY dan NEXT_PUBLIC_MIDTRANS_CLIENT_KEY di .env.local");
  }
  if (!snapInstance) {
    snapInstance = new Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
    });
  }
  return snapInstance;
}

function getCore(): CoreApi {
  if (!isConfigured()) {
    throw new Error("Midtrans belum dikonfigurasi. Isi MIDTRANS_SERVER_KEY dan NEXT_PUBLIC_MIDTRANS_CLIENT_KEY di .env.local");
  }
  if (!coreInstance) {
    coreInstance = new CoreApi({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
    });
  }
  return coreInstance;
}

export interface CreateTransactionParams {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  itemName: string;
  itemQty?: number;
}

export async function createSnapTransaction(params: CreateTransactionParams) {
  const snap = getSnap();
  const customerDetails: CustomerDetails = {
    first_name: params.customerName,
    email: params.customerEmail,
  };
  // SDK Midtrans lempar error kalau phone kosong string — ommit kalau tak ada
  if (params.customerPhone) {
    customerDetails.phone = params.customerPhone;
  }

  // item_details: 1 item mewakili SELURUH booking (qty=1, price=total)
  // quantity TIDAK dipakai untuk duration_months — itu menyebabkan
  // gross_amount != sum(item.price × item.quantity) → ditolak Midtrans.
  const itemDetails: ItemDetails[] = [
    {
      id: params.orderId.slice(0, 20),
      price: Math.round(params.grossAmount),
      quantity: 1,
      name: params.itemName,
    },
  ];

  // Hitung gross_amount DARI item_details — dijamin sinkron, tak mungkin mismatch
  const grossAmount = itemDetails.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // ASSERT pre-kirim: kalau sum item ≠ gross yang diminta, tolak sebelum ke Midtrans
  if (grossAmount !== Math.round(params.grossAmount)) {
    const errMsg = `Mismatch pembayaran: gross_amount(${grossAmount}) != total booking(${params.grossAmount}). Tolong laporkan bug ini.`;
    console.error("[midtrans] PRE-SEND ASSERT FAIL:", JSON.stringify({ grossAmount, expected: params.grossAmount, itemDetails }, null, 2));
    throw new Error(errMsg);
  }

  return snap.createTransaction({
    transaction_details: {
      order_id: params.orderId,
      gross_amount: grossAmount,
    },
    item_details: itemDetails,
    customer_details: customerDetails,
    // enable_payments: biarkan default — Snap tampilkan semua metode
  });
}

export async function getTransactionStatus(orderId: string) {
  const core = getCore();
  return core.transaction.status(orderId);
}

export function isProduction(): boolean {
  return process.env.MIDTRANS_IS_PRODUCTION === "true";
}

export function getSnapScriptUrl(): string {
  return isProduction()
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

/**
 * Verifikasi signature key dari notifikasi Midtrans.
 * SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const crypto = require("crypto");
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const payload = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const hash = crypto.createHash("sha512").update(payload).digest("hex");
  return hash === signatureKey;
}
