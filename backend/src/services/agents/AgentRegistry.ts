import { BaseAgent } from './BaseAgent';
import { ContentAgent } from './ContentAgent';
import { GraphicDesignAgent } from './GraphicDesignAgent';
import { UIUXAgent } from './UIUXAgent';
import { VideoEditingAgent } from './VideoEditingAgent';
import { WebDevAgent } from './WebDevAgent';
import { DataAgent } from './DataAgent';
import { SEOAgent } from './SEOAgent';
import { TranslationAgent } from './TranslationAgent';
import { VoiceAgent } from './VoiceAgent';
import { SocialMediaAgent } from './SocialMediaAgent';
import { VirtualAssistantAgent } from './VirtualAssistantAgent';
import { AIConsultingAgent } from './AIConsultingAgent';
import { EcommerceServicesAgent } from './EcommerceServicesAgent';
import { DiscoveryAgent } from './DiscoveryAgent';
import { ValidationAgent } from './ValidationAgent';
import { StoreBuilderAgent } from './StoreBuilderAgent';
import { AdGeneratorAgent } from './AdGeneratorAgent';
import { OptimizerAgent } from './OptimizerAgent';
import { FREELANCE_AGENTS, DROPSHIPPING_AGENTS } from '../../config/constants';

type AgentClass = new () => BaseAgent;

const AGENT_MAP: Record<string, AgentClass> = {
  // Freelance agents
  'content-writer': ContentAgent,
  'graphic-designer': GraphicDesignAgent,
  'ui-ux-designer': UIUXAgent,
  'video-editor': VideoEditingAgent,
  'web-developer': WebDevAgent,
  'data-analyst': DataAgent,
  'seo-specialist': SEOAgent,
  'translator': TranslationAgent,
  'voice-over': VoiceAgent,
  'social-media-manager': SocialMediaAgent,
  'virtual-assistant': VirtualAssistantAgent,
  'ai-consultant': AIConsultingAgent,
  'ecommerce-specialist': EcommerceServicesAgent,
  // Dropshipping agents
  'product-discovery': DiscoveryAgent,
  'product-validator': ValidationAgent,
  'store-builder': StoreBuilderAgent,
  'ad-generator': AdGeneratorAgent,
  'optimizer': OptimizerAgent,
};

// Singleton instances — created on first access
const instances = new Map<string, BaseAgent>();

export class AgentRegistry {
  /**
   * Get a singleton agent instance by name
   */
  static get(name: string): BaseAgent {
    if (!instances.has(name)) {
      const AgentClass = AGENT_MAP[name];
      if (!AgentClass) {
        throw new Error(`Unknown agent: "${name}". Available: ${Object.keys(AGENT_MAP).join(', ')}`);
      }
      instances.set(name, new AgentClass());
    }
    return instances.get(name)!;
  }

  /**
   * List all registered agent names
   */
  static listAll(): string[] {
    return Object.keys(AGENT_MAP);
  }

  /**
   * List freelance agent names
   */
  static listFreelance(): string[] {
    return [...FREELANCE_AGENTS];
  }

  /**
   * List dropshipping agent names
   */
  static listDropshipping(): string[] {
    return [...DROPSHIPPING_AGENTS];
  }

  /**
   * Check if an agent name is valid
   */
  static isValid(name: string): boolean {
    return name in AGENT_MAP;
  }

  /**
   * Execute an agent by name and return the result
   */
  static async execute(
    agentName: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const agent = AgentRegistry.get(agentName);
    return agent.execute(input);
  }
}
