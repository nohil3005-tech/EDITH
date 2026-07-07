import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../config/database';
import { proposals, freelanceJobs } from '../../db/schema/freelance';
import { getLLMClient } from '../../utils/llmClient';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import { getCurrentUserId } from '../../utils/context';

export class ProposalService {
  private readonly db = getDatabase();
  private readonly llm = getLLMClient();

  async generate(jobId: string, userId: string, tone: string = 'professional', cvOption: string = 'full'): Promise<typeof proposals.$inferSelect> {
    const [job] = await this.db
      .select()
      .from(freelanceJobs)
      .where(eq(freelanceJobs.id, jobId))
      .limit(1);

    if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Job not found');

    let parsed: { draftText: string; bidAmount: number; deliveryDays: number };
    const apiKey = process.env.OPENROUTER_API_KEY;

    // Filter CV profile context based on selected option
    let cvText = ``;
    if (cvOption === 'tech') {
      cvText = `TECHNICAL STACK (Nohil Bansu): Expert in React, TypeScript, SQLite, Drizzle ORM, Node.js, Express, Electron, Puppeteer, Python web scrapers, and local LLM orchestration.`;
    } else if (cvOption === 'experience') {
      cvText = `KEY EXPERIENCE (Nohil Bansu): Architected EDITH (AI Business Hub) using Electron, React, SQLite, dynamic parallel agent swarms, and Ollama/OpenRouter integration hooks.`;
    } else {
      cvText = `
FREELANCER PROFILE: Nohil Bansu
TITLE: Full-Stack & AI Automation Developer
SUMMARY: Versatile Full-Stack Developer specialized in desktop applications (Electron setups, installers), automated data scrapers (Puppeteer, Python), and responsive web portals. Orchestrates AI agent swarms and local LLM integrations. React, TypeScript, SQLite, Drizzle ORM, Node.js, Express.
KEY PROJECT: EDITH (AI Business Hub). Created desktop app with Electron, React, SQLite, parallel agent swarms, and Ollama integration.
`;
    }

    if (!apiKey || apiKey === 'placeholder' || apiKey === 'PASTE_YOUR_KEY_HERE' || apiKey.includes('PASTE_YOUR_KEY_HERE')) {
      const draftMsg = tone === 'direct' 
        ? `Hi there, I read your requirements for "${job.title}". I am a Full-Stack developer matching React/TypeScript specifications. I can deliver this cleanly for $${job.budgetMax || 500} in 5 days.`
        : tone === 'technical'
        ? `Hi there,\n\nI read your technical specs for "${job.title}". I will implement this using React components, TypeScript typing, and an Express Node.js backend mapped via Drizzle ORM to a SQLite local container database. Clean structure with error handling, proper indexes, and CORS wildcards is standard.\n\nBest regards,\nEDITH Technical Agent`
        : tone === 'conversational'
        ? `Hey! Hope you are doing great. I saw your job posting for "${job.title}" and it sounds super exciting. I have built very similar things in the past (like custom sidebar panels and database managers) and would love to jump on a quick chat to discuss details.\n\nTalk soon!`
        : `Hi there,\n\nI read your requirements for "${job.title}" and would love to help you build this project. I have extensive experience with matching technologies and can deliver a robust, high-performance solution within your budget.\n\nLooking forward to discussing further details.\n\nBest regards,\nEDITH Automation Agent`;

      parsed = {
        draftText: draftMsg,
        bidAmount: Number(job.budgetMax || 500),
        deliveryDays: 7,
      };
    } else {
      const prompt = `Write a winning freelance proposal for this job:

JOB TITLE: ${job.title}
DESCRIPTION: ${job.description}
BUDGET: $${job.budgetMin || 0} - $${job.budgetMax || 0}
TAGS: ${Array.isArray(job.tags) ? (job.tags as string[]).join(', ') : ''}

FREELANCER PORTFOLIO SUMMARY:
${cvText}

REQUIRED PROPOSAL TONE: "${tone.toUpperCase()}"
Guidelines for the tone:
- PROFESSIONAL: Balanced, business-ready, structured, clear. (400-600 words)
- DIRECT: Extremely short, concise, quick answers to requirements. (Under 200 words)
- TECHNICAL: Deep-dive. Explain the libraries, modules, schemas, database flows, and build steps. (500-750 words)
- CONVERSATIONAL: Friendly, enthusiastic, informal, focusing on quick relationship building.

Write a personalised proposal that:
1. Opens with a specific reference to the client's problem (not "Dear client" or "Respected sir")
2. Highlights relevant skills/achievements matching this task from Nohil Bansu's CV
3. Presents a clear delivery plan
4. Includes a competitive bid
5. Closes with a clear CTA

Return JSON format:
{
  "draftText": "full proposal text matching tone guidelines",
  "bidAmount": 500,
  "deliveryDays": 7
}`;

      const model = this.selectModelForJob(job);
      logger.info({ jobId: job.id, selectedModel: model, tone }, 'Routing proposal generation to selected model');
      const response = await this.llm.complete(prompt, { maxTokens: 1200, model });
      const clean = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      try {
        parsed = JSON.parse(clean);
      } catch {
        parsed = { draftText: response, bidAmount: Number(job.budgetMin) || 100, deliveryDays: 7 };
      }
    }

    // Upsert proposal
    const existing = await this.db
      .select()
      .from(proposals)
      .where(and(eq(proposals.jobId, jobId), eq(proposals.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await this.db
        .update(proposals)
        .set({ draftText: parsed.draftText, bidAmount: parsed.bidAmount as any, deliveryDays: parsed.deliveryDays, updatedAt: new Date().toISOString() as any })
        .where(eq(proposals.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(proposals)
      .values({
        id: uuidv4(),
        jobId,
        userId,
        draftText: parsed.draftText,
        bidAmount: parsed.bidAmount as any,
        deliveryDays: parsed.deliveryDays,
        portfolioItems: [],
        status: 'draft',
      })
      .returning();

    return created;
  }

  async markSent(proposalId: string): Promise<void> {
    await this.db
      .update(proposals)
      .set({ status: 'sent', sentAt: new Date().toISOString() as any, updatedAt: new Date().toISOString() as any })
      .where(and(eq(proposals.id, proposalId), eq(proposals.userId, getCurrentUserId())));
  }

  async update(proposalId: string, data: Partial<typeof proposals.$inferInsert>): Promise<typeof proposals.$inferSelect> {
    const [updated] = await this.db
      .update(proposals)
      .set({ ...data, humanModifiedAt: new Date().toISOString() as any, updatedAt: new Date().toISOString() as any })
      .where(and(eq(proposals.id, proposalId), eq(proposals.userId, getCurrentUserId())))
      .returning();
    if (!updated) throw new AppError(404, 'PROPOSAL_NOT_FOUND', 'Proposal not found');
    return updated;
  }

  private selectModelForJob(job: typeof freelanceJobs.$inferSelect): string {
    const titleLower = (job.title || '').toLowerCase();
    const descLower = (job.description || '').toLowerCase();
    const tagsLower = (job.tags as string[] || []).map((t: string) => t.toLowerCase());

    const hasAI = titleLower.includes('ai') || titleLower.includes('llm') || titleLower.includes('rag') ||
                  descLower.includes('ai') || descLower.includes('llm') || descLower.includes('rag') ||
                  tagsLower.some((t: string) => t.includes('ai') || t.includes('llm') || t.includes('rag'));

    const isSenior = titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('architect') ||
                     descLower.includes('senior') || descLower.includes('lead');

    const maxBudget = Number(job.budgetMax || 0);
    const minBudget = Number(job.budgetMin || 0);
    const isHighValue = maxBudget >= 1000 || minBudget >= 1000;

    if (hasAI || isSenior || isHighValue) {
      return 'anthropic/claude-3-5-sonnet';
    }

    const isDevOrDesign = titleLower.includes('react') || titleLower.includes('typescript') || titleLower.includes('figma') ||
                          titleLower.includes('wordpress') || titleLower.includes('developer') || titleLower.includes('design') ||
                          descLower.includes('react') || descLower.includes('typescript') || descLower.includes('figma') ||
                          descLower.includes('wordpress') || descLower.includes('developer') || descLower.includes('design') ||
                          tagsLower.some((t: string) => t.includes('react') || t.includes('typescript') || t.includes('figma') || t.includes('wordpress') || t.includes('developer') || t.includes('design'));

    if (isDevOrDesign) {
      return 'meta-llama/llama-3-70b-instruct';
    }

    return 'deepseek/deepseek-chat';
  }
}
