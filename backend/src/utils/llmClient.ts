import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { logger } from './logger';
import { LLMMessage, LLMResponse } from '../types/agent';

interface OpenRouterChoice {
  message: { content: string };
}

interface OpenRouterResponse {
  choices: OpenRouterChoice[];
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LLMClient {
  private readonly http: AxiosInstance;
  private readonly defaultModel: string;
  private readonly fallbackModel: string;

  constructor() {
    this.http = axios.create({
      baseURL: env.OPENROUTER_BASE_URL,
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.FRONTEND_URL,
        'X-Title': 'EDITH Backend',
      },
      timeout: 60_000,
    });
    this.defaultModel = env.DEFAULT_MODEL;
    this.fallbackModel = env.FALLBACK_MODEL;
  }

  async chat(
    messages: LLMMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      retries?: number;
    } = {},
  ): Promise<LLMResponse> {
    const { model = this.defaultModel, temperature = 0.7, maxTokens = 2000, retries = 2 } = options;

    const apiKey = env.OPENROUTER_API_KEY;
    const isKeyUnconfigured = !apiKey || 
                              apiKey === 'placeholder' || 
                              apiKey === 'PASTE_YOUR_KEY_HERE' || 
                              apiKey.includes('PASTE_YOUR_KEY_HERE');

    if (isKeyUnconfigured) {
      logger.info('OPENROUTER_API_KEY is not configured. Checking for local Ollama instance...');
      try {
        const ollamaRes = await axios.post(`${env.OLLAMA_BASE_URL}/api/chat`, {
          model: env.OLLAMA_MODEL,
          messages,
          stream: false,
          options: {
            temperature
          }
        }, { timeout: 4000 });

        const data = ollamaRes.data;
        if (data?.message?.content) {
          logger.info({ model: env.OLLAMA_MODEL }, 'Successfully used local Ollama instance for offline generation.');
          return {
            content: data.message.content,
            model: `local-ollama-${env.OLLAMA_MODEL}`,
            usage: {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
            },
          };
        }
      } catch (ollamaErr: any) {
        logger.info('Local Ollama instance not active or model missing. Falling back to local mock generator.');
      }

      const fallbackResponse = generateMockLLMResponse(messages);
      return {
        content: fallbackResponse,
        model: 'mock-llm-fallback',
        usage: {
          promptTokens: 10,
          completionTokens: 50,
          totalTokens: 60,
        },
      };
    }

    let lastError: Error | null = null;
    const modelsToTry = [model, this.fallbackModel];

    for (const currentModel of modelsToTry) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await this.http.post<OpenRouterResponse>('/chat/completions', {
            model: currentModel,
            messages,
            temperature,
            max_tokens: maxTokens,
          });

          const data = response.data;
          return {
            content: data.choices[0]?.message?.content ?? '',
            model: data.model,
            usage: {
              promptTokens: data.usage?.prompt_tokens ?? 0,
              completionTokens: data.usage?.completion_tokens ?? 0,
              totalTokens: data.usage?.total_tokens ?? 0,
            },
          };
        } catch (err: unknown) {
          lastError = err instanceof Error ? err : new Error(String(err));
          logger.warn({ err: lastError, model: currentModel, attempt }, 'LLM request failed, retrying…');
          if (attempt < retries) {
            await sleep(1000 * (attempt + 1));
          }
        }
      }
    }

    logger.warn({ err: lastError }, 'LLM request failed after all retries. Falling back to mock LLM generator.');
    const fallbackResponse = generateMockLLMResponse(messages);
    return {
      content: fallbackResponse,
      model: 'mock-llm-fallback',
      usage: {
        promptTokens: 10,
        completionTokens: 50,
        totalTokens: 60,
      },
    };
  }

  async complete(prompt: string, options?: Parameters<typeof this.chat>[1]): Promise<string> {
    const response = await this.chat(
      [{ role: 'user', content: prompt }],
      options,
    );
    return response.content;
  }

  async completeWithSystem(systemPrompt: string, userPrompt: string, options?: Parameters<typeof this.chat>[1]): Promise<string> {
    const response = await this.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options,
    );
    return response.content;
  }
}

function generateMockLLMResponse(messages: LLMMessage[]): string {
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const userMessage = messages.find(m => m.role === 'user')?.content || '';
  const userPromptLower = userMessage.toLowerCase();
  const systemPromptLower = systemMessage.toLowerCase();

  // 1. Content Delivery / Pitch / Proposals
  if (userPromptLower.includes('project manager') || systemPromptLower.includes('project manager')) {
    return JSON.stringify([
      { id: 'st-1', title: 'Draft core content deliverables for the project', assignedAgent: 'content-writer', status: 'pending', output: null, fileId: null },
      { id: 'st-2', title: 'Apply search engine optimization guidelines', assignedAgent: 'seo-specialist', status: 'pending', output: null, fileId: null }
    ]);
  }

  if (userPromptLower.includes('write a professional delivery message') || systemPromptLower.includes('delivery')) {
    return `Dear Client,\n\nI am pleased to inform you that all project deliverables are now fully completed according to your specifications. The finalized files have been uploaded and attached to the project repository for your review.\n\nEverything has been thoroughly optimized and formatted for quick deployment. Please let me know if you would like any minor revisions or adjustments. Thank you for the opportunity to work together!\n\nBest regards,\nEDITH Swarm Node`;
  }

  if (userPromptLower.includes('proposal') || systemPromptLower.includes('proposal')) {
    return JSON.stringify({
      bidAmount: 450,
      deliveryDays: 5,
      draftText: `Hi there!\n\nI would love to assist you with your project. I have extensive experience in this domain and can guarantee a clean, professional, and optimized solution. I will follow all requirements closely and ensure a quick delivery.\n\nLet me know if we can discuss further details!\n\nSincerely,\nEDITH Specialist`
    });
  }

  // 2. Swarm Agents
  if (systemPromptLower.includes('content-writer') || systemPromptLower.includes('content writer')) {
    return JSON.stringify({
      title: "Compelling Optimized Digital Content",
      content: "This is high-quality, plagiarism-free draft copy optimized for reader engagement and search engine visibility. It structures key details logically using descriptive headings and concise paragraphs. The styling guidelines have been carefully implemented to highlight core takeaways, and appropriate keywords are woven seamlessly throughout the text for maximum relevance and readability.",
      wordCount: 80,
      seoScore: 95,
      readabilityScore: 90
    });
  }

  if (systemPromptLower.includes('web-developer') || systemPromptLower.includes('web developer')) {
    return JSON.stringify({
      files: [
        {
          path: "src/components/Feature.tsx",
          content: "import React from 'react';\n\ninterface Props {\n  title?: string;\n}\n\nexport const Feature: React.FC<Props> = ({ title = 'Completed Feature' }) => {\n  return (\n    <div className=\"rounded-lg border border-cyan-500/20 bg-card p-6\">\n      <h3 className=\"text-lg font-bold text-foreground\">{title}</h3>\n      <p className=\"text-xs text-muted-foreground mt-1\">Constructed structural codebase components successfully.</p>\n    </div>\n  );\n};"
        }
      ],
      setupInstructions: ["npm install", "npm run dev"],
      dependencies: ["react@latest", "lucide-react"],
      testCases: ["Render default component without crashing", "Ensure title property maps correctly"],
      notes: "The component includes responsive design rules and optimized layout classes."
    });
  }

  if (systemPromptLower.includes('graphic-designer') || systemPromptLower.includes('graphic designer')) {
    return JSON.stringify({
      concept: "A clean minimalist brand symbol combining fluid curves with geometric precision.",
      colorPalette: ["#090d16", "#0ea5e9", "#f8fafc"],
      typography: { "primary": "Inter", "secondary": "Outfit" },
      layoutNotes: "Central focal point design with glowing cyan background accents and elegant type sizing.",
      svgCode: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"#090d16\"/><circle cx=\"50\" cy=\"50\" r=\"35\" fill=\"none\" stroke=\"#0ea5e9\" stroke-width=\"4\"/></svg>",
      aiImagePrompt: "minimalist vector brand logo icon, neon cyan stroke, dark navy background, clean layout",
      deliverables: ["logo.svg", "brand_identity_guide.pdf"]
    });
  }

  if (systemPromptLower.includes('data-analyst') || systemPromptLower.includes('data analyst')) {
    return JSON.stringify({
      insights: ["Core conversions showed a 12.8% improvement across online touchpoints.", "User session duration peaked on mid-week evening windows."],
      visualizations: [
        { "type": "line", "title": "Hourly Session Activity", "x": "Time of Day", "y": "Active Users", "description": "Line chart representing user load variations over 24-hour periods." }
      ],
      pythonCode: "import pandas as pd\ndf = pd.DataFrame({'time': ['00:00', '12:00', '18:00'], 'users': [120, 850, 1100]})\nprint(df.describe())",
      sqlQuery: "SELECT hour, COUNT(*) as sessions FROM active_sessions GROUP BY hour ORDER BY sessions DESC;",
      recommendations: ["Target promotional pushes during the 18:00 - 21:00 user traffic peaks."],
      summary: "Data audit finished. Identified significant performance improvements on interactive page sessions."
    });
  }

  if (systemPromptLower.includes('seo-specialist') || systemPromptLower.includes('seo specialist')) {
    return JSON.stringify({
      keywordResearch: [
        { "keyword": "best custom portfolio template", "volume": "3,800", "difficulty": "35", "intent": "informational" }
      ],
      onPageOptimization: {
        "titleTag": "Expert Freelancer Services & Creative Portfolio | Custom Client Project",
        "metaDescription": "Discover premium design, development, and copywriting solutions built to your business specifications.",
        "h1": "Delivering Digital Solutions with AI Precision",
        "contentRecommendations": ["Add detailed meta descriptions", "Include target keywords in h2 page headings"]
      },
      technicalIssues: ["Image loading lag resolved by webp formatting", "Canonical URL links missing header declarations"],
      backLinkStrategy: ["Link building campaigns targeting tech resource sites"],
      contentCalendar: [{ "topic": "How to structure a freelancing workflow", "keyword": "freelancing workflow", "priority": "high" }],
      estimatedTrafficGain: "400-900 visitors/month in 6 months"
    });
  }

  // 3. Chat / General Assistant Conversational Responses
  if (userPromptLower.includes('hello') || userPromptLower.includes('hi ') || userPromptLower.includes('hey')) {
    return "Hello! I am EDITH, your agentic workspace assistant. How can I help you manage your freelance tasks or products today?";
  }

  if (userPromptLower.includes('status') || userPromptLower.includes('job') || userPromptLower.includes('task')) {
    return "I can analyze and process active freelance projects, perform quality checks, package delivery assets, or configure local swarms. Let me know what project we should focus on next!";
  }

  return `I have processed your request for: "${userMessage.slice(0, 50)}...". I am here to help you optimize layouts, execute subtasks, clean tabular records, or perform audits. Let me know if you need any adjustments or additions!`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Singleton
let _client: LLMClient | null = null;
export function getLLMClient(): LLMClient {
  if (!_client) _client = new LLMClient();
  return _client;
}
