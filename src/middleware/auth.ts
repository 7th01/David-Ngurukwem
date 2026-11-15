import { NextFunction, Request, Response } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';
import { getOrCreateUser } from '../db/users.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface AuthUserRecord {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  role: string;
  phone: string | null;
  jobTitle: string | null;
  deletionRequestedAt: Date | null;
}

export interface AuthRequest extends Request {
  firebaseUser?: DecodedIdToken;
  dbUser?: AuthUserRecord;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decoded;
    const dbUser = await getOrCreateUser(
      decoded.uid,
      decoded.email || '',
      typeof decoded.name === 'string' ? decoded.name : undefined
    );
    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.dbUser || req.dbUser.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Statedge Administrator role required' });
  }
  next();
};

export async function recordAuditLog(params: {
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string | number;
  details: string;
}) {
  try {
    await db.insert(auditLogs).values({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ? String(params.targetId) : '',
      details: params.details,
    });
  } catch (error) {
    console.error('Audit log insert failed:', error);
  }
}
