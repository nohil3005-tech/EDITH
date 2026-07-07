// ─── Default user (single-user desktop system) ───────────────
export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

// ─── Agent names ─────────────────────────────────────────────
export const FREELANCE_AGENTS = [
  'content-writer', 'graphic-designer', 'ui-ux-designer', 'video-editor',
  'web-developer', 'data-analyst', 'seo-specialist', 'translator',
  'voice-over', 'social-media-manager', 'virtual-assistant',
  'ai-consultant', 'ecommerce-specialist',
] as const;

export const DROPSHIPPING_AGENTS = [
  'product-discovery', 'product-validator', 'store-builder',
  'ad-generator', 'optimizer',
] as const;

export type FreelanceAgentName   = typeof FREELANCE_AGENTS[number];
export type DropshippingAgentName = typeof DROPSHIPPING_AGENTS[number];

// ─── Queue names ─────────────────────────────────────────────
export const QUEUE_NAMES = {
  SCRAPING:           'scraping',
  PROPOSALS:          'proposals',
  EXECUTION_CONTENT:  'execution_content',
  EXECUTION_DESIGN:   'execution_design',
  EXECUTION_VIDEO:    'execution_video',
  VALIDATION:         'validation',
  ADS_GENERATION:     'ads_generation',
  OPTIMIZATION:       'optimization',
  EMAIL:              'email',
  PAYMENT:            'payment',
} as const;

export const QUEUE_CONCURRENCY = {
  scraping: 1, proposals: 3, execution_content: 5,
  execution_design: 3, execution_video: 2, validation: 2,
  ads_generation: 3, optimization: 1, email: 2, payment: 2,
};

// ─── Status constants ─────────────────────────────────────────
export const JOB_STATUS       = { NEW:'new', SAVED:'saved', DISMISSED:'dismissed', APPLIED:'applied', ACTIVE:'active', COMPLETED:'completed', FAILED:'failed' } as const;
export const PROPOSAL_STATUS  = { DRAFT:'draft', SENT:'sent', ACCEPTED:'accepted', REJECTED:'rejected' } as const;
export const JOB_COLUMN       = { PLANNING:'planning', IN_EXECUTION:'in_execution', QC_REVIEW:'qc_review', READY_TO_DELIVER:'ready_to_deliver' } as const;
export const INVOICE_STATUS   = { DRAFT:'draft', SENT:'sent', PAID:'paid', OVERDUE:'overdue', CANCELLED:'cancelled' } as const;
export const PAYMENT_GATEWAY  = { STRIPE:'stripe', RAZORPAY:'razorpay', MANUAL:'manual' } as const;
export const STORE_STATUS     = { NEW:'new', TESTING:'testing', SCALING:'scaling', PAUSED:'paused', KILLED:'killed' } as const;
export const AD_STATUS        = { DRAFT:'draft', ACTIVE:'active', PAUSED:'paused', KILLED:'killed' } as const;

// ─── Misc ─────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE  = 20;
export const MAX_PAGE_SIZE      = 100;
export const CHAT_CONTEXT_WINDOW = 10;
export const VALIDATION_STEPS   = ['trend-analysis','competition-check','supplier-verification','margin-calculation','audience-fit'] as const;
export const LLM_MODELS         = { FAST:'deepseek/deepseek-chat', SMART:'openai/gpt-4o', MINI:'openai/gpt-4o-mini' } as const;
