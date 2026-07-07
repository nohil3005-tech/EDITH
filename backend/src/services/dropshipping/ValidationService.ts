import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../config/database';
import { dropshippingProducts, validationResults } from '../../db/schema/dropshipping';
import { ValidationAgent } from '../agents/ValidationAgent';
import { AppError } from '../../middleware/errorHandler';
import { VALIDATION_STEPS } from '../../config/constants';
import { logger } from '../../utils/logger';

export class ValidationService {
  private readonly db = getDatabase();
  private readonly agent = new ValidationAgent();

  async startValidation(productId: string): Promise<void> {
    const [product] = await this.db
      .select()
      .from(dropshippingProducts)
      .where(eq(dropshippingProducts.id, productId))
      .limit(1);

    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');

    // Mark as validating
    await this.db
      .update(dropshippingProducts)
      .set({ validationStatus: 'validating', updatedAt: new Date() as any })
      .where(eq(dropshippingProducts.id, productId));

    // Run all validation steps
    let overallPassed = true;
    let totalScore = 0;

    for (const step of VALIDATION_STEPS) {
      try {
        await this.db.insert(validationResults).values({
          id: uuidv4(),
          productId,
          stepName: step,
          status: 'running',
        } as any).onConflictDoNothing();

        const result = await this.agent.execute({ product, step });

        const passed = (result.passed as boolean) ?? true;
        const score = (result.score as number) ?? 50;

        await this.db
          .update(validationResults)
          .set({ status: passed ? 'passed' : 'failed', resultData: result as Record<string, unknown>, completedAt: new Date() as any })
          .where(eq(validationResults.productId, productId));

        if (!passed) overallPassed = false;
        totalScore += score;

        logger.info({ productId, step, passed, score }, 'Validation step complete');
      } catch (err) {
        logger.error({ err, productId, step }, 'Validation step failed');
        overallPassed = false;
      }
    }

    const avgScore = totalScore / VALIDATION_STEPS.length;

    await this.db
      .update(dropshippingProducts)
      .set({
        validationStatus: overallPassed ? 'approved' : 'rejected',
        aiScore: avgScore,
        updatedAt: new Date() as any,
      })
      .where(eq(dropshippingProducts.id, productId));
  }

  async getStatus(productId: string) {
    const steps = await this.db
      .select()
      .from(validationResults)
      .where(eq(validationResults.productId, productId));

    return steps;
  }
}
