import { db } from '@/db';

/** Wipe and re-open the DB. Use in beforeEach for tests that mutate. */
export async function resetDb(): Promise<void> {
  await db.delete();
  await db.open();
}
