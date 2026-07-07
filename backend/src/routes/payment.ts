import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validate';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  generateInvoice, sendInvoice, getInvoice, listInvoices, markInvoicePaid,
  createStripeCheckout, createRazorpayOrder,
  getEarnings, getFreelanceEarnings, getDropshippingEarnings,
  getTransactions, getPayouts, requestPayout,
  listPaymentMethods, createPaymentMethod, updatePaymentMethod,
  deletePaymentMethod, reorderPaymentMethods, setDefaultPaymentMethod,
} from '../controllers/paymentController';

const router = Router();

const generateInvoiceSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  clientAddress: z.string().optional(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    total: z.number().min(0),
  })).min(1),
  taxRate: z.number().min(0).max(100).optional().default(0),
  notes: z.string().optional(),
  dueDate: z.string().optional().transform((v) => v ? new Date(v) : undefined),
  paymentMethodId: z.string().uuid().optional(),
});

const sendInvoiceSchema = z.object({ invoiceId: z.string().uuid() });

const stripeCheckoutSchema = z.object({
  invoiceId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const razorpayOrderSchema = z.object({
  invoiceId: z.string().uuid(),
  currency: z.string().optional().default('INR'),
});

const earningsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
});

const listInvoicesSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

const transactionsSchema = z.object({
  page: z.coerce.number().optional().default(1),
});

const requestPayoutSchema = z.object({
  amount: z.number().min(1),
  sourceGateway: z.string(),
  destinationBank: z.string().optional(),
  destinationAccountLast4: z.string().optional(),
});

const createPaymentMethodSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['wire_transfer', 'wise_transfer', 'upi', 'paypal', 'stripe_link', 'razorpay_link', 'custom_url', 'other']),
  details: z.record(z.unknown()),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
});

const updatePaymentMethodSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['wire_transfer', 'wise_transfer', 'upi', 'paypal', 'stripe_link', 'razorpay_link', 'custom_url', 'other']).optional(),
  details: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

const reorderPaymentMethodsSchema = z.object({
  ids: z.array(z.string().uuid()),
});

const setDefaultPaymentMethodSchema = z.object({
  id: z.string().uuid().nullable(),
});

router.post('/invoice/generate',      validateBody(generateInvoiceSchema),  asyncHandler(generateInvoice));
router.post('/invoice/send',          validateBody(sendInvoiceSchema),       asyncHandler(sendInvoice));
router.get('/invoice/:id',                                                   asyncHandler(getInvoice));
router.get('/invoices',               validateQuery(listInvoicesSchema),     asyncHandler(listInvoices));
router.put('/invoice/:id/mark-paid',                                         asyncHandler(markInvoicePaid));

router.post('/stripe/checkout',       validateBody(stripeCheckoutSchema),    asyncHandler(createStripeCheckout));
router.post('/razorpay/order',        validateBody(razorpayOrderSchema),     asyncHandler(createRazorpayOrder));

router.get('/earnings',               validateQuery(earningsQuerySchema),    asyncHandler(getEarnings));
router.get('/earnings/freelance',                                            asyncHandler(getFreelanceEarnings));
router.get('/earnings/dropshipping',                                         asyncHandler(getDropshippingEarnings));
router.get('/transactions',           validateQuery(transactionsSchema),     asyncHandler(getTransactions));
router.get('/payouts',                                                       asyncHandler(getPayouts));
router.post('/payouts/request',       validateBody(requestPayoutSchema),     asyncHandler(requestPayout));

// Payment Methods Endpoints
router.get('/methods',                                                       asyncHandler(listPaymentMethods));
router.post('/methods',               validateBody(createPaymentMethodSchema), asyncHandler(createPaymentMethod));
router.put('/methods/reorder',        validateBody(reorderPaymentMethodsSchema), asyncHandler(reorderPaymentMethods));
router.put('/methods/:id',            validateBody(updatePaymentMethodSchema), asyncHandler(updatePaymentMethod));
router.delete('/methods/:id',                                                asyncHandler(deletePaymentMethod));
router.put('/default-method',         validateBody(setDefaultPaymentMethodSchema), asyncHandler(setDefaultPaymentMethod));

export default router;
