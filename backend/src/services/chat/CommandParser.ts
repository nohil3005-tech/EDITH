import { ParsedCommand, CommandType } from '../../types/chat';

const INTENT_PATTERNS: Array<{ pattern: RegExp; intent: CommandType; extract?: (m: RegExpMatchArray) => Record<string, unknown> }> = [
  { pattern: /scan\s+(jobs?|freelance|upwork|fiverr|toptal|contra|peopleperhour|freelancer)/i, intent: 'job_scan' },
  { pattern: /scan\s+(products?|dropshipping|aliexpress|tiktok)/i, intent: 'product_scan' },
  { pattern: /generate?\s+proposal\s+for\s+(.+)/i, intent: 'generate_proposal', extract: (m) => ({ jobTitle: m[1] }) },
  { pattern: /create?\s+(?:an?\s+)?invoice\s+for\s+(.+)/i, intent: 'create_invoice', extract: (m) => ({ client: m[1] }) },
  { pattern: /send\s+invoice\s+(?:to\s+)?(.+)/i, intent: 'send_invoice', extract: (m) => ({ target: m[1] }) },
  { pattern: /validate?\s+product\s+(.+)/i, intent: 'validate_product', extract: (m) => ({ productName: m[1] }) },
  { pattern: /build\s+(?:a\s+)?store\s+for\s+(.+)/i, intent: 'build_store', extract: (m) => ({ product: m[1] }) },
  { pattern: /generate?\s+ads?\s+for\s+(.+)/i, intent: 'generate_ads', extract: (m) => ({ target: m[1] }) },
  { pattern: /optimi[sz]e\s+(?:all\s+)?ads?/i, intent: 'optimize_ads' },
  { pattern: /execute?\s+job\s+(.+)/i, intent: 'execute_job', extract: (m) => ({ jobRef: m[1] }) },
  { pattern: /deliver\s+(?:job\s+)?(.+)/i, intent: 'deliver_job', extract: (m) => ({ jobRef: m[1] }) },
  { pattern: /(show|view|get)\s+(?:me\s+)?(analytics|revenue|earnings|profit)/i, intent: 'view_analytics' },
  { pattern: /(system\s+status|health\s+check|how\s+is\s+everything|queue\s+status)/i, intent: 'system_status' },
];

export class CommandParser {
  parse(message: string): ParsedCommand {
    const normalised = message.trim().toLowerCase();

    for (const { pattern, intent, extract } of INTENT_PATTERNS) {
      const match = message.match(pattern);
      if (match) {
        return {
          intent,
          entities: extract ? extract(match) : {},
          confidence: 0.92,
          rawText: message,
        };
      }
    }

    return {
      intent: 'general_chat',
      entities: {},
      confidence: 1.0,
      rawText: message,
    };
  }
}
