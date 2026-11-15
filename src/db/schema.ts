import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('client'), // 'client' | 'admin'
  phone: text('phone').default(''),
  jobTitle: text('job_title').default(''),
  deletionRequestedAt: timestamp('deletion_requested_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const businesses = pgTable('businesses', {
  id: serial('id').primaryKey(),
  ownerUid: text('owner_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  businessName: text('business_name').notNull(),
  industry: text('industry').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  rcNumber: text('rc_number').default(''),
  currency: text('currency').notNull().default('NGN'),
  subscriptionTier: text('subscription_tier').notNull().default('starter'),
  monthlyRevenueBand: text('monthly_revenue_band').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const datasets = pgTable('datasets', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  ownerUid: text('owner_uid').notNull(),
  name: text('name').notNull(),
  originalFileName: text('original_file_name').notNull(),
  fileType: text('file_type').notNull(), // 'csv' | 'xlsx'
  rowCount: integer('row_count').notNull(),
  columnCount: integer('column_count').notNull(),
  columnsJson: jsonb('columns_json').notNull(),
  qualitySummaryJson: jsonb('quality_summary_json').notNull(),
  rawRowsJson: jsonb('raw_rows_json').notNull(),
  cleanedConfigJson: jsonb('cleaned_config_json'),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const analyses = pgTable('analyses', {
  id: serial('id').primaryKey(),
  datasetId: integer('dataset_id')
    .notNull()
    .references(() => datasets.id, { onDelete: 'cascade' }),
  businessId: integer('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  ownerUid: text('owner_uid').notNull(),
  title: text('title').notNull(),
  metricsJson: jsonb('metrics_json').notNull(),
  aiInterpretationJson: jsonb('ai_interpretation_json').notNull(),
  publishStatus: text('publish_status').notNull().default('published'), // 'draft' | 'pending_review' | 'published'
  reviewedByUid: text('reviewed_by_uid'),
  reviewedNotes: text('reviewed_notes').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  ownerUid: text('owner_uid').notNull(),
  datasetId: integer('dataset_id').references(() => datasets.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  supportingDocName: text('supporting_doc_name').default(''),
  supportingDocSummary: text('supporting_doc_summary').default(''),
  status: text('status').notNull().default('New Request'),
  quotedAmountNgn: integer('quoted_amount_ngn').notNull().default(0),
  deliverableTitle: text('deliverable_title').default(''),
  deliverableSummary: text('deliverable_summary').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projectMessages = pgTable('project_messages', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  senderUid: text('sender_uid').notNull(),
  senderName: text('sender_name').notNull(),
  senderRole: text('sender_role').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pricingPlans = pgTable('pricing_plans', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  monthlyPriceNgn: integer('monthly_price_ngn'),
  priceLabel: text('price_label').notNull(),
  description: text('description').notNull(),
  maxDatasets: integer('max_datasets').notNull(),
  maxRowsPerDataset: integer('max_rows_per_dataset').notNull(),
  featuresJson: jsonb('features_json').notNull(),
  isActive: boolean('is_active').notNull().default(true),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  ownerUid: text('owner_uid').notNull(),
  paymentType: text('payment_type').notNull(), // 'subscription' | 'project'
  reference: text('reference').notNull().unique(),
  gateway: text('gateway').notNull(), // 'paystack' | 'flutterwave'
  amountNgn: integer('amount_ngn').notNull(),
  planSlug: text('plan_slug'),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('pending'), // 'pending' | 'verified' | 'failed'
  verifiedAt: timestamp('verified_at'),
  receiptNumber: text('receipt_number').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUid: text('actor_uid').notNull(),
  actorEmail: text('actor_email').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').default(''),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const platformSettings = pgTable('platform_settings', {
  id: serial('id').primaryKey(),
  settingKey: text('setting_key').notNull().unique(),
  paymentEnabled: boolean('payment_enabled').notNull().default(true),
  paymentMode: text('payment_mode').notNull().default('development'), // 'development' | 'live'
  paystackEnabled: boolean('paystack_enabled').notNull().default(true),
  flutterwaveEnabled: boolean('flutterwave_enabled').notNull().default(true),
  enforcePlanLimits: boolean('enforce_plan_limits').notNull().default(false),
  updatedByUid: text('updated_by_uid').default(''),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  businesses: many(businesses),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, {
    fields: [businesses.ownerUid],
    references: [users.uid],
  }),
  datasets: many(datasets),
  analyses: many(analyses),
  projects: many(projects),
  payments: many(payments),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  business: one(businesses, {
    fields: [projects.businessId],
    references: [businesses.id],
  }),
  messages: many(projectMessages),
}));

export const projectMessagesRelations = relations(projectMessages, ({ one }) => ({
  project: one(projects, {
    fields: [projectMessages.projectId],
    references: [projects.id],
  }),
}));
