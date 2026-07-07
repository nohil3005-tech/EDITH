require('dotenv/config');
const { getDatabase } = require('./dist/config/database');
const { paymentMethods } = require('./dist/db/schema');
const { eq, and } = require('drizzle-orm');

async function run() {
  const db = getDatabase();
  console.log('Testing payment method update...');
  try {
    const userId = '00000000-0000-0000-0000-000000000001';
    
    // First list the existing methods
    const list = await db.select().from(paymentMethods).where(eq(paymentMethods.userId, userId));
    console.log('Current payment methods in DB:', list.length);
    if (list.length === 0) {
      console.log('No payment methods to update. Run create test first.');
      return;
    }

    const firstMethod = list[0];
    console.log('Updating method with ID:', firstMethod.id);

    const [updated] = await db
      .update(paymentMethods)
      .set({
        name: 'Wise Updated USD Account',
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(paymentMethods.id, firstMethod.id), eq(paymentMethods.userId, userId)))
      .returning();

    console.log('Update success!', updated);
  } catch (err) {
    console.error('Update failed:', err);
  }
}

run();
