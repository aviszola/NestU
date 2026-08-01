import { Snap, CoreApi } from "midtrans-client";
import type { CustomerDetails } from "midtrans-client";

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
  itemQty: number;
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

  return snap.createTransaction({
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.grossAmount,
    },
    item_details: [
      {
        id: params.orderId.slice(0, 20),
        price: params.grossAmount,
        quantity: params.itemQty || 1,
        name: params.itemName,
      },
    ],
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
