require('dotenv/config');
const { getDatabase } = require('./dist/config/database');
const { users } = require('./dist/db/schema');
const { eq } = require('drizzle-orm');

async function run() {
  const db = getDatabase();
  console.log('Updating payment settings...');
  try {
    const payload = {
      defaultLink: "https://buy.stripe.com/test_abc123",
      businessName: "EDITH Agency Test",
      logoUrl: "",
      taxId: "",
      businessAddress: "",
      invoicePrefix: "INV-",
      invoiceStartingNumber: 1001,
      currency: "USD",
      dueDays: 14,
      methods: [{ id: "m1", type: "PayPal", link: "https://paypal.me/alexmorgan" }]
    };
    const [updated] = await db
      .update(users)
      .set({ paymentSettings: payload, updatedAt: new Date().toISOString() })
      .where(eq(users.id, '00000000-0000-0000-0000-000000000001'))
      .returning();
    console.log('Update success!', updated);
  } catch (err) {
    console.error('Update failed:', err);
  }
}

run();
