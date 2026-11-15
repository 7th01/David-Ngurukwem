import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

const DEFAULT_ADMIN_EMAIL = 'davidngurukwem@gmail.com';

export async function getOrCreateUser(uid: string, email: string, fullName?: string) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid));
    if (existing.length > 0) {
      return existing[0];
    }

    const initialRole =
      email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'client';

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        fullName: fullName || email.split('@')[0] || 'Statedge User',
        role: initialRole,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}
