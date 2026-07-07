require('dotenv/config');
const { getDatabase } = require('./dist/config/database');
const { paymentMethods } = require('./dist/db/schema');
const { eq, sql } = require('drizzle-orm');
const { v4: uuidv4 } = require('uuid');

async function run() {
  const db = getDatabase();
  console.log('Creating payment method...');
  try {
    const userId = '00000000-0000-0000-0000-000000000001';
    const name = 'Wise USD Account';
    const type = 'wise_transfer';
    const details = {
      holder: 'John Doe',
      bankName: 'Wise Bank',
      accountNumber: '123456789',
      routingNumber: '987654321',
    };
    const isActive = true;
    const isDefault = true;

    if (isDefault) {
      await db
        .update(paymentMethods)
        .set({ isDefault: false, updatedAt: new Date().toISOString() })
        .where(eq(paymentMethods.userId, userId));
    }

    const [{ maxSort }] = await db
      .select({ maxSort: sql`COALESCE(MAX(${paymentMethods.sortOrder}), 0)` })
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
      })
      .returning();

    console.log('Create success!', newMethod);
  } catch (err) {
    console.error('Create failed:', err);
  }
}

run();
