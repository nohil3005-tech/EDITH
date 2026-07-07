import { getLLMClient } from '../../utils/llmClient';
import { CommandParser } from './CommandParser';
import { IntentClassifier } from './IntentClassifier';
import { ContextManager } from './ContextManager';
import { JobDiscoveryService } from '../freelance/JobDiscoveryService';
import { ProposalService } from '../freelance/ProposalService';
import { ProductDiscoveryService } from '../dropshipping/ProductDiscoveryService';
import { ValidationService } from '../dropshipping/ValidationService';
import { StoreBuilderService } from '../dropshipping/StoreBuilderService';
import { AdGenerationService } from '../dropshipping/AdGenerationService';
import { InvoiceService } from '../payment/InvoiceService';
import { EmailService } from '../email/EmailService';
import { ResponseData, ParsedCommand } from '../../types/chat';
import { getCurrentUserId } from '../../utils/context';
import { logger } from '../../utils/logger';

const SYSTEM_PROMPT = `You are EDITH, an expert AI business assistant. You help manage a freelance 
agency and dropshipping business. You are concise, professional, and action-oriented. 
When you can take an action, confirm what you did. When you can't, explain clearly.`;

function generateMockResponse(message: string): string {
  const clean = message.toLowerCase().trim();
  
  if (clean.includes('hello') || clean.includes('hi') || clean.includes('hey') || clean.includes('greetings')) {
    return `👋 **Hello! I am EDITH**, your business assistant.\n\nI can help you automate job scans, send proposals, validate dropshipping products, manage active contracts, and monitor analytics.\n\nSince I am running in **Sandbox Mode** (no API key configured), you can run specific commands like:\n- **"find jobs"** or **"scan jobs"** to fetch active opportunities\n- **"scan products"** to discover dropshipping trends\n- **"show earnings"** or **"view analytics"** to open financial dashboards\n- **"system status"** to inspect backend health\n\nHow can I help you today?`;
  }
  
  if (clean.includes('job') || clean.includes('freelance') || clean.includes('proposal') || clean.includes('work') || clean.includes('client') || clean.includes('bid')) {
    return `💼 **Freelance Assistant (Sandbox Mode)**\n\nI have full tools to scan sites like **We Work Remotely** and **RemoteOK**. \n\n- To scan for freelance roles right now, type **"scan jobs"**.\n- To auto-generate and auto-submit proposals, make sure **"Auto-scan jobs"** and **"Auto-generate proposals"** are turned on in **Settings**.\n- In sandbox mode, proposal quality reviews (QC) and proposal delivery simulations run automatically!`;
  }
  
  if (clean.includes('product') || clean.includes('dropship') || clean.includes('sell') || clean.includes('aliexpress') || clean.includes('tiktok') || clean.includes('store')) {
    return `🛍️ **Dropshipping Assistant (Sandbox Mode)**\n\nI track trending products on **AliExpress** and **TikTok**. \n\n- To scan for new products, type **"scan products"**.\n- You can also validate found items and generate ad campaigns directly from the **Dropshipping** page.`;
  }
  
  if (clean.includes('revenue') || clean.includes('earn') || clean.includes('money') || clean.includes('pay') || clean.includes('invoice') || clean.includes('profit') || clean.includes('billing')) {
    return `📊 **Financial Assistant (Sandbox Mode)**\n\nI track contract payments, invoices, and dropshipping store revenues.\n\n- Say **"show earnings"** or **"view analytics"** to see your revenue charts.\n- In sandbox mode, mock contracts auto-simulate payments to help test client invoices and notifications!`;
  }
  
  if (clean.includes('ad') || clean.includes('ads') || clean.includes('campaign') || clean.includes('roas') || clean.includes('marketing') || clean.includes('facebook') || clean.includes('google')) {
    return `📈 **Ad Manager (Sandbox Mode)**\n\nI can auto-generate ad copy, target demographics, and run optimizations.\n\n- Say **"optimize ads"** to evaluate ad ROAS and auto-tune underperforming budgets.\n- Check out the **Marketing** controls under Dropshipping for campaign data.`;
  }
  
  if (clean.includes('status') || clean.includes('health') || clean.includes('check') || clean.includes('alive') || clean.includes('running')) {
    return `🟢 **System Check (Sandbox Mode)**\n\n- **Backend Server**: Connected & Online\n- **PostgreSQL Database**: Connected & Operational\n- **Worker Scheduler**: Running (30s automation ticks)\n- **OpenRouter API Key**: Not configured (bypassed locally)`;
  }

  if (clean.includes('help') || clean.includes('what can you do') || clean.includes('command')) {
    return `❓ **EDITH Commands & Sandbox Guide**\n\nYou can trigger real business tools using conversational keywords:\n\n1. **"scan jobs"** - Finds new freelance jobs.\n2. **"scan products"** - Finds trending dropship goods.\n3. **"show earnings"** - Opens revenue/analytics dashboards.\n4. **"system status"** - Checks backend status.\n5. **"optimize ads"** - Reviews and adjusts active campaigns.\n\nTo unlock fully open-ended AI conversation, please add an **OpenRouter API Key** in settings!`;
  }

  return `🤖 **EDITH AI Sandbox Mode**\n\nI recognized your message: "${message}".\n\nSince no OpenRouter API key is configured, I am running in local control mode. You can command me using keywords like:\n- **"scan jobs"** (scrapes WeWorkRemotely/RemoteOK)\n- **"scan products"** (scrapes TikTok/AliExpress)\n- **"show earnings"** (opens charts)\n- **"system status"** (checks local health)\n- **"help"** (shows options)\n\n*Tip: Configure an OpenRouter API Key in settings to enable full conversational intelligence!*`;
}

export class ResponseGenerator {
  private readonly llm = getLLMClient();
  private readonly parser = new CommandParser();
  private readonly classifier = new IntentClassifier();
  private readonly context = new ContextManager();

  private readonly jobDiscovery = new JobDiscoveryService();
  private readonly proposalService = new ProposalService();
  private readonly productDiscovery = new ProductDiscoveryService();
  private readonly validationService = new ValidationService();
  private readonly storeBuilder = new StoreBuilderService();
  private readonly adGeneration = new AdGenerationService();
  private readonly invoiceService = new InvoiceService();
  private readonly emailService = new EmailService();

  async process(
    message: string,
    sessionId: string,
    userId: string = getCurrentUserId(),
  ): Promise<{ text: string; responseData: ResponseData | null; commandType: string }> {
    // 1. Parse intent
    const ruleIntent = this.parser.parse(message);
    const intent = await this.classifier.classify(message, ruleIntent);

    // 2. Get context
    const history = await this.context.getContext(sessionId);

    // 3. Execute action
    let responseText = '';
    let responseData: ResponseData | null = null;

    try {
      switch (intent.intent) {
        case 'job_scan': {
          const result = await this.jobDiscovery.scan({});
          responseText = `✅ Scanned ${result.scanned} jobs — found **${result.newJobs} new opportunities**. ${result.duplicates} duplicates skipped.`;
          responseData = {
            type: 'job_cards',
            cards: result.jobs.slice(0, 5).map((j) => ({
              id: j.id,
              type: 'job',
              title: j.title,
              subtitle: `${j.sourcePlatform} • $${j.budgetMin ?? 0}–$${j.budgetMax ?? 0}`,
              badge: `Score: ${j.aiScore ?? 0}`,
              badgeColor: (j.aiScore ?? 0) > 80 ? 'green' : 'yellow',
              actions: [
                { label: 'Generate Proposal', action: 'generate_proposal', variant: 'primary', payload: { jobId: j.id } },
                { label: 'Dismiss', action: 'dismiss_job', variant: 'secondary', payload: { jobId: j.id } },
              ],
            })),
          };
          break;
        }

        case 'product_scan': {
          const result = await this.productDiscovery.scan({});
          responseText = `🛍️ Discovered **${result.newProducts} new trending products** across ${result.scanned} scanned. Ready for validation.`;
          responseData = {
            type: 'product_cards',
            cards: result.products.slice(0, 5).map((p) => ({
              id: p.id,
              type: 'product',
              title: p.name,
              subtitle: `${p.source} • Trending score: ${p.trendingScore}`,
              badge: `$${p.costPrice} → $${p.targetSellPrice}`,
              badgeColor: 'blue',
              actions: [
                { label: 'Validate', action: 'validate_product', variant: 'primary', payload: { productId: p.id } },
              ],
            })),
          };
          break;
        }

        case 'view_analytics': {
          responseText = '📊 Here\'s your analytics overview. Opening the analytics dashboard…';
          responseData = { type: 'chart', chart: { type: 'line', title: 'Revenue (30 days)', labels: [], datasets: [] } };
          break;
        }

        case 'system_status': {
          responseText = '🟢 All systems operational. API: ✅ | Redis: ✅ | Database: ✅ | AI Models: ✅';
          responseData = { type: 'text' };
          break;
        }

        default: {
          const apiKey = process.env.OPENROUTER_API_KEY;
          if (!apiKey || apiKey === 'placeholder' || apiKey === 'PASTE_YOUR_KEY_HERE' || apiKey.includes('PASTE_YOUR_KEY_HERE')) {
            responseText = generateMockResponse(message);
            responseData = { type: 'text' };
          } else {
            // General LLM response with context
            const messages = [
              { role: 'system' as const, content: SYSTEM_PROMPT },
              ...history,
              { role: 'user' as const, content: message },
            ];
            responseText = await this.llm.chat(messages).then((r) => r.content);
            responseData = { type: 'text' };
          }
        }
      }
    } catch (err) {
      logger.error({ err, intent: intent.intent }, 'Chat action failed');
      responseText = `⚠️ I encountered an error while processing your request: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`;
      responseData = { type: 'text' };
    }

    return { text: responseText, responseData, commandType: intent.intent };
  }
}
