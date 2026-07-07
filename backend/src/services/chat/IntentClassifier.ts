import { getLLMClient } from '../../utils/llmClient';
import { CommandType, ParsedCommand } from '../../types/chat';

const INTENTS: CommandType[] = [
  'job_scan','generate_proposal','execute_job','deliver_job',
  'product_scan','validate_product','build_store','generate_ads',
  'optimize_ads','create_invoice','send_invoice','view_analytics',
  'system_status','general_chat',
];

export class IntentClassifier {
  private readonly llm = getLLMClient();

  /**
   * Use rule-based parsing first; fall back to LLM only if confidence is low.
   */
  async classify(message: string, ruleBased: ParsedCommand): Promise<ParsedCommand> {
    if (ruleBased.confidence >= 0.85) return ruleBased;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === 'placeholder' || apiKey === 'PASTE_YOUR_KEY_HERE' || apiKey.includes('PASTE_YOUR_KEY_HERE')) {
      return { ...ruleBased, intent: 'general_chat', confidence: 0.5 };
    }

    try {
      const prompt = `Classify this user message for an AI business platform:
"${message}"

Available intents: ${INTENTS.join(', ')}

Return JSON only:
{
  "intent": "one of the available intents",
  "entities": { "key": "value" },
  "confidence": 0.9
}`;

      const response = await this.llm.complete(prompt, { maxTokens: 200, temperature: 0.1 });
      const clean = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean) as { intent: CommandType; entities: Record<string, unknown>; confidence: number };

      return {
        intent: INTENTS.includes(parsed.intent) ? parsed.intent : 'general_chat',
        entities: parsed.entities || {},
        confidence: parsed.confidence || 0.7,
        rawText: message,
      };
    } catch {
      return { ...ruleBased, intent: 'general_chat', confidence: 0.5 };
    }
  }
}
