import {
  CalculatedMetrics,
  CleaningAndMappingConfig,
  ColumnProfile,
  QualitySummary,
} from '../lib/dataProcessor';
import { AiAnalysisOutput } from '../lib/gemini';

export type UserRole = 'client' | 'admin';

export interface DbUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone: string | null;
  jobTitle: string | null;
  deletionRequestedAt: string | null;
  createdAt: string;
}

export interface BusinessRecord {
  id: number;
  ownerUid: string;
  businessName: string;
  industry: string;
  city: string;
  state: string;
  rcNumber: string | null;
  currency: string;
  subscriptionTier: string;
  monthlyRevenueBand: string | null;
  createdAt: string;
}

export interface DatasetRecord {
  id: number;
  businessId: number;
  ownerUid: string;
  name: string;
  originalFileName: string;
  fileType: 'csv' | 'xlsx';
  rowCount: number;
  columnCount: number;
  columnsJson: ColumnProfile[];
  qualitySummaryJson: QualitySummary;
  rawRowsJson?: Record<string, unknown>[];
  cleanedConfigJson: CleaningAndMappingConfig | null;
  isDemo: boolean;
  createdAt: string;
}

export interface AnalysisRecord {
  id: number;
  datasetId: number;
  businessId: number;
  ownerUid: string;
  title: string;
  metricsJson: CalculatedMetrics;
  aiInterpretationJson: AiAnalysisOutput;
  publishStatus: 'draft' | 'pending_review' | 'published';
  reviewedByUid: string | null;
  reviewedNotes: string | null;
  createdAt: string;
}

export type ProjectStatus =
  | 'New Request'
  | 'Under Review'
  | 'Awaiting Payment'
  | 'In Progress'
  | 'Quality Review'
  | 'Completed';

export interface ProjectRecord {
  id: number;
  businessId: number;
  ownerUid: string;
  datasetId: number | null;
  title: string;
  description: string;
  supportingDocName: string | null;
  supportingDocSummary: string | null;
  status: ProjectStatus;
  quotedAmountNgn: number;
  deliverableTitle: string | null;
  deliverableSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMessageRecord {
  id: number;
  projectId: number;
  senderUid: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

export interface PricingPlanRecord {
  id: number;
  slug: string;
  name: string;
  monthlyPriceNgn: number | null;
  priceLabel: string;
  description: string;
  maxDatasets: number;
  maxRowsPerDataset: number;
  featuresJson: string[];
  isActive: boolean;
}

export interface PaymentRecord {
  id: number;
  businessId: number;
  ownerUid: string;
  paymentType: 'subscription' | 'project';
  reference: string;
  gateway: 'paystack' | 'flutterwave' | 'development';
  amountNgn: number;
  planSlug: string | null;
  projectId: number | null;
  status: 'pending' | 'verified' | 'failed';
  verifiedAt: string | null;
  receiptNumber: string | null;
  createdAt: string;
}

export interface PaymentConfigState {
  paymentEnabled: boolean;
  paymentMode: 'development' | 'live';
  paystackEnabled: boolean;
  flutterwaveEnabled: boolean;
  enforcePlanLimits: boolean;
  envStatus?: {
    hasPaystackSecret: boolean;
    hasFlutterwaveSecret: boolean;
  };
}

export interface AuditLogRecord {
  id: number;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: string;
  createdAt: string;
}

export type WorkspaceTab =
  | 'dashboard'
  | 'upload'
  | 'analyst'
  | 'projects'
  | 'billing'
  | 'account'
  | 'admin';
