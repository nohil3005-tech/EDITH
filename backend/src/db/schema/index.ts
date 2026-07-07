/**
 * EDITH Desktop — Drizzle SQLite Schema
 * Replaces PostgreSQL UUID types with SQLite text for PKs.
 * All tables use TEXT primary keys (UUIDs stored as text strings).
 */

import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Helper: current timestamp ───────────────────────────────
const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

// ─── users ───────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  supabaseId: text('supabase_id'),
  role: text('role').notNull().default('user'),
  status: text('status').notNull().default('active'),
  profile: text('profile', { mode: 'json' }).notNull().default('{}'),
  preferences: text('preferences', { mode: 'json' }).notNull().default('{}'),
  paymentSettings: text('payment_settings', { mode: 'json' }).notNull().default('{}'),
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(now as unknown as string),
  updatedAt: text('updated_at').notNull().default(now as unknown as string),
});

// ─── activity_log ─────────────────────────────────────────────
export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  description: text('description').notNull(),
  metadata: text('metadata', { mode: 'json' }).notNull().default('{}'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
});

// ─── freelance_jobs ───────────────────────────────────────────
export const freelanceJobs = sqliteTable('freelance_jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sourcePlatform: text('source_platform').notNull(),
  externalId: text('external_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  budgetMin: real('budget_min'),
  budgetMax: real('budget_max'),
  clientRating: real('client_rating'),
  deadline: text('deadline'),
  tags: text('tags', { mode: 'json' }).notNull().default('[]'),
  aiScore: real('ai_score'),
  aiInsights: text('ai_insights', { mode: 'json' }),
  status: text('status').notNull().default('new'),
  rawData: text('raw_data', { mode: 'json' }),
  createdAt: text('created_at').notNull().default(now as unknown as string),
  updatedAt: text('updated_at').notNull().default(now as unknown as string),
});

// ─── proposals ───────────────────────────────────────────────
export const proposals = sqliteTable('proposals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull().references(() => freelanceJobs.id, { onDelete: 'cascade' }),
  draftText: text('draft_text').notNull().default(''),
  finalText: text('final_text'),
  bidAmount: real('bid_amount'),
  deliveryDays: integer('delivery_days'),
  portfolioItems: text('portfolio_items', { mode: 'json' }).notNull().default('[]'),
  status: text('status').notNull().default('draft'),
  humanModifiedAt: text('human_modified_at'),
  sentAt: text('sent_at'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
  updatedAt: text('updated_at').notNull().default(now as unknown as string),
});

// ─── active_freelance_jobs ────────────────────────────────────
export const activeFreelanceJobs = sqliteTable('active_freelance_jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull().references(() => freelanceJobs.id, { onDelete: 'cascade' }),
  proposalId: text('proposal_id').references(() => proposals.id),
  column: text('column_name').notNull().default('planning'),
  subtasks: text('subtasks', { mode: 'json' }).notNull().default('[]'),
  qcResults: text('qc_results', { mode: 'json' }),
  deliveryFiles: text('delivery_files', { mode: 'json' }).notNull().default('[]'),
  deliveryMessage: text('delivery_message'),
  clientRating: real('client_rating'),
  feedback: text('feedback'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
  updatedAt: text('updated_at').notNull().default(now as unknown as string),
});

// ─── freelance_deliveries ─────────────────────────────────────
export const freelanceDeliveries = sqliteTable('freelance_deliveries', {
  id: text('id').primaryKey(),
  activeJobId: text('active_job_id').notNull().references(() => activeFreelanceJobs.id, { onDelete: 'cascade' }),
  files: text('files', { mode: 'json' }).notNull().default('[]'),
  deliveryMessage: text('delivery_message').notNull().default(''),
  clientResponse: text('client_response'),
  revisionCount: integer('revision_count').notNull().default(0),
  createdAt: text('created_at').notNull().default(now as unknown as string),
});

// ─── dropshipping_products ────────────────────────────────────
export const dropshippingProducts = sqliteTable('dropshipping_products', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  source: text('source').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  costPrice: real('cost_price').notNull().default(0),
  targetSellPrice: real('target_sell_price').notNull().default(0),
  category: text('category').notNull().default('general'),
  trendingScore: real('trending_score').notNull().default(0),
  trendData: text('trend_data', { mode: 'json' }),
  validationStatus: text('validation_status').notNull().default('pending'),
  aiScore: real('ai_score'),
  images: text('images', { mode: 'json' }).notNull().default('[]'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
  updatedAt: text('updated_at').notNull().default(now as unknown as string),
});

// ─── validation_results ───────────────────────────────────────
export const validationResults = sqliteTable('validation_results', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => dropshippingProducts.id, { onDelete: 'cascade' }),
  stepName: text('step_name').notNull(),
  status: text('status').notNull().default('pending'),
  resultData: text('result_data', { mode: 'json' }),
  completedAt: text('completed_at'),
});

// ─── dropshipping_stores ──────────────────────────────────────
export const dropshippingStores = sqliteTable('dropshipping_stores', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => dropshippingProducts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  domain: text('domain'),
  platform: text('platform').notNull().default('shopify'),
  settings: text('settings', { mode: 'json' }).notNull().default('{}'),
  status: text('status').notNull().default('new'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
  updatedAt: text('updated_at').notNull().default(now as unknown as string),
});

// ─── store_orders ─────────────────────────────────────────────
export const storeOrders = sqliteTable('store_orders', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => dropshippingStores.id, { onDelete: 'cascade' }),
  orderData: text('order_data', { mode: 'json' }).notNull().default('{}'),
  revenue: real('revenue').notNull().default(0),
  cost: real('cost').notNull().default(0),
  placedAt: text('placed_at').notNull().default(now as unknown as string),
});

// ─── ads ─────────────────────────────────────────────────────
export const ads = sqliteTable('ads', {
  id: text('id').primaryKey(),
  storeId: text('store_id').notNull().references(() => dropshippingStores.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  creativeType: text('creative_type').notNull().default('image'),
  adName: text('ad_name').notNull(),
  spend: real('spend').notNull().default(0),
  revenue: real('revenue').notNull().default(0),
  roas: real('roas').notNull().default(0),
  status: text('status').notNull().default('draft'),
  metadata: text('metadata', { mode: 'json' }).notNull().default('{}'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
  updatedAt: text('updated_at').notNull().default(now as unknown as string),
});

// ─── payments ─────────────────────────────────────────────────
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull(),
  amount: real('amount').notNull(),
  gatewayFee: real('gateway_fee').notNull().default(0),
  platformFee: real('platform_fee').notNull().default(0),
  netAmount: real('net_amount').notNull(),
  status: text('status').notNull().default('pending'),
  gateway: text('gateway').notNull(),
  gatewayPaymentId: text('gateway_payment_id'),
  currency: text('currency').notNull().default('USD'),
  customerEmail: text('customer_email'),
  metadata: text('metadata', { mode: 'json' }).notNull().default('{}'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
  completedAt: text('completed_at'),
});

// ─── invoices ─────────────────────────────────────────────────
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  paymentId: text('payment_id').references(() => payments.id),
  invoiceNumber: text('invoice_number').notNull().unique(),
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email').notNull(),
  clientAddress: text('client_address'),
  items: text('items', { mode: 'json' }).notNull().default('[]'),
  subtotal: real('subtotal').notNull().default(0),
  tax: real('tax').notNull().default(0),
  total: real('total').notNull().default(0),
  status: text('status').notNull().default('draft'),
  paymentLink: text('payment_link'),
  notes: text('notes'),
  pdfUrl: text('pdf_url'),
  dueDate: text('due_date'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
  sentAt: text('sent_at'),
  paidAt: text('paid_at'),
});

// ─── payouts ─────────────────────────────────────────────────
export const payouts = sqliteTable('payouts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  sourceGateway: text('source_gateway').notNull(),
  destinationBank: text('destination_bank'),
  destinationAccountLast4: text('destination_account_last4'),
  status: text('status').notNull().default('pending'),
  referenceId: text('reference_id'),
  initiatedAt: text('initiated_at').notNull().default(now as unknown as string),
  completedAt: text('completed_at'),
});

// ─── agent_logs ───────────────────────────────────────────────
export const agentLogs = sqliteTable('agent_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  agentName: text('agent_name').notNull(),
  action: text('action').notNull(),
  input: text('input', { mode: 'json' }).notNull().default('{}'),
  output: text('output', { mode: 'json' }),
  error: text('error'),
  durationMs: integer('duration_ms').notNull().default(0),
  createdAt: text('created_at').notNull().default(now as unknown as string),
});

// ─── chat_sessions ────────────────────────────────────────────
export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('New Conversation'),
  contextPage: text('context_page'),
  messageCount: integer('message_count').notNull().default(0),
  createdAt: text('created_at').notNull().default(now as unknown as string),
  updatedAt: text('updated_at').notNull().default(now as unknown as string),
});

// ─── chat_messages ────────────────────────────────────────────
export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  commandType: text('command_type'),
  responseData: text('response_data', { mode: 'json' }),
  createdAt: text('created_at').notNull().default(now as unknown as string),
});

// ─── files ───────────────────────────────────────────────────
export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull().default(0),
  storageProvider: text('storage_provider').notNull().default('local'),
  storagePath: text('storage_path').notNull(),
  publicUrl: text('public_url'),
  folder: text('folder').notNull().default('general'),
  tags: text('tags', { mode: 'json' }).notNull().default('[]'),
  downloadCount: integer('download_count').notNull().default(0),
  shareToken: text('share_token').unique(),
  shareExpiresAt: text('share_expires_at'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
});

// ─── marketplace_plugins ──────────────────────────────────────
export const marketplacePlugins = sqliteTable('marketplace_plugins', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull().default(''),
  author: text('author').notNull(),
  version: text('version').notNull().default('1.0.0'),
  price: integer('price').notNull().default(0),
  rating: integer('rating').notNull().default(0),
  installs: integer('installs').notNull().default(0),
  iconUrl: text('icon_url'),
  screenshots: text('screenshots', { mode: 'json' }).notNull().default('[]'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
});

// ─── installed_plugins ────────────────────────────────────────
export const installedPlugins = sqliteTable('installed_plugins', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  pluginId: text('plugin_id').notNull().references(() => marketplacePlugins.id, { onDelete: 'cascade' }),
  enabled: text('enabled').notNull().default('true'),
  config: text('config', { mode: 'json' }).notNull().default('{}'),
  installedAt: text('installed_at').notNull().default(now as unknown as string),
});

// ─── referrals ───────────────────────────────────────────────
export const referrals = sqliteTable('referrals', {
  id: text('id').primaryKey(),
  referrerId: text('referrer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  referredEmail: text('referred_email').notNull(),
  referralCode: text('referral_code').notNull().unique(),
  status: text('status').notNull().default('pending'),
  commissionEarned: real('commission_earned').notNull().default(0),
  createdAt: text('created_at').notNull().default(now as unknown as string),
});

// ─── payment_methods ──────────────────────────────────────────
export const paymentMethods = sqliteTable('payment_methods', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  details: text('details', { mode: 'json' }).notNull().default('{}'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(now as unknown as string),
  updatedAt: text('updated_at').notNull().default(now as unknown as string),
});

// ─── user_whitelist ───────────────────────────────────────────
export const userWhitelist = sqliteTable('user_whitelist', {
  email: text('email').primaryKey(),
  role: text('role').notNull().default('user'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
});

// ─── system_settings ──────────────────────────────────────────
export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull().default('{}'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
  updatedAt: text('updated_at').notNull().default(now as unknown as string),
});

// ─── notifications ────────────────────────────────────────────
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'),
  message: text('message'),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  type: text('type'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
});

// ─── platform_accounts ─────────────────────────────────────────
export const platformAccounts = sqliteTable('platform_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platformName: text('platform_name').notNull(),
  email: text('email').notNull(),
  encryptedPassword: text('encrypted_password').notNull(),
  profileUrl: text('profile_url'),
  status: text('status').notNull().default('connected'),
  lastSyncedAt: text('last_synced_at'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
});

// ─── platform_notifications ────────────────────────────────────
export const platformNotifications = sqliteTable('platform_notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platformAccountId: text('platform_account_id').references(() => platformAccounts.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  externalUrl: text('external_url'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(now as unknown as string),
});

// ─── processor_sessions ───────────────────────────────────────
export const processorSessions = sqliteTable('processor_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull(),
  status: text('status').notNull().default('queued'),
  currentStep: text('current_step').notNull().default('planning'),
  progressPercent: integer('progress_percent').notNull().default(0),
  logs: text('logs', { mode: 'json' }).notNull().default('[]'),
  outputFiles: text('output_files', { mode: 'json' }).notNull().default('[]'),
  createdAt: text('created_at').notNull().default(now as unknown as string),
  updatedAt: text('updated_at').notNull().default(now as unknown as string),
});

// ─── user_platforms ───────────────────────────────────────────
export const userPlatforms = sqliteTable('user_platforms', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platformName: text('platform_name').notNull(),
  platformUrl: text('platform_url').notNull(),
  iconUrl: text('icon_url'),
  status: text('status').notNull().default('Not connected'),
  lastSynced: text('last_synced'),
  notificationsCount: integer('notifications_count').notNull().default(0),
  messagesCount: integer('messages_count').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(now as unknown as string),
  updatedAt: text('updated_at').notNull().default(now as unknown as string),
});

// ─── Type exports ─────────────────────────────────────────────
export type UserInsert = typeof users.$inferInsert;
export type UserSelect = typeof users.$inferSelect;
export type FreelanceJobInsert = typeof freelanceJobs.$inferInsert;
export type FreelanceJobSelect = typeof freelanceJobs.$inferSelect;
export type ProposalInsert = typeof proposals.$inferInsert;
export type ProposalSelect = typeof proposals.$inferSelect;
export type InvoiceInsert = typeof invoices.$inferInsert;
export type InvoiceSelect = typeof invoices.$inferSelect;
export type AgentLogInsert = typeof agentLogs.$inferInsert;
export type AgentLogSelect = typeof agentLogs.$inferSelect;
export type PaymentMethodInsert = typeof paymentMethods.$inferInsert;
export type PaymentMethodSelect = typeof paymentMethods.$inferSelect;
export type UserWhitelistInsert = typeof userWhitelist.$inferInsert;
export type UserWhitelistSelect = typeof userWhitelist.$inferSelect;
export type SystemSettingsInsert = typeof systemSettings.$inferInsert;
export type SystemSettingsSelect = typeof systemSettings.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;
export type NotificationSelect = typeof notifications.$inferSelect;
export type PlatformAccountInsert = typeof platformAccounts.$inferInsert;
export type PlatformAccountSelect = typeof platformAccounts.$inferSelect;
export type PlatformNotificationInsert = typeof platformNotifications.$inferInsert;
export type PlatformNotificationSelect = typeof platformNotifications.$inferSelect;
export type ProcessorSessionInsert = typeof processorSessions.$inferInsert;
export type ProcessorSessionSelect = typeof processorSessions.$inferSelect;
export type UserPlatformInsert = typeof userPlatforms.$inferInsert;
export type UserPlatformSelect = typeof userPlatforms.$inferSelect;


