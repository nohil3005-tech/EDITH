/**
 * EDITH Desktop — Invoice Service (SQLite)
 */

import { eq, and, like, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../config/database';
import { invoices } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { generateInvoiceNumber } from '../../utils/fingerprint';
import { InvoiceLineItem } from '../../types/payment';
import { DEFAULT_USER_ID } from '../../config/constants';

export class InvoiceService {
  private readonly db = getDatabase();

  async generate(data: {
    clientName: string;
    clientEmail: string;
    clientAddress?: string;
    items: InvoiceLineItem[];
    taxRate?: number;
    notes?: string;
    dueDate?: Date;
  }) {
    // Get next sequence number
    const all = await this.db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.userId, DEFAULT_USER_ID));

    const sequence     = all.length + 1;
    const invoiceNumber = generateInvoiceNumber(sequence);
    const subtotal     = data.items.reduce((s, i) => s + i.total, 0);
    const tax          = subtotal * ((data.taxRate ?? 0) / 100);
    const total        = subtotal + tax;

    const [invoice] = await this.db
      .insert(invoices)
      .values({
        id:            uuidv4(),
        userId:        DEFAULT_USER_ID,
        invoiceNumber,
        clientName:    data.clientName,
        clientEmail:   data.clientEmail,
        clientAddress: data.clientAddress ?? null,
        items:         data.items,
        subtotal:      parseFloat(subtotal.toFixed(2)),
        tax:           parseFloat(tax.toFixed(2)),
        total:         parseFloat(total.toFixed(2)),
        status:        'draft',
        notes:         data.notes ?? null,
        dueDate:       data.dueDate?.toISOString() ?? null,
      } as any)
      .returning();

    return invoice;
  }

  async getById(id: string) {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);
    if (!invoice) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
    return invoice;
  }

  async list(filters: { status?: string; search?: string; page?: number; limit?: number }) {
    const { status, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(invoices.userId, DEFAULT_USER_ID)];
    if (status) conditions.push(eq(invoices.status, status));
    if (search) conditions.push(like(invoices.clientName, `%${search}%`));

    const rows = await this.db
      .select()
      .from(invoices)
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    const all = await this.db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.userId, DEFAULT_USER_ID));

    return { rows, total: all.length };
  }

  async markPaid(id: string) {
    const [updated] = await this.db
      .update(invoices)
      .set({ status: 'paid', paidAt: new Date().toISOString() } as any)
      .where(eq(invoices.id, id))
      .returning();
    if (!updated) throw new AppError(404, 'INVOICE_NOT_FOUND', 'Invoice not found');
    return updated;
  }

  async markSent(id: string) {
    const [updated] = await this.db
      .update(invoices)
      .set({ status: 'sent', sentAt: new Date().toISOString() } as any)
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }
}
