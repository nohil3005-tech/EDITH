export interface Payment {
  id: string;
  userId: string;
  sourceType: 'freelance' | 'dropshipping';
  sourceId: string;
  amount: number;
  gatewayFee: number;
  platformFee: number;
  netAmount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  gateway: 'stripe' | 'razorpay' | 'manual';
  gatewayPaymentId: string | null;
  currency: string;
  customerEmail: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  completedAt: Date | null;
}

export interface Invoice {
  id: string;
  userId: string;
  paymentId: string | null;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string | null;
  items: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentLink: string | null;
  notes: string | null;
  pdfUrl: string | null;
  dueDate: Date | null;
  createdAt: Date;
  sentAt: Date | null;
  paidAt: Date | null;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Payout {
  id: string;
  userId: string;
  amount: number;
  sourceGateway: string;
  destinationBank: string | null;
  destinationAccountLast4: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  referenceId: string | null;
  initiatedAt: Date;
  completedAt: Date | null;
}

export interface EarningsSummary {
  totalRevenue: number;
  totalFees: number;
  netEarnings: number;
  freelanceEarnings: number;
  dropshippingEarnings: number;
  pendingPayouts: number;
  currency: string;
  period: string;
  revenueByDay: { date: string; amount: number }[];
}

export interface StripeCheckoutInput {
  invoiceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface RazorpayOrderInput {
  invoiceId: string;
  currency?: string;
}
