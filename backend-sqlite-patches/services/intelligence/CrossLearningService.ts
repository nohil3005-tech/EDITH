/**
 * EDITH Desktop — Cross-Learning Service (SQLite)
 */

import { eq, desc } from 'drizzle-orm';
import { getDatabase } from '../../config/database';
import { agentLogs } from '../../db/schema';
import { proposals } from '../../db/schema';
import { ads } from '../../db/schema';
import { getLLMClient } from '../../utils/llmClient';
import { DEFAULT_USER_ID } from '../../config/constants';

export class CrossLearningService {
  private readonly db  = getDatabase();
  private readonly llm = getLLMClient();

  async getInsights() {
    // Agent stats — computed in JS from raw rows
    const logs = await this.db
      .select()
      .from(agentLogs)
      .where(eq(agentLogs.userId, DEFAULT_USER_ID));

    const totalRuns   = logs.length;
    const errors      = logs.filter((l) => l.error !== null).length;
    const successRate = totalRuns > 0
      ? Math.round(((totalRuns - errors) / totalRuns) * 100)
      : 100;
    const avgDuration = totalRuns > 0
      ? Math.round(logs.reduce((s, l) => s + l.durationMs, 0) / totalRuns)
      : 0;

    // Top agents by run count
    const agentCounts = new Map<string, number>();
    for (const log of logs) {
      agentCounts.set(log.agentName, (agentCounts.get(log.agentName) ?? 0) + 1);
    }
    const topAgents = Array.from(agentCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([agentName, runs]) => ({
        agentName,
        runs,
        successRate: Math.round(
          ((logs.filter((l) => l.agentName === agentName && !l.error).length) / runs) * 100,
        ),
        avgDurationMs: Math.round(
          logs.filter((l) => l.agentName === agentName)
            .reduce((s, l) => s + l.durationMs, 0) / runs,
        ),
      }));

    // Ad performance by platform
    const allAds = await this.db.select().from(ads);
    const adPlatforms = new Map<string, { totalRevenue: number; totalSpend: number; count: number }>();
    for (const ad of allAds) {
      const p = ad.platform;
      if (!adPlatforms.has(p)) adPlatforms.set(p, { totalRevenue: 0, totalSpend: 0, count: 0 });
      const entry = adPlatforms.get(p)!;
      entry.totalRevenue += Number(ad.revenue);
      entry.totalSpend   += Number(ad.spend);
      entry.count        += 1;
    }
    const adPerformance = Array.from(adPlatforms.entries()).map(([platform, data]) => ({
      platform,
      avgRoas:      data.totalSpend > 0 ? parseFloat((data.totalRevenue / data.totalSpend).toFixed(2)) : 0,
      totalRevenue: data.totalRevenue,
      totalSpend:   data.totalSpend,
    }));

    // Proposal win rate
    const allProposals = await this.db.select().from(proposals);
    const won          = allProposals.filter((p) => p.status === 'accepted').length;
    const proposalWinRate = allProposals.length > 0
      ? Math.round((won / allProposals.length) * 100)
      : 0;

    // AI insight
    let aiInsight = 'Keep running tasks to generate AI performance insights.';
    if (totalRuns > 10) {
      try {
        aiInsight = await this.llm.complete(
          `Briefly (under 80 words) give 2 actionable insights for improving results:
Agent success rate: ${successRate}%, Proposal win rate: ${proposalWinRate}%,
Top agents: ${topAgents.slice(0, 3).map((a) => a.agentName).join(', ')}. Be specific and practical.`,
          { maxTokens: 120 },
        );
      } catch { /* keep default */ }
    }

    return {
      agentStats:       { totalRuns, successRate, avgDurationMs: avgDuration, errors },
      topAgents,
      adPerformance,
      proposalWinRate,
      aiInsight,
      generatedAt: new Date().toISOString(),
    };
  }
}
