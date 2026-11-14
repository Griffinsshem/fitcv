import { eq } from 'drizzle-orm';
import { emptyProfile, MasterProfileSchema, type MasterProfile } from '@fitcv/shared';
import { db } from '../../db/client';
import { profiles } from '../../db/schema';

export async function getProfile(
  userId: string,
): Promise<{ profile: MasterProfile; updatedAt: Date | null }> {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!row) return { profile: emptyProfile(), updatedAt: null };
  // Re-validate on read: tolerates schema evolution (new fields get defaults).
  const parsed = MasterProfileSchema.safeParse(row.data);
  return { profile: parsed.success ? parsed.data : emptyProfile(), updatedAt: row.updatedAt };
}

export async function saveProfile(userId: string, profile: MasterProfile) {
  const [row] = await db
    .insert(profiles)
    .values({ userId, data: profile })
    .onConflictDoUpdate({ target: profiles.userId, set: { data: profile, updatedAt: new Date() } })
    .returning();
  return row!;
}

export function profileIsUsable(p: MasterProfile): boolean {
  return p.experience.length > 0 || p.projects.length > 0 || p.summary.length > 40;
}
