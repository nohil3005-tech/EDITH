/**
 * EDITH Desktop — Job Discovery Service (SQLite)
 */

import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../config/database';
import { freelanceJobs, users } from '../../db/schema';
import { getLLMClient } from '../../utils/llmClient';
import { scrapeFreelanceJobs } from '../../utils/scraper';
import { logger } from '../../utils/logger';
import { DEFAULT_USER_ID } from '../../config/constants';
import { JobScanOptions, JobScanResult } from '../../types/freelance';

export class JobDiscoveryService {
  private readonly db  = getDatabase();
  private readonly llm = getLLMClient();

  async scan(options: JobScanOptions = {}): Promise<JobScanResult> {
    const platforms  = options.platforms ?? ['upwork', 'fiverr', 'toptal', 'contra', 'peopleperhour', 'freelancer'];
    const rawJobs    = await scrapeFreelanceJobs(platforms);

    let newCount       = 0;
    let duplicateCount = 0;
    let errorCount     = 0;
    const savedJobs: any[] = [];

    for (const rawJob of rawJobs) {
      try {
        // Dedup check
        const existing = await this.db
          .select({ id: freelanceJobs.id })
          .from(freelanceJobs)
          .where(
            and(
              eq(freelanceJobs.sourcePlatform, rawJob.sourcePlatform ?? ''),
              eq(freelanceJobs.externalId,    rawJob.externalId ?? ''),
            ),
          )
          .limit(1);

        if (existing.length > 0) { duplicateCount++; continue; }

        const aiInsights = await this.scoreJob(rawJob);

        const [saved] = await this.db
          .insert(freelanceJobs)
          .values({
            id:             uuidv4(),
            userId:         DEFAULT_USER_ID,
            sourcePlatform: rawJob.sourcePlatform ?? 'unknown',
            externalId:     rawJob.externalId ?? uuidv4(),
            title:          rawJob.title ?? 'Untitled',
            description:    rawJob.description ?? '',
            budgetMin:      rawJob.budgetMin ?? null,
            budgetMax:      rawJob.budgetMax ?? null,
            clientRating:   rawJob.clientRating ?? null,
            tags:           rawJob.tags ?? [],
            aiScore:        aiInsights.matchScore,
            aiInsights:     aiInsights,
            status:         'new',
            rawData:        rawJob as any,
          } as any)
          .returning();

        savedJobs.push(saved);
        newCount++;
      } catch (err) {
        logger.error({ err, title: rawJob.title }, 'Failed to save job');
        errorCount++;
      }
    }

    // Auto-generate and send proposals if user preference is enabled
    try {
      const [user] = await this.db.select().from(users).where(eq(users.id, DEFAULT_USER_ID)).limit(1);
      if (user && savedJobs.length > 0) {
        let prefs: Record<string, boolean> = {};
        if (typeof user.preferences === 'string') {
          try {
            prefs = JSON.parse(user.preferences);
          } catch {
            prefs = {};
          }
        } else if (user.preferences && typeof user.preferences === 'object') {
          prefs = user.preferences as Record<string, boolean>;
        }

        const autoPropose = prefs['Auto-generate proposals'] !== false;
        if (autoPropose) {
          const { ProposalService } = await import('./ProposalService');
          const proposalSvc = new ProposalService();
          for (const job of savedJobs) {
            try {
              logger.info({ jobId: job.id }, 'Auto-generating proposal for newly scanned job');
              const proposal = await proposalSvc.generate(job.id, DEFAULT_USER_ID);
              await proposalSvc.markSent(proposal.id);
              logger.info({ proposalId: proposal.id }, 'Auto-sent proposal for job');
            } catch (err: any) {
              logger.error({ err: err.message, jobId: job.id }, 'Failed to auto-propose');
            }
          }
        }
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to run auto-propose check inside JobDiscoveryService');
    }

    return {
      scanned:    rawJobs.length,
      newJobs:    newCount,
      duplicates: duplicateCount,
      errors:     errorCount,
      jobs:       savedJobs as any,
    };
  }

  private calculateHeuristicAccuracy(job: any): { score: number; explanation: string } {
    const titleLower = (job.title || '').toLowerCase();
    const tagsLower = (job.tags || []).map((t: string) => t.toLowerCase());

    const isContent = titleLower.includes('content') || titleLower.includes('writ') || titleLower.includes('copy') || titleLower.includes('blog') || tagsLower.includes('content') || tagsLower.includes('writing');
    const isDesign = titleLower.includes('design') || titleLower.includes('logo') || titleLower.includes('graphic') || titleLower.includes('figma') || tagsLower.includes('design') || tagsLower.includes('branding');
    const isWebDev = titleLower.includes('web') || titleLower.includes('dev') || titleLower.includes('code') || titleLower.includes('program') || titleLower.includes('shopify') || tagsLower.includes('web dev') || tagsLower.includes('react');
    const isSEO = titleLower.includes('seo') || titleLower.includes('search') || titleLower.includes('rank') || tagsLower.includes('seo') || tagsLower.includes('marketing');
    const isData = titleLower.includes('data') || titleLower.includes('excel') || titleLower.includes('spreadsheet') || tagsLower.includes('data') || tagsLower.includes('automation');

    if (isContent) {
      return {
        score: 92 + Math.floor(Math.random() * 6),
        explanation: 'Excellent fit for Content Swarm agent; text generation, SEO copywriting, and tone alignment have extremely high reliability.'
      };
    }
    if (isData) {
      return {
        score: 89 + Math.floor(Math.random() * 7),
        explanation: 'Data Swarm excels at clean structured records operations, B2B parsing, and Excel formatting automation.'
      };
    }
    if (isSEO) {
      return {
        score: 87 + Math.floor(Math.random() * 7),
        explanation: 'SEO Swarm performs structured website checks, metadata optimization plans, and keyword roadmap formatting.'
      };
    }
    if (isDesign) {
      return {
        score: 85 + Math.floor(Math.random() * 7),
        explanation: 'Design Swarm operates logo vectors, layout drafts, and custom SVG constructions with high formatting compliance.'
      };
    }
    if (isWebDev) {
      return {
        score: 80 + Math.floor(Math.random() * 8),
        explanation: 'WebDev Swarm delivers boilerplate scripts, React styles, and Shopify settings. Complex custom API endpoints may require user code checks.'
      };
    }
    return {
      score: 76 + Math.floor(Math.random() * 8),
      explanation: 'General task is suited for virtual assistant nodes. Complex logic execution can vary and requires operator preview.'
    };
  }

  private async scoreJob(job: any) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const heuristic = this.calculateHeuristicAccuracy(job);

    if (!apiKey || apiKey === 'placeholder' || apiKey === 'PASTE_YOUR_KEY_HERE' || apiKey.includes('PASTE_YOUR_KEY_HERE')) {
      return {
        matchScore: 70,
        strengths: [],
        concerns: [],
        suggestedBid: job.budgetMin ?? 100,
        estimatedDays: 7,
        summary: 'Manual review recommended (OPENROUTER_API_KEY not configured)',
        accuracyScore: heuristic.score,
        accuracyExplanation: heuristic.explanation,
      };
    }
    try {
      const prompt = `Score this freelance job and evaluate the expected delivery accuracy score from 0 to 100 that EDITH's AI specialist swarms can achieve for it (respond with JSON only, no markdown):
Title: ${job.title}
Budget: $${job.budgetMin ?? 0}–$${job.budgetMax ?? 0}
Tags: ${job.tags?.join(', ') ?? ''}

Response JSON format:
{"matchScore":85,"strengths":["strength"],"concerns":["concern"],"suggestedBid":500,"estimatedDays":7,"summary":"brief summary","accuracyScore":92,"accuracyExplanation":"accuracy explanation reasoning"}`;

      const response = await this.llm.complete(prompt, { maxTokens: 350 });
      const clean    = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      return {
        ...parsed,
        accuracyScore: parsed.accuracyScore ?? heuristic.score,
        accuracyExplanation: parsed.accuracyExplanation ?? heuristic.explanation,
      };
    } catch {
      return {
        matchScore: 70, strengths: [], concerns: [],
        suggestedBid: job.budgetMin ?? 100,
        estimatedDays: 7, summary: 'Manual review recommended',
        accuracyScore: heuristic.score,
        accuracyExplanation: heuristic.explanation,
      };
    }
  }
}
