// Picks a deterministic daily fortune for a uid by hashing uid+date, returning the latest version of that fortune.
import { createHash } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import db from 'src/lib/db.js';
import { fortune } from 'src/lib/schema.js';

export async function getFortune(uid: string): Promise<{ pk: number; id: number; text: string }> {
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const hash = createHash('sha256').update(`${uid}:${dateStr}`).digest();
    const id = hash[0];

    const latest = await db.select({ pk: fortune.pk, text: fortune.text })
        .from(fortune)
        .where(eq(fortune.id, id))
        .orderBy(desc(fortune.version))
        .limit(1);

    if (latest.length === 0) {
        throw new Error(`no fortune found for id ${id}`);
    }
    return { pk: latest[0].pk, id, text: latest[0].text };
}
