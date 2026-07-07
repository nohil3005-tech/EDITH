/**
 * EDITH Desktop — Dropshipping Analytics Service (SQLite)
 */

import { eq, and, gte, desc } from 'drizzle-orm';
import { getDatabase } from '../../config/database';
import { dropshippingStores, storeOrders, ads } from '../../db/schema';
import { DEFAULT_USER_ID } from '../../config/constants';
import { DropshippingAnalytics } from '../../types/dropshipping';

export class DropshippingAnalyticsService {
  private readonly db = getDatabase();

  async getOverview(): Promise<DropshippingAnalytics> {
    const allStores = await this.db
      .select()
      .from(dropshippingStores)
      .where(eq(dropshippingStores.userId, DEFAULT_USER_ID));

    if (allStores.length === 0) {
      return {
        totalRevenue: 0, totalCost: 0, totalProfit: 0, totalOrders: 0,
        averageRoas: 0, activeStores: 0, topProduct: null, revenueByDay: [],
      };
    }

    const storeIds = allStores.map((s) => s.id);

    // Fetch all orders for these stores
    const orders = await this.db.select().from(storeOrders);
    const relevantOrders = orders.filter((o) => storeIds.includes(o.storeId));

    const totalRevenue = relevantOrders.reduce((s, o) => s + Number(o.revenue), 0);
    const totalCost    = relevantOrders.reduce((s, o) => s + Number(o.cost),    0);

    // Fetch all ads
    const allAds = await this.db.select().from(ads);
    const relAds = allAds.filter((a) => storeIds.includes(a.storeId));
    const avgRoas = relAds.length > 0
      ? relAds.reduce((s, a) => s + Number(a.roas), 0) / relAds.length
      : 0;

    // Revenue by day (last 30 days)
    const since    = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recent   = relevantOrders.filter((o) => (o.placedAt as string) >= since);
    const byDayMap = new Map<string, number>();
    for (const o of recent) {
      const day = (o.placedAt as string).slice(0, 10);
      byDayMap.set(day, (byDayMap.get(day) ?? 0) + Number(o.revenue));
    }
    const revenueByDay = Array.from(byDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));

    return {
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
      totalOrders: relevantOrders.length,
      averageRoas: parseFloat(avgRoas.toFixed(2)),
      activeStores: allStores.filter((s) => ['testing', 'scaling'].includes(s.status)).length,
      topProduct: null,
      revenueByDay,
    };
  }

  async getStoreAnalytics(storeId: string, period = '30d') {
    const days  = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const orders   = await this.db.select().from(storeOrders).where(eq(storeOrders.storeId, storeId));
    const storeAds = await this.db.select().from(ads).where(eq(ads.storeId, storeId));
    const recent   = orders.filter((o) => (o.placedAt as string) >= since);

    const revenue  = recent.reduce((s, o) => s + Number(o.revenue), 0);
    const cost     = recent.reduce((s, o) => s + Number(o.cost),    0);
    const adSpend  = storeAds.reduce((s, a) => s + Number(a.spend), 0);

    return {
      period,
      orders:   recent.length,
      revenue,
      cost,
      profit:   revenue - cost - adSpend,
      adSpend,
      roas:     adSpend > 0 ? revenue / adSpend : 0,
      ads:      storeAds,
    };
  }
}
