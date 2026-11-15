import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { and, desc, eq } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  analyses,
  auditLogs,
  businesses,
  datasets,
  payments,
  platformSettings,
  pricingPlans,
  projectMessages,
  projects,
  users,
} from './src/db/schema.ts';
import {
  cleanAndCalculateMetrics,
  CleaningAndMappingConfig,
  profileDatasetRows,
} from './src/lib/dataProcessor.ts';
import {
  answerGroundedDatasetQuestion,
  CalculatedDatasetMetrics,
  generateGroundedAiInterpretation,
} from './src/lib/gemini.ts';
import {
  DEFAULT_PAYMENT_CONFIG,
  getServerGatewayEnvStatus,
  initializeModularPayment,
  PaymentGatewayConfig,
  verifyModularPayment,
} from './src/lib/paymentGateway.ts';
import {
  AuthRequest,
  recordAuditLog,
  requireAdmin,
  requireAuth,
} from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PLANS = [
  {
    slug: 'starter',
    name: 'Starter',
    monthlyPriceNgn: 10000,
    priceLabel: '₦10,000 / month',
    description: 'For emerging retail shops, pharmacies, and solo founders organizing monthly records.',
    maxDatasets: 5,
    maxRowsPerDataset: 5000,
    featuresJson: [
      'Up to 5 active datasets/month',
      'Automated data validation & cleaning',
      'AI-grounded KPI & trend summaries',
      'Branded PDF executive reports',
    ],
    isActive: true,
  },
  {
    slug: 'business',
    name: 'Business',
    monthlyPriceNgn: 25000,
    priceLabel: '₦25,000 / month',
    description: 'For supermarkets, schools, restaurants, and multi-product Nigerian SMEs.',
    maxDatasets: 25,
    maxRowsPerDataset: 25000,
    featuresJson: [
      'Up to 25 active datasets/month',
      'Full interactive dashboard builder',
      'Anomaly & leakage detection',
      'Priority Statedge analyst project support',
    ],
    isActive: true,
  },
  {
    slug: 'professional',
    name: 'Professional',
    monthlyPriceNgn: 50000,
    priceLabel: '₦50,000 / month',
    description: 'For distributors, wholesalers, and multi-branch Nigerian enterprises.',
    maxDatasets: 100,
    maxRowsPerDataset: 100000,
    featuresJson: [
      'Up to 100 active datasets/month',
      'Human-reviewed AI executive reports',
      'Multi-branch & product profitability',
      'Dedicated advisory project SLA',
    ],
    isActive: true,
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    monthlyPriceNgn: null,
    priceLabel: 'Custom Pricing',
    description: 'Tailored deployment, ERP connectors, and dedicated Statedge data science team.',
    maxDatasets: 1000,
    maxRowsPerDataset: 500000,
    featuresJson: [
      'Unlimited datasets & custom pipelines',
      'Bespoke executive BI architecture',
      'On-premise / private cloud options',
      'Dedicated data science retainer',
    ],
    isActive: true,
  },
];

async function ensureDefaultPricingPlans() {
  const existing = await db.select().from(pricingPlans);
  if (existing.length === 0) {
    await db.insert(pricingPlans).values(DEFAULT_PLANS).onConflictDoNothing();
  }
}

async function getOrInitPaymentConfig(): Promise<PaymentGatewayConfig> {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.settingKey, 'payment_config'));

  if (rows.length === 0) {
    await db
      .insert(platformSettings)
      .values({
        settingKey: 'payment_config',
        ...DEFAULT_PAYMENT_CONFIG,
      })
      .onConflictDoNothing();
    return { ...DEFAULT_PAYMENT_CONFIG };
  }

  const row = rows[0];
  return {
    paymentEnabled: row.paymentEnabled,
    paymentMode: row.paymentMode === 'live' ? 'live' : 'development',
    paystackEnabled: row.paystackEnabled,
    flutterwaveEnabled: row.flutterwaveEnabled,
    enforcePlanLimits: row.enforcePlanLimits,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'statedge-intelligence' });
  });

  // Public configurable pricing plans & payment availability
  app.get('/api/pricing', async (_req, res) => {
    try {
      await ensureDefaultPricingPlans();
      const [plans, paymentConfig] = await Promise.all([
        db.select().from(pricingPlans).orderBy(pricingPlans.id),
        getOrInitPaymentConfig(),
      ]);
      res.json({ plans, paymentConfig });
    } catch (error) {
      console.error('Failed to fetch pricing plans:', error);
      res.status(500).json({ error: 'Unable to load pricing plans.' });
    }
  });

  // Public Demo / Sandbox Analyzer (no DB mutation; clearly labeled demonstration)
  app.post('/api/demo/analyze', async (req, res) => {
    try {
      const { rows, cleaningConfig, businessName, industry, datasetName } = req.body as {
        rows: Record<string, unknown>[];
        cleaningConfig: CleaningAndMappingConfig;
        businessName?: string;
        industry?: string;
        datasetName?: string;
      };

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'Dataset rows are required for analysis.' });
      }

      const safeRows = rows.slice(0, 1500);
      const metrics = cleanAndCalculateMetrics(safeRows, cleaningConfig, {
        businessName: businessName || 'Lagos Demo Retail & Pharmacy',
        industry: industry || 'Retail & Pharmaceutical',
        datasetName: datasetName || 'Demonstration Ledger',
      });
      const interpretation = await generateGroundedAiInterpretation(metrics);
      res.json({ metrics, interpretation });
    } catch (error) {
      console.error('Demo analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze dataset.' });
    }
  });

  app.post('/api/demo/ask', async (req, res) => {
    try {
      const { metrics, question } = req.body as {
        metrics: CalculatedDatasetMetrics;
        question: string;
      };
      if (!metrics || !question?.trim()) {
        return res.status(400).json({ error: 'Calculated metrics and question are required.' });
      }
      const result = await answerGroundedDatasetQuestion(metrics, question);
      res.json(result);
    } catch (error) {
      console.error('Demo Q&A error:', error);
      res.status(500).json({ error: 'Unable to answer dataset question.' });
    }
  });

  // Authenticated profile & business bootstrap
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      await ensureDefaultPricingPlans();
      const user = req.dbUser!;
      const [userBusinesses, plans, paymentConfig] = await Promise.all([
        db
          .select()
          .from(businesses)
          .where(eq(businesses.ownerUid, user.uid))
          .orderBy(desc(businesses.createdAt)),
        db.select().from(pricingPlans).orderBy(pricingPlans.id),
        getOrInitPaymentConfig(),
      ]);

      res.json({
        user,
        businesses: userBusinesses,
        plans,
        paymentConfig,
      });
    } catch (error) {
      console.error('GET /api/me failed:', error);
      res.status(500).json({ error: 'Failed to load user workspace.' });
    }
  });

  app.put('/api/me/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const { fullName, phone, jobTitle } = req.body as {
        fullName?: string;
        phone?: string;
        jobTitle?: string;
      };

      const updated = await db
        .update(users)
        .set({
          fullName: fullName?.trim() || user.fullName,
          phone: phone?.trim() ?? user.phone ?? '',
          jobTitle: jobTitle?.trim() ?? user.jobTitle ?? '',
        })
        .where(eq(users.uid, user.uid))
        .returning();

      await recordAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'UPDATE_PROFILE',
        targetType: 'user',
        targetId: user.uid,
        details: `Updated user profile details for ${user.email}`,
      });

      res.json({ user: updated[0] });
    } catch (error) {
      console.error('PUT /api/me/profile failed:', error);
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  });

  app.post('/api/me/request-deletion', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const { confirmImmediateDelete } = req.body as { confirmImmediateDelete?: boolean };

      if (confirmImmediateDelete) {
        // Delete user's businesses (cascades datasets, analyses, projects, payments)
        await db.delete(businesses).where(eq(businesses.ownerUid, user.uid));
        await db
          .update(users)
          .set({ deletionRequestedAt: new Date() })
          .where(eq(users.uid, user.uid));

        await recordAuditLog({
          actorUid: user.uid,
          actorEmail: user.email,
          actorRole: user.role,
          action: 'PURGE_CLIENT_DATA',
          targetType: 'user',
          targetId: user.uid,
          details: 'Client executed full business datasets, analyses, and account purge request.',
        });

        return res.json({ status: 'purged' });
      }

      const updated = await db
        .update(users)
        .set({ deletionRequestedAt: new Date() })
        .where(eq(users.uid, user.uid))
        .returning();

      await recordAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'REQUEST_ACCOUNT_DELETION',
        targetType: 'user',
        targetId: user.uid,
        details: 'Client submitted account and data deletion request.',
      });

      res.json({ status: 'requested', user: updated[0] });
    } catch (error) {
      console.error('Deletion request failed:', error);
      res.status(500).json({ error: 'Failed to process deletion request.' });
    }
  });

  // Register or update business profile
  app.post('/api/businesses', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const { businessName, industry, city, state, rcNumber, monthlyRevenueBand } = req.body as {
        businessName: string;
        industry: string;
        city: string;
        state: string;
        rcNumber?: string;
        monthlyRevenueBand?: string;
      };

      if (!businessName?.trim() || !industry?.trim() || !city?.trim() || !state?.trim()) {
        return res.status(400).json({ error: 'Business name, industry, city, and state are required.' });
      }

      const inserted = await db
        .insert(businesses)
        .values({
          ownerUid: user.uid,
          businessName: businessName.trim(),
          industry: industry.trim(),
          city: city.trim(),
          state: state.trim(),
          rcNumber: rcNumber?.trim() || '',
          currency: 'NGN',
          subscriptionTier: 'starter',
          monthlyRevenueBand: monthlyRevenueBand?.trim() || '',
        })
        .returning();

      await recordAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'REGISTER_BUSINESS',
        targetType: 'business',
        targetId: inserted[0].id,
        details: `Registered business "${inserted[0].businessName}" (${inserted[0].industry}, ${inserted[0].city})`,
      });

      res.status(201).json({ business: inserted[0] });
    } catch (error) {
      console.error('POST /api/businesses failed:', error);
      res.status(500).json({ error: 'Failed to register business profile.' });
    }
  });

  app.put('/api/businesses/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const bizId = Number(req.params.id);
      const { businessName, industry, city, state, rcNumber, monthlyRevenueBand } = req.body;

      const updated = await db
        .update(businesses)
        .set({
          businessName: String(businessName || '').trim(),
          industry: String(industry || '').trim(),
          city: String(city || '').trim(),
          state: String(state || '').trim(),
          rcNumber: String(rcNumber || '').trim(),
          monthlyRevenueBand: String(monthlyRevenueBand || '').trim(),
        })
        .where(and(eq(businesses.id, bizId), eq(businesses.ownerUid, user.uid)))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: 'Business not found or access denied.' });
      }
      res.json({ business: updated[0] });
    } catch (error) {
      console.error('PUT /api/businesses/:id failed:', error);
      res.status(500).json({ error: 'Failed to update business profile.' });
    }
  });

  // Client isolated workspace overview
  app.get('/api/client/overview', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const businessIdParam = Number(req.query.businessId);
      const userBusinesses = await db
        .select()
        .from(businesses)
        .where(eq(businesses.ownerUid, user.uid));

      if (userBusinesses.length === 0) {
        return res.json({
          business: null,
          datasets: [],
          analyses: [],
          projects: [],
          payments: [],
        });
      }

      const activeBiz =
        userBusinesses.find((b) => b.id === businessIdParam) || userBusinesses[0];

      const [bizDatasets, bizAnalyses, bizProjects, bizPayments, recentActivities] =
        await Promise.all([
          db
            .select()
            .from(datasets)
            .where(and(eq(datasets.businessId, activeBiz.id), eq(datasets.ownerUid, user.uid)))
            .orderBy(desc(datasets.createdAt)),
          db
            .select()
            .from(analyses)
            .where(and(eq(analyses.businessId, activeBiz.id), eq(analyses.ownerUid, user.uid)))
            .orderBy(desc(analyses.createdAt)),
          db
            .select()
            .from(projects)
            .where(and(eq(projects.businessId, activeBiz.id), eq(projects.ownerUid, user.uid)))
            .orderBy(desc(projects.updatedAt)),
          db
            .select()
            .from(payments)
            .where(and(eq(payments.businessId, activeBiz.id), eq(payments.ownerUid, user.uid)))
            .orderBy(desc(payments.createdAt)),
          db
            .select()
            .from(auditLogs)
            .where(eq(auditLogs.actorUid, user.uid))
            .orderBy(desc(auditLogs.createdAt))
            .limit(12),
        ]);

      res.json({
        business: activeBiz,
        datasets: bizDatasets,
        analyses: bizAnalyses,
        projects: bizProjects,
        payments: bizPayments,
        recentActivities,
      });
    } catch (error) {
      console.error('GET /api/client/overview failed:', error);
      res.status(500).json({ error: 'Failed to load client workspace.' });
    }
  });

  // Upload & validate dataset (enforcing configurable plan limits & preserving immutable rawRowsJson)
  app.post('/api/datasets', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const { businessId, name, originalFileName, fileType, rows, cleaningConfig, isDemo } =
        req.body as {
          businessId: number;
          name: string;
          originalFileName: string;
          fileType: 'csv' | 'xlsx';
          rows: Record<string, unknown>[];
          cleaningConfig?: CleaningAndMappingConfig;
          isDemo?: boolean;
        };

      const bizList = await db
        .select()
        .from(businesses)
        .where(and(eq(businesses.id, Number(businessId)), eq(businesses.ownerUid, user.uid)));

      if (bizList.length === 0) {
        return res.status(403).json({ error: 'Business access denied.' });
      }
      const biz = bizList[0];

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'Uploaded file contains zero rows.' });
      }

      // Enforce commercial package limits only when explicitly enabled by administrator
      const paymentConfig = await getOrInitPaymentConfig();
      if (paymentConfig.enforcePlanLimits) {
        const planRows = await db
          .select()
          .from(pricingPlans)
          .where(eq(pricingPlans.slug, biz.subscriptionTier));
        const activePlan = planRows[0];

        if (activePlan) {
          const existingCount = await db
            .select()
            .from(datasets)
            .where(eq(datasets.businessId, biz.id));
          if (existingCount.length >= activePlan.maxDatasets) {
            return res.status(403).json({
              error: `Your ${activePlan.name} plan allows up to ${activePlan.maxDatasets} datasets. Upgrade your plan in Billing to upload more.`,
            });
          }
          if (rows.length > activePlan.maxRowsPerDataset) {
            return res.status(403).json({
              error: `File has ${rows.length.toLocaleString()} rows, exceeding your ${activePlan.name} limit of ${activePlan.maxRowsPerDataset.toLocaleString()} rows.`,
            });
          }
        }
      }

      const storedRows = rows.slice(0, 2000);
      const profile = profileDatasetRows(storedRows);

      const inserted = await db
        .insert(datasets)
        .values({
          businessId: biz.id,
          ownerUid: user.uid,
          name: name?.trim() || originalFileName,
          originalFileName: originalFileName || 'dataset.csv',
          fileType: fileType === 'xlsx' ? 'xlsx' : 'csv',
          rowCount: rows.length,
          columnCount: profile.columns.length,
          columnsJson: profile.columns,
          qualitySummaryJson: profile.quality,
          rawRowsJson: storedRows,
          cleanedConfigJson: cleaningConfig || profile.suggestedMapping,
          isDemo: Boolean(isDemo),
        })
        .returning();

      await recordAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'UPLOAD_DATASET',
        targetType: 'dataset',
        targetId: inserted[0].id,
        details: `Uploaded "${inserted[0].originalFileName}" (${rows.length} rows, ${profile.columns.length} cols)`,
      });

      res.status(201).json({ dataset: inserted[0] });
    } catch (error) {
      console.error('POST /api/datasets failed:', error);
      res.status(500).json({ error: 'Failed to save dataset.' });
    }
  });

  // Analyze dataset (never modifies rawRowsJson; persists cleaningConfig and grounded AI analysis)
  app.post('/api/datasets/:id/analyze', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const dsId = Number(req.params.id);
      const { cleaningConfig, requestAdminReview, title } = req.body as {
        cleaningConfig: CleaningAndMappingConfig;
        requestAdminReview?: boolean;
        title?: string;
      };

      const dsList = await db
        .select()
        .from(datasets)
        .where(and(eq(datasets.id, dsId), eq(datasets.ownerUid, user.uid)));

      if (dsList.length === 0) {
        return res.status(404).json({ error: 'Dataset not found or access denied.' });
      }
      const ds = dsList[0];

      const bizList = await db.select().from(businesses).where(eq(businesses.id, ds.businessId));
      const biz = bizList[0];

      // Save user's non-destructive cleaning config without modifying rawRowsJson
      await db
        .update(datasets)
        .set({ cleanedConfigJson: cleaningConfig })
        .where(eq(datasets.id, ds.id));

      const rawRows = ds.rawRowsJson as Record<string, unknown>[];
      const metrics = cleanAndCalculateMetrics(rawRows, cleaningConfig, {
        businessName: biz?.businessName || 'Client Business',
        industry: biz?.industry || 'Enterprise',
        datasetName: ds.name,
      });

      const interpretation = await generateGroundedAiInterpretation(metrics);

      const insertedAnalysis = await db
        .insert(analyses)
        .values({
          datasetId: ds.id,
          businessId: ds.businessId,
          ownerUid: user.uid,
          title: title?.trim() || `${ds.name} — Intelligence Report`,
          metricsJson: metrics,
          aiInterpretationJson: interpretation,
          publishStatus: requestAdminReview ? 'pending_review' : 'published',
        })
        .returning();

      await recordAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'GENERATE_AI_ANALYSIS',
        targetType: 'analysis',
        targetId: insertedAnalysis[0].id,
        details: `Generated AI analysis "${insertedAnalysis[0].title}" (${metrics.analyzedRowCount} cleaned rows)`,
      });

      res.status(201).json({
        analysis: insertedAnalysis[0],
        metrics,
        interpretation,
      });
    } catch (error) {
      console.error('POST /api/datasets/:id/analyze failed:', error);
      res.status(500).json({ error: 'Failed to analyze dataset.' });
    }
  });

  app.post('/api/analyses/:id/ask', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const analysisId = Number(req.params.id);
      const { question } = req.body as { question: string };

      const anList = await db
        .select()
        .from(analyses)
        .where(and(eq(analyses.id, analysisId), eq(analyses.ownerUid, user.uid)));

      if (anList.length === 0) {
        return res.status(404).json({ error: 'Analysis not found or access denied.' });
      }
      const metrics = anList[0].metricsJson as CalculatedDatasetMetrics;
      const result = await answerGroundedDatasetQuestion(metrics, question);
      res.json(result);
    } catch (error) {
      console.error('POST /api/analyses/:id/ask failed:', error);
      res.status(500).json({ error: 'Unable to answer dataset question.' });
    }
  });

  app.delete('/api/datasets/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const dsId = Number(req.params.id);
      const deleted = await db
        .delete(datasets)
        .where(and(eq(datasets.id, dsId), eq(datasets.ownerUid, user.uid)))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({ error: 'Dataset not found or access denied.' });
      }
      await recordAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'DELETE_DATASET',
        targetType: 'dataset',
        targetId: dsId,
        details: `Deleted dataset "${deleted[0].name}"`,
      });
      res.json({ deleted: true });
    } catch (error) {
      console.error('DELETE /api/datasets/:id failed:', error);
      res.status(500).json({ error: 'Failed to delete dataset.' });
    }
  });

  // Client Project Management
  app.post('/api/projects', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const { businessId, datasetId, title, description, supportingDocName, supportingDocSummary } =
        req.body as {
          businessId: number;
          datasetId?: number | null;
          title: string;
          description: string;
          supportingDocName?: string;
          supportingDocSummary?: string;
        };

      const bizList = await db
        .select()
        .from(businesses)
        .where(and(eq(businesses.id, Number(businessId)), eq(businesses.ownerUid, user.uid)));

      if (bizList.length === 0) {
        return res.status(403).json({ error: 'Business access denied.' });
      }

      if (!title?.trim() || !description?.trim()) {
        return res.status(400).json({ error: 'Project title and description are required.' });
      }

      const inserted = await db
        .insert(projects)
        .values({
          businessId: bizList[0].id,
          ownerUid: user.uid,
          datasetId: datasetId || null,
          title: title.trim(),
          description: description.trim(),
          supportingDocName: supportingDocName?.trim() || '',
          supportingDocSummary: supportingDocSummary?.trim() || '',
          status: 'New Request',
          quotedAmountNgn: 0,
        })
        .returning();

      res.status(201).json({ project: inserted[0] });
    } catch (error) {
      console.error('POST /api/projects failed:', error);
      res.status(500).json({ error: 'Failed to submit project request.' });
    }
  });

  app.get('/api/projects/:id/messages', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const projId = Number(req.params.id);
      const projList = await db.select().from(projects).where(eq(projects.id, projId));
      if (projList.length === 0) {
        return res.status(404).json({ error: 'Project not found.' });
      }
      if (projList[0].ownerUid !== user.uid && user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied.' });
      }

      const msgs = await db
        .select()
        .from(projectMessages)
        .where(eq(projectMessages.projectId, projId))
        .orderBy(projectMessages.createdAt);
      res.json({ messages: msgs });
    } catch (error) {
      console.error('GET /api/projects/:id/messages failed:', error);
      res.status(500).json({ error: 'Failed to load messages.' });
    }
  });

  app.post('/api/projects/:id/messages', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const projId = Number(req.params.id);
      const { message } = req.body as { message: string };

      const projList = await db.select().from(projects).where(eq(projects.id, projId));
      if (projList.length === 0) {
        return res.status(404).json({ error: 'Project not found.' });
      }
      if (projList[0].ownerUid !== user.uid && user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied.' });
      }
      if (!message?.trim()) {
        return res.status(400).json({ error: 'Message text is required.' });
      }

      const inserted = await db
        .insert(projectMessages)
        .values({
          projectId: projId,
          senderUid: user.uid,
          senderName: user.fullName,
          senderRole: user.role,
          message: message.trim(),
        })
        .returning();

      res.status(201).json({ message: inserted[0] });
    } catch (error) {
      console.error('POST /api/projects/:id/messages failed:', error);
      res.status(500).json({ error: 'Failed to send message.' });
    }
  });

  // Optional & Admin-Configurable Payment System (Development Mode by default; no external keys required)
  app.post('/api/payments/initialize', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const { businessId, paymentType, gateway, amountNgn, planSlug, projectId } = req.body as {
        businessId: number;
        paymentType: 'subscription' | 'project';
        gateway: 'paystack' | 'flutterwave';
        amountNgn: number;
        planSlug?: string;
        projectId?: number;
      };

      const bizList = await db
        .select()
        .from(businesses)
        .where(and(eq(businesses.id, Number(businessId)), eq(businesses.ownerUid, user.uid)));

      if (bizList.length === 0) {
        return res.status(403).json({ error: 'Business access denied.' });
      }

      if (!amountNgn || amountNgn <= 0) {
        return res.status(400).json({ error: 'Valid NGN payment amount is required.' });
      }

      const paymentConfig = await getOrInitPaymentConfig();
      const init = initializeModularPayment(gateway, paymentConfig);

      const inserted = await db
        .insert(payments)
        .values({
          businessId: bizList[0].id,
          ownerUid: user.uid,
          paymentType,
          reference: init.reference,
          gateway: init.gateway,
          amountNgn: Math.round(amountNgn),
          planSlug: planSlug || null,
          projectId: projectId || null,
          status: 'pending',
        })
        .returning();

      res.status(201).json({
        payment: inserted[0],
        gatewayMode: init.mode,
      });
    } catch (error) {
      console.error('POST /api/payments/initialize failed:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to initialize payment.',
      });
    }
  });

  app.post('/api/payments/verify', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.dbUser!;
      const { reference, gatewayConfirmationCode } = req.body as {
        reference: string;
        gatewayConfirmationCode?: string;
      };

      const payList = await db
        .select()
        .from(payments)
        .where(and(eq(payments.reference, reference), eq(payments.ownerUid, user.uid)));

      if (payList.length === 0) {
        return res.status(404).json({ error: 'Payment transaction reference not found.' });
      }
      const pay = payList[0];

      const paymentConfig = await getOrInitPaymentConfig();
      const verification = await verifyModularPayment({
        reference: pay.reference,
        gateway: pay.gateway,
        expectedAmountNgn: pay.amountNgn,
        confirmationCode: gatewayConfirmationCode,
        config: paymentConfig,
      });

      if (!verification.verified) {
        await db
          .update(payments)
          .set({ status: 'failed' })
          .where(eq(payments.id, pay.id));
        return res.status(400).json({
          error: verification.reason || 'Payment verification failed.',
        });
      }

      const receiptNumber = `RCPT-${new Date().getFullYear()}-${String(pay.id).padStart(5, '0')}`;
      const updatedPay = await db
        .update(payments)
        .set({
          status: 'verified',
          verifiedAt: new Date(),
          receiptNumber,
        })
        .where(eq(payments.id, pay.id))
        .returning();

      if (pay.paymentType === 'subscription' && pay.planSlug) {
        await db
          .update(businesses)
          .set({ subscriptionTier: pay.planSlug })
          .where(eq(businesses.id, pay.businessId));
      }

      if (pay.paymentType === 'project' && pay.projectId) {
        await db
          .update(projects)
          .set({ status: 'In Progress', updatedAt: new Date() })
          .where(eq(projects.id, pay.projectId));
      }

      await recordAuditLog({
        actorUid: user.uid,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'VERIFY_PAYMENT',
        targetType: 'payment',
        targetId: pay.id,
        details: `Verified ₦${pay.amountNgn.toLocaleString()} (${verification.mode}) payment (${pay.reference})`,
      });

      res.json({ payment: updatedPay[0], mode: verification.mode });
    } catch (error) {
      console.error('POST /api/payments/verify failed:', error);
      res.status(500).json({ error: 'Payment verification failed.' });
    }
  });

  // Statedge Administrator Endpoints (RBAC protected)
  app.get('/api/admin/overview', requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
    try {
      await ensureDefaultPricingPlans();
      const [
        allUsers,
        allBusinesses,
        allProjects,
        allDatasets,
        allAnalyses,
        allPayments,
        allPlans,
        recentLogs,
        paymentConfig,
      ] = await Promise.all([
        db.select().from(users).orderBy(desc(users.createdAt)),
        db.select().from(businesses).orderBy(desc(businesses.createdAt)),
        db.select().from(projects).orderBy(desc(projects.updatedAt)),
        db.select().from(datasets).orderBy(desc(datasets.createdAt)),
        db.select().from(analyses).orderBy(desc(analyses.createdAt)),
        db.select().from(payments).orderBy(desc(payments.createdAt)),
        db.select().from(pricingPlans).orderBy(pricingPlans.id),
        db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(40),
        getOrInitPaymentConfig(),
      ]);

      res.json({
        users: allUsers,
        businesses: allBusinesses,
        projects: allProjects,
        datasets: allDatasets.map((d) => ({
          id: d.id,
          businessId: d.businessId,
          ownerUid: d.ownerUid,
          name: d.name,
          originalFileName: d.originalFileName,
          fileType: d.fileType,
          rowCount: d.rowCount,
          columnCount: d.columnCount,
          isDemo: d.isDemo,
          createdAt: d.createdAt,
        })),
        analyses: allAnalyses,
        payments: allPayments,
        pricingPlans: allPlans,
        auditLogs: recentLogs,
        paymentConfig: {
          ...paymentConfig,
          envStatus: getServerGatewayEnvStatus(),
        },
      });
    } catch (error) {
      console.error('GET /api/admin/overview failed:', error);
      res.status(500).json({ error: 'Failed to load administrator console.' });
    }
  });

  app.put('/api/admin/payment-config', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const admin = req.dbUser!;
      const {
        paymentEnabled,
        paymentMode,
        paystackEnabled,
        flutterwaveEnabled,
        enforcePlanLimits,
      } = req.body as Partial<PaymentGatewayConfig>;

      await getOrInitPaymentConfig();
      const nextMode = paymentMode === 'live' ? 'live' : 'development';

      const updated = await db
        .update(platformSettings)
        .set({
          paymentEnabled: Boolean(paymentEnabled),
          paymentMode: nextMode,
          paystackEnabled: Boolean(paystackEnabled),
          flutterwaveEnabled: Boolean(flutterwaveEnabled),
          enforcePlanLimits: Boolean(enforcePlanLimits),
          updatedByUid: admin.uid,
          updatedAt: new Date(),
        })
        .where(eq(platformSettings.settingKey, 'payment_config'))
        .returning();

      const row = updated[0];
      await recordAuditLog({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'ADMIN_UPDATE_PAYMENT_CONFIG',
        targetType: 'platform_settings',
        targetId: row.id,
        details: `Updated payment configuration: enabled=${row.paymentEnabled}, mode=${row.paymentMode}, quotas=${row.enforcePlanLimits}`,
      });

      res.json({
        paymentConfig: {
          paymentEnabled: row.paymentEnabled,
          paymentMode: row.paymentMode === 'live' ? 'live' : 'development',
          paystackEnabled: row.paystackEnabled,
          flutterwaveEnabled: row.flutterwaveEnabled,
          enforcePlanLimits: row.enforcePlanLimits,
          envStatus: getServerGatewayEnvStatus(),
        },
      });
    } catch (error) {
      console.error('PUT /api/admin/payment-config failed:', error);
      res.status(500).json({ error: 'Failed to update payment configuration.' });
    }
  });

  app.put('/api/admin/projects/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const admin = req.dbUser!;
      const projId = Number(req.params.id);
      const { status, quotedAmountNgn, deliverableTitle, deliverableSummary } = req.body as {
        status?: string;
        quotedAmountNgn?: number;
        deliverableTitle?: string;
        deliverableSummary?: string;
      };

      const updated = await db
        .update(projects)
        .set({
          ...(status ? { status } : {}),
          ...(typeof quotedAmountNgn === 'number' ? { quotedAmountNgn } : {}),
          ...(deliverableTitle !== undefined ? { deliverableTitle } : {}),
          ...(deliverableSummary !== undefined ? { deliverableSummary } : {}),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projId))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: 'Project not found.' });
      }

      await recordAuditLog({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'ADMIN_UPDATE_PROJECT',
        targetType: 'project',
        targetId: projId,
        details: `Updated project #${projId} to status "${updated[0].status}" (Quote: ₦${updated[0].quotedAmountNgn.toLocaleString()})`,
      });

      res.json({ project: updated[0] });
    } catch (error) {
      console.error('PUT /api/admin/projects/:id failed:', error);
      res.status(500).json({ error: 'Failed to update project.' });
    }
  });

  app.put('/api/admin/analyses/:id/review', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const admin = req.dbUser!;
      const analysisId = Number(req.params.id);
      const { publishStatus, reviewedNotes } = req.body as {
        publishStatus: 'published' | 'pending_review' | 'draft';
        reviewedNotes?: string;
      };

      const updated = await db
        .update(analyses)
        .set({
          publishStatus,
          reviewedByUid: admin.uid,
          reviewedNotes: reviewedNotes ?? '',
        })
        .where(eq(analyses.id, analysisId))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: 'Analysis report not found.' });
      }

      await recordAuditLog({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'ADMIN_REVIEW_REPORT',
        targetType: 'analysis',
        targetId: analysisId,
        details: `Set report #${analysisId} status to "${publishStatus}"`,
      });

      res.json({ analysis: updated[0] });
    } catch (error) {
      console.error('PUT /api/admin/analyses/:id/review failed:', error);
      res.status(500).json({ error: 'Failed to review report.' });
    }
  });

  app.put('/api/admin/users/:uid/role', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const admin = req.dbUser!;
      const targetUid = req.params.uid;
      const { role } = req.body as { role: 'client' | 'admin' };

      if (role !== 'client' && role !== 'admin') {
        return res.status(400).json({ error: 'Role must be "client" or "admin".' });
      }

      const updated = await db
        .update(users)
        .set({ role })
        .where(eq(users.uid, targetUid))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      await recordAuditLog({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'ADMIN_CHANGE_ROLE',
        targetType: 'user',
        targetId: targetUid,
        details: `Changed role for ${updated[0].email} to "${role}"`,
      });

      res.json({ user: updated[0] });
    } catch (error) {
      console.error('PUT /api/admin/users/:uid/role failed:', error);
      res.status(500).json({ error: 'Failed to update user role.' });
    }
  });

  app.put('/api/admin/pricing/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const admin = req.dbUser!;
      const planId = Number(req.params.id);
      const { monthlyPriceNgn, priceLabel, maxDatasets, maxRowsPerDataset, isActive } = req.body as {
        monthlyPriceNgn: number | null;
        priceLabel: string;
        maxDatasets: number;
        maxRowsPerDataset: number;
        isActive: boolean;
      };

      const updated = await db
        .update(pricingPlans)
        .set({
          monthlyPriceNgn,
          priceLabel: priceLabel.trim(),
          maxDatasets: Number(maxDatasets),
          maxRowsPerDataset: Number(maxRowsPerDataset),
          isActive: Boolean(isActive),
        })
        .where(eq(pricingPlans.id, planId))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: 'Pricing plan not found.' });
      }

      await recordAuditLog({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'ADMIN_UPDATE_PRICING',
        targetType: 'pricing_plan',
        targetId: planId,
        details: `Updated plan "${updated[0].name}" to ${updated[0].priceLabel} (max ${updated[0].maxDatasets} datasets)`,
      });

      res.json({ plan: updated[0] });
    } catch (error) {
      console.error('PUT /api/admin/pricing/:id failed:', error);
      res.status(500).json({ error: 'Failed to update pricing plan.' });
    }
  });

  // Admin can manually confirm a pending bank/gateway payment
  app.put('/api/admin/payments/:id/verify', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const admin = req.dbUser!;
      const payId = Number(req.params.id);
      const payList = await db.select().from(payments).where(eq(payments.id, payId));
      if (payList.length === 0) {
        return res.status(404).json({ error: 'Payment not found.' });
      }
      const pay = payList[0];
      const receiptNumber = `RCPT-${new Date().getFullYear()}-${String(pay.id).padStart(5, '0')}`;
      const updated = await db
        .update(payments)
        .set({ status: 'verified', verifiedAt: new Date(), receiptNumber })
        .where(eq(payments.id, payId))
        .returning();

      if (pay.paymentType === 'subscription' && pay.planSlug) {
        await db
          .update(businesses)
          .set({ subscriptionTier: pay.planSlug })
          .where(eq(businesses.id, pay.businessId));
      }
      if (pay.paymentType === 'project' && pay.projectId) {
        await db
          .update(projects)
          .set({ status: 'In Progress', updatedAt: new Date() })
          .where(eq(projects.id, pay.projectId));
      }

      await recordAuditLog({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'ADMIN_VERIFY_PAYMENT',
        targetType: 'payment',
        targetId: payId,
        details: `Admin confirmed payment ${pay.reference} (₦${pay.amountNgn.toLocaleString()})`,
      });

      res.json({ payment: updated[0] });
    } catch (error) {
      console.error('PUT /api/admin/payments/:id/verify failed:', error);
      res.status(500).json({ error: 'Failed to verify payment.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Statedge Intelligence running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Statedge Intelligence server:', err);
  process.exit(1);
});
