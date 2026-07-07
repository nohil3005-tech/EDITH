import { getDatabase } from '../../config/database';
import { eq, sql, gte, and } from 'drizzle-orm';
import { payments, invoices, payouts } from '../../db/schema/payments';
import { freelanceJobs, proposals, activeFreelanceJobs } from '../../db/schema/freelance';
import { dropshippingStores, storeOrders, ads } from '../../db/schema/dropshipping';
import { agentLogs } from '../../db/schema/logs';
import { getCurrentUserId } from '../../utils/context';
import { periodToStartDate, formatCurrency } from '../../utils/helpers';

export interface FullReport {
  generatedAt: string;
  period: string;
  summary: {
    totalRevenue: number;
    totalProfit: number;
    totalExpenses: number;
    netEarnings: number;
  };
  freelance: {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    totalEarnings: number;
    proposalWinRate: number;
    topPlatform: string;
  };
  dropshipping: {
    totalStores: number;
    activeStores: number;
    totalOrders: number;
    totalRevenue: number;
    totalAdSpend: number;
    averageRoas: number;
  };
  agents: {
    totalRuns: number;
    successRate: number;
    avgDurationMs: number;
    topAgent: string;
  };
  revenueByDay: { date: string; amount: number }[];
}

export class ReportService {
  private readonly db = getDatabase();

  async generateFullReport(period: string = '30d'): Promise<FullReport> {
    const since = periodToStartDate(period);

    // ─── Payments ────────────────────────────────────────────
    const [paymentAgg] = await this.db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(CAST(amount AS NUMERIC)),0)`,
        totalFees: sql<number>`COALESCE(SUM(CAST(gateway_fee AS NUMERIC)+CAST(platform_fee AS NUMERIC)),0)`,
        netEarnings: sql<number>`COALESCE(SUM(CAST(net_amount AS NUMERIC)),0)`,
        freelance: sql<number>`COALESCE(SUM(CASE WHEN source_type='freelance' THEN CAST(net_amount AS NUMERIC) ELSE 0 END),0)`,
        dropship: sql<number>`COALESCE(SUM(CASE WHEN source_type='dropshipping' THEN CAST(net_amount AS NUMERIC) ELSE 0 END),0)`,
      })
      .from(payments)
      .where(and(eq(payments.userId, getCurrentUserId()), gte(payments.createdAt, since as any)));

    // ─── Revenue by day ───────────────────────────────────────
    const revenueByDay = await this.db
      .select({
        date: sql<string>`DATE(created_at)::TEXT`,
        amount: sql<number>`COALESCE(SUM(CAST(net_amount AS NUMERIC)),0)`,
      })
      .from(payments)
      .where(and(eq(payments.userId, getCurrentUserId()), gte(payments.createdAt, since as any)))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    // ─── Freelance ────────────────────────────────────────────
    const [jobAgg] = await this.db
      .select({
        total: sql<number>`COUNT(*)`,
        active: sql<number>`SUM(CASE WHEN status='active' THEN 1 ELSE 0 END)`,
        completed: sql<number>`SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END)`,
      })
      .from(freelanceJobs)
      .where(eq(freelanceJobs.userId, getCurrentUserId()));

    const [proposalAgg] = await this.db
      .select({
        total: sql<number>`COUNT(*)`,
        won: sql<number>`SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END)`,
      })
      .from(proposals);

    const [topPlatformRow] = await this.db
      .select({
        platform: freelanceJobs.sourcePlatform,
        count: sql<number>`COUNT(*)`,
      })
      .from(freelanceJobs)
      .where(eq(freelanceJobs.userId, getCurrentUserId()))
      .groupBy(freelanceJobs.sourcePlatform)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(1);

    // ─── Dropshipping ─────────────────────────────────────────
    const [storeAgg] = await this.db
      .select({
        total: sql<number>`COUNT(*)`,
        active: sql<number>`SUM(CASE WHEN status IN ('testing','scaling') THEN 1 ELSE 0 END)`,
      })
      .from(dropshippingStores)
      .where(eq(dropshippingStores.userId, getCurrentUserId()));

    const [orderAgg] = await this.db
      .select({
        totalOrders: sql<number>`COUNT(*)`,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(revenue AS NUMERIC)),0)`,
      })
      .from(storeOrders);

    const [adAgg] = await this.db
      .select({
        totalSpend: sql<number>`COALESCE(SUM(CAST(spend AS NUMERIC)),0)`,
        avgRoas: sql<number>`COALESCE(AVG(roas),0)`,
      })
      .from(ads);

    // ─── Agents ───────────────────────────────────────────────
    const [agentAgg] = await this.db
      .select({
        totalRuns: sql<number>`COUNT(*)`,
        successRate: sql<number>`ROUND(100.0*SUM(CASE WHEN error IS NULL THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1)`,
        avgDuration: sql<number>`ROUND(AVG(duration_ms)::NUMERIC,0)`,
      })
      .from(agentLogs)
      .where(eq(agentLogs.userId, getCurrentUserId()));

    const [topAgentRow] = await this.db
      .select({ agentName: agentLogs.agentName, count: sql<number>`COUNT(*)` })
      .from(agentLogs)
      .where(eq(agentLogs.userId, getCurrentUserId()))
      .groupBy(agentLogs.agentName)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(1);

    const totalRevenue = Number(paymentAgg?.totalRevenue ?? 0);
    const totalFees = Number(paymentAgg?.totalFees ?? 0);
    const netEarnings = Number(paymentAgg?.netEarnings ?? 0);
    const proposalTotal = Number(proposalAgg?.total ?? 0);
    const proposalWon = Number(proposalAgg?.won ?? 0);

    return {
      generatedAt: new Date().toISOString(),
      period,
      summary: {
        totalRevenue,
        totalExpenses: totalFees,
        totalProfit: netEarnings,
        netEarnings,
      },
      freelance: {
        totalJobs: Number(jobAgg?.total ?? 0),
        activeJobs: Number(jobAgg?.active ?? 0),
        completedJobs: Number(jobAgg?.completed ?? 0),
        totalEarnings: Number(paymentAgg?.freelance ?? 0),
        proposalWinRate: proposalTotal > 0 ? Math.round((proposalWon / proposalTotal) * 100) : 0,
        topPlatform: topPlatformRow?.platform ?? 'N/A',
      },
      dropshipping: {
        totalStores: Number(storeAgg?.total ?? 0),
        activeStores: Number(storeAgg?.active ?? 0),
        totalOrders: Number(orderAgg?.totalOrders ?? 0),
        totalRevenue: Number(orderAgg?.totalRevenue ?? 0),
        totalAdSpend: Number(adAgg?.totalSpend ?? 0),
        averageRoas: Number(adAgg?.avgRoas ?? 0),
      },
      agents: {
        totalRuns: Number(agentAgg?.totalRuns ?? 0),
        successRate: Number(agentAgg?.successRate ?? 0),
        avgDurationMs: Number(agentAgg?.avgDuration ?? 0),
        topAgent: topAgentRow?.agentName ?? 'N/A',
      },
      revenueByDay: revenueByDay.map((r) => ({
        date: r.date,
        amount: Number(r.amount),
      })),
    };
  }

  async generateCSV(period: string = '30d'): Promise<string> {
    const report = await this.generateFullReport(period);

    const rows = [
      ['EDITH Financial Report', '', ''],
      ['Generated', report.generatedAt, ''],
      ['Period', report.period, ''],
      ['', '', ''],
      ['SUMMARY', '', ''],
      ['Total Revenue', formatCurrency(report.summary.totalRevenue), ''],
      ['Total Expenses', formatCurrency(report.summary.totalExpenses), ''],
      ['Net Earnings', formatCurrency(report.summary.netEarnings), ''],
      ['', '', ''],
      ['FREELANCE', '', ''],
      ['Total Jobs', String(report.freelance.totalJobs), ''],
      ['Completed Jobs', String(report.freelance.completedJobs), ''],
      ['Proposal Win Rate', `${report.freelance.proposalWinRate}%`, ''],
      ['Freelance Earnings', formatCurrency(report.freelance.totalEarnings), ''],
      ['', '', ''],
      ['DROPSHIPPING', '', ''],
      ['Total Stores', String(report.dropshipping.totalStores), ''],
      ['Total Orders', String(report.dropshipping.totalOrders), ''],
      ['Dropshipping Revenue', formatCurrency(report.dropshipping.totalRevenue), ''],
      ['Ad Spend', formatCurrency(report.dropshipping.totalAdSpend), ''],
      ['Average ROAS', report.dropshipping.averageRoas.toFixed(2), ''],
      ['', '', ''],
      ['AI AGENTS', '', ''],
      ['Total Agent Runs', String(report.agents.totalRuns), ''],
      ['Success Rate', `${report.agents.successRate}%`, ''],
      ['Avg Duration (ms)', String(report.agents.avgDurationMs), ''],
      ['Top Agent', report.agents.topAgent, ''],
      ['', '', ''],
      ['DAILY REVENUE', '', ''],
      ['Date', 'Amount', ''],
      ...report.revenueByDay.map((r) => [r.date, formatCurrency(r.amount), '']),
    ];

    return rows.map((row) => row.join(',')).join('\n');
  }
}
