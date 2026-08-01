declare module "midtrans-client" {
  export interface SnapOptions {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  export interface CoreOptions {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  export interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  export interface ItemDetails {
    id: string;
    price: number;
    quantity: number;
    name: string;
  }

  export interface CustomerDetails {
    first_name: string;
    email: string;
    phone?: string;
  }

  export interface CreateTransactionParams {
    transaction_details: TransactionDetails;
    item_details: ItemDetails[];
    customer_details: CustomerDetails;
  }

  export interface CreateTransactionResult {
    token: string;
    redirect_url: string;
  }

  export interface TransactionStatusResult {
    transaction_status: string;
    fraud_status?: string;
    status_code: string;
    gross_amount: string;
    transaction_id: string;
    order_id: string;
    payment_type: string;
    [key: string]: unknown;
  }

  export class Snap {
    constructor(options: SnapOptions);
    createTransaction(params: CreateTransactionParams): Promise<CreateTransactionResult>;
  }

  export class CoreApi {
    constructor(options: CoreOptions);
    transaction: {
      status(orderId: string): Promise<TransactionStatusResult>;
    };
  }

  export default class MidtransClient {
    static Snap: typeof Snap;
    static CoreApi: typeof CoreApi;
  }
}
