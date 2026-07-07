import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { InvoiceService } from '../services/payment/InvoiceService';
import { PaymentService } from '../services/payment/PaymentService';
import { PayoutTracker } from '../services/payment/PayoutTracker';
import { StripeService } from '../services/payment/StripeService';
import { RazorpayService } from '../services/payment/RazorpayService';
import { EmailService } from '../services/email/EmailService';
import { successResponse } from '../types/api';
import { paginationMeta } from '../types/api';
import { eq, and, sql } from 'drizzle-orm';
import { getDatabase } from '../config/database';
import { getCurrentUserId } from '../utils/context';
import { paymentMethods } from '../db/schema/payments';
import { AppError } from '../middleware/errorHandler';

const invoiceService = new InvoiceService();
const paymentService = new PaymentService();
const payoutTracker = new PayoutTracker();
const stripeService = new StripeService();
const razorpayService = new RazorpayService();
const emailService = new EmailService();

export async function generateInvoice(req: AuthRequest, res: Response): Promise<void> {
  const invoice = await invoiceService.generate(req.body);
  res.status(201).json(successResponse(invoice));
}

export async function sendInvoice(req: AuthRequest, res: Response): Promise<void> {
  const { invoiceId } = req.body as { invoiceId: string };
  const invoice = await invoiceService.getById(invoiceId);
  await emailService.sendInvoice(invoice.clientEmail, {
    clientName: invoice.clientName,
    invoiceNumber: invoice.invoiceNumber,
    total: String(invoice.total),
    dueDate: invoice.dueDate ? (((invoice.dueDate as any) instanceof Date) ? (invoice.dueDate as any).toLocaleDateString() : new Date(invoice.dueDate).toLocaleDateString()) : 'On receipt',
    paymentLink: invoice.paymentLink ?? '#',
  });
  await invoiceService.markSent(invoiceId);
  res.json(successResponse({ sent: true, invoiceId }));
}

export async function getInvoice(req: AuthRequest, res: Response): Promise<void> {
  const invoice = await invoiceService.getById(req.params.id);
  res.json(successResponse(invoice));
}

export async function listInvoices(req: AuthRequest, res: Response): Promise<void> {
  const { status, search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const { rows, total } = await invoiceService.list({ status, search, page: parseInt(page), limit: parseInt(limit) });
  res.json(successResponse(rows, paginationMeta(parseInt(page), parseInt(limit), total)));
}

export async function markInvoicePaid(req: AuthRequest, res: Response): Promise<void> {
  const invoice = await invoiceService.markPaid(req.params.id);
  res.json(successResponse(invoice));
}

export async function createStripeCheckout(req: AuthRequest, res: Response): Promise<void> {
  const { invoiceId, successUrl, cancelUrl } = req.body as { invoiceId: string; successUrl: string; cancelUrl: string };
  const session = await stripeService.createCheckoutSession(invoiceId, successUrl, cancelUrl);
  res.json(successResponse(session));
}

export async function createRazorpayOrder(req: AuthRequest, res: Response): Promise<void> {
  const { invoiceId, currency } = req.body as { invoiceId: string; currency?: string };
  const order = await razorpayService.createOrder(invoiceId, currency);
  res.json(successResponse(order));
}

export async function getEarnings(req: AuthRequest, res: Response): Promise<void> {
  const { period = '30d' } = req.query as { period?: string };
  const earnings = await paymentService.getEarnings(period);
  res.json(successResponse(earnings));
}

export async function getFreelanceEarnings(req: AuthRequest, res: Response): Promise<void> {
  const earnings = await paymentService.getEarnings('30d');
  res.json(successResponse({ earnings: earnings.freelanceEarnings, currency: earnings.currency }));
}

export async function getDropshippingEarnings(req: AuthRequest, res: Response): Promise<void> {
  const earnings = await paymentService.getEarnings('30d');
  res.json(successResponse({ earnings: earnings.dropshippingEarnings, currency: earnings.currency }));
}

export async function getTransactions(req: AuthRequest, res: Response): Promise<void> {
  const { page = '1' } = req.query as { page?: string };
  const { rows, total } = await paymentService.getTransactions(parseInt(page));
  res.json(successResponse(rows, paginationMeta(parseInt(page), 20, total)));
}

export async function getPayouts(_req: AuthRequest, res: Response): Promise<void> {
  const payoutList = await payoutTracker.list();
  res.json(successResponse(payoutList));
}

export async function requestPayout(req: AuthRequest, res: Response): Promise<void> {
  const { amount, sourceGateway, destinationBank, destinationAccountLast4 } = req.body as {
    amount: number; sourceGateway: string; destinationBank?: string; destinationAccountLast4?: string;
  };
  const payout = await payoutTracker.inititatePayout({ amount, sourceGateway, destinationBank, destinationAccountLast4 });
  res.status(201).json(successResponse(payout));
}

const db = getDatabase();

export async function listPaymentMethods(req: AuthRequest, res: Response): Promise<void> {
  const userId = getCurrentUserId();
  const methods = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId))
    .orderBy(paymentMethods.sortOrder);
  res.json(successResponse(methods));
}

export async function createPaymentMethod(req: AuthRequest, res: Response): Promise<void> {
  const userId = getCurrentUserId();
  const { name, type, details, isActive, isDefault } = req.body;

  if (isDefault) {
    await db
      .update(paymentMethods)
      .set({ isDefault: false, updatedAt: new Date().toISOString() as any })
      .where(eq(paymentMethods.userId, userId));
  }

  const [{ maxSort }] = await db
    .select({ maxSort: sql<number>`COALESCE(MAX(${paymentMethods.sortOrder}), 0)` })
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId));

  const [newMethod] = await db
    .insert(paymentMethods)
    .values({
      id: uuidv4(),
      userId,
      name,
      type,
      details,
      isActive: isActive !== undefined ? isActive : true,
      isDefault: isDefault !== undefined ? isDefault : false,
      sortOrder: Number(maxSort) + 1,
    } as any)
    .returning();

  res.status(201).json(successResponse(newMethod));
}

export async function updatePaymentMethod(req: AuthRequest, res: Response): Promise<void> {
  const userId = getCurrentUserId();
  const { id } = req.params;
  const { name, type, details, isActive, isDefault } = req.body;

  // Verify ownership
  const [existing] = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new AppError(404, 'PAYMENT_METHOD_NOT_FOUND', 'Payment method not found');
  }

  if (isDefault) {
    await db
      .update(paymentMethods)
      .set({ isDefault: false, updatedAt: new Date().toISOString() as any })
      .where(eq(paymentMethods.userId, userId));
  }

  const [updated] = await db
    .update(paymentMethods)
    .set({
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(details !== undefined && { details }),
      ...(isActive !== undefined && { isActive }),
      ...(isDefault !== undefined && { isDefault }),
      updatedAt: new Date().toISOString() as any,
    })
    .where(eq(paymentMethods.id, id))
    .returning();

  res.json(successResponse(updated));
}

export async function deletePaymentMethod(req: AuthRequest, res: Response): Promise<void> {
  const userId = getCurrentUserId();
  const { id } = req.params;

  // Verify ownership
  const [existing] = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new AppError(404, 'PAYMENT_METHOD_NOT_FOUND', 'Payment method not found');
  }

  await db
    .delete(paymentMethods)
    .where(eq(paymentMethods.id, id));

  res.json(successResponse({ deleted: true, id }));
}

export async function reorderPaymentMethods(req: AuthRequest, res: Response): Promise<void> {
  const userId = getCurrentUserId();
  const { ids } = req.body as { ids: string[] };

  for (let index = 0; index < ids.length; index++) {
    const id = ids[index];
    await db
      .update(paymentMethods)
      .set({ sortOrder: index, updatedAt: new Date().toISOString() as any })
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)));
  }

  res.json(successResponse({ reordered: true }));
}

export async function setDefaultPaymentMethod(req: AuthRequest, res: Response): Promise<void> {
  const userId = getCurrentUserId();
  const { id } = req.body as { id: string | null };

  // Unset all default methods for user
  await db
    .update(paymentMethods)
    .set({ isDefault: false, updatedAt: new Date().toISOString() as any })
    .where(eq(paymentMethods.userId, userId));

  if (id) {
    await db
      .update(paymentMethods)
      .set({ isDefault: true, updatedAt: new Date().toISOString() as any })
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)));
  }

  res.json(successResponse({ success: true }));
}
