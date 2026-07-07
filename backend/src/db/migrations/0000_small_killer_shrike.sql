CREATE TABLE IF NOT EXISTS "active_freelance_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"proposal_id" text,
	"column_name" text DEFAULT 'planning' NOT NULL,
	"subtasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"qc_results" jsonb,
	"delivery_files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delivery_message" text,
	"client_rating" double precision,
	"feedback" text,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ads" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"platform" text NOT NULL,
	"creative_type" text DEFAULT 'image' NOT NULL,
	"ad_name" text NOT NULL,
	"spend" double precision DEFAULT 0 NOT NULL,
	"revenue" double precision DEFAULT 0 NOT NULL,
	"roas" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"agent_name" text NOT NULL,
	"action" text NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output" jsonb,
	"error" text,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"command_type" text,
	"response_data" jsonb,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT 'New Conversation' NOT NULL,
	"context_page" text,
	"message_count" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dropshipping_products" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cost_price" double precision DEFAULT 0 NOT NULL,
	"target_sell_price" double precision DEFAULT 0 NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"trending_score" double precision DEFAULT 0 NOT NULL,
	"trend_data" jsonb,
	"validation_status" text DEFAULT 'pending' NOT NULL,
	"ai_score" double precision,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dropshipping_stores" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"platform" text DEFAULT 'shopify' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "files" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"storage_provider" text DEFAULT 'local' NOT NULL,
	"storage_path" text NOT NULL,
	"public_url" text,
	"folder" text DEFAULT 'general' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"share_token" text,
	"share_expires_at" text,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	CONSTRAINT "files_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "freelance_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"active_job_id" text NOT NULL,
	"files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delivery_message" text DEFAULT '' NOT NULL,
	"client_response" text,
	"revision_count" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "freelance_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_platform" text NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"budget_min" double precision,
	"budget_max" double precision,
	"client_rating" double precision,
	"deadline" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_score" double precision,
	"ai_insights" jsonb,
	"status" text DEFAULT 'new' NOT NULL,
	"raw_data" jsonb,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "installed_plugins" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plugin_id" text NOT NULL,
	"enabled" text DEFAULT 'true' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"installed_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"payment_id" text,
	"invoice_number" text NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text NOT NULL,
	"client_address" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal" double precision DEFAULT 0 NOT NULL,
	"tax" double precision DEFAULT 0 NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"payment_link" text,
	"notes" text,
	"pdf_url" text,
	"due_date" text,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"sent_at" text,
	"paid_at" text,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace_plugins" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"author" text NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"rating" integer DEFAULT 0 NOT NULL,
	"installs" integer DEFAULT 0 NOT NULL,
	"icon_url" text,
	"screenshots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"title" text,
	"message" text,
	"read" boolean DEFAULT false NOT NULL,
	"type" text,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"amount" double precision NOT NULL,
	"gateway_fee" double precision DEFAULT 0 NOT NULL,
	"platform_fee" double precision DEFAULT 0 NOT NULL,
	"net_amount" double precision NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"gateway" text NOT NULL,
	"gateway_payment_id" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"customer_email" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"completed_at" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" double precision NOT NULL,
	"source_gateway" text NOT NULL,
	"destination_bank" text,
	"destination_account_last4" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reference_id" text,
	"initiated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"completed_at" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"platform_name" text NOT NULL,
	"email" text NOT NULL,
	"encrypted_password" text NOT NULL,
	"profile_url" text,
	"status" text DEFAULT 'connected' NOT NULL,
	"last_synced_at" text,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"platform_account_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"external_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processor_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"current_step" text DEFAULT 'planning' NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"logs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"output_files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"draft_text" text DEFAULT '' NOT NULL,
	"final_text" text,
	"bid_amount" double precision,
	"delivery_days" integer,
	"portfolio_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"human_modified_at" text,
	"sent_at" text,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referrals" (
	"id" text PRIMARY KEY NOT NULL,
	"referrer_id" text NOT NULL,
	"referred_email" text NOT NULL,
	"referral_code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"commission_earned" double precision DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	CONSTRAINT "referrals_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "store_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"order_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"revenue" double precision DEFAULT 0 NOT NULL,
	"cost" double precision DEFAULT 0 NOT NULL,
	"placed_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_platforms" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"platform_name" text NOT NULL,
	"platform_url" text NOT NULL,
	"icon_url" text,
	"status" text DEFAULT 'Not connected' NOT NULL,
	"last_synced" text,
	"notifications_count" integer DEFAULT 0 NOT NULL,
	"messages_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_whitelist" (
	"email" text PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"supabase_id" text,
	"role" text DEFAULT 'user' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"payment_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "validation_results" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"step_name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"result_data" jsonb,
	"completed_at" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "active_freelance_jobs" ADD CONSTRAINT "active_freelance_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "active_freelance_jobs" ADD CONSTRAINT "active_freelance_jobs_job_id_freelance_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."freelance_jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "active_freelance_jobs" ADD CONSTRAINT "active_freelance_jobs_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ads" ADD CONSTRAINT "ads_store_id_dropshipping_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."dropshipping_stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dropshipping_products" ADD CONSTRAINT "dropshipping_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dropshipping_stores" ADD CONSTRAINT "dropshipping_stores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dropshipping_stores" ADD CONSTRAINT "dropshipping_stores_product_id_dropshipping_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."dropshipping_products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "freelance_deliveries" ADD CONSTRAINT "freelance_deliveries_active_job_id_active_freelance_jobs_id_fk" FOREIGN KEY ("active_job_id") REFERENCES "public"."active_freelance_jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "freelance_jobs" ADD CONSTRAINT "freelance_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installed_plugins" ADD CONSTRAINT "installed_plugins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installed_plugins" ADD CONSTRAINT "installed_plugins_plugin_id_marketplace_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."marketplace_plugins"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payouts" ADD CONSTRAINT "payouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "platform_accounts" ADD CONSTRAINT "platform_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "platform_notifications" ADD CONSTRAINT "platform_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "platform_notifications" ADD CONSTRAINT "platform_notifications_platform_account_id_platform_accounts_id_fk" FOREIGN KEY ("platform_account_id") REFERENCES "public"."platform_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processor_sessions" ADD CONSTRAINT "processor_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proposals" ADD CONSTRAINT "proposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proposals" ADD CONSTRAINT "proposals_job_id_freelance_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."freelance_jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_store_id_dropshipping_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."dropshipping_stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_platforms" ADD CONSTRAINT "user_platforms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "validation_results" ADD CONSTRAINT "validation_results_product_id_dropshipping_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."dropshipping_products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
