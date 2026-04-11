import { createInterface } from 'node:readline/promises';
import { and, eq, like } from 'drizzle-orm';
import db from './db.js';
import { feedback } from './schema.js';
import logger, { color as c } from './logger.js';

export async function askAndSaveFeedback(uid: string, fortunePk: number): Promise<void> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const existing = await db.select({ id: feedback.id })
        .from(feedback)
        .where(and(eq(feedback.uid, uid), like(feedback.createdAt, `${today}%`)))
        .limit(1);
    if (existing.length > 0) {
        return;
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
        const comment = await rl.question(`${c.amber}any thoughts on your fortune? ${c.reset}`);
        const neoname = await rl.question(`${c.amber}what is your neoname? ${c.reset}`);
        rl.close();

        logger.info(`${c.amber}rate your fortune: [up] positive / [down] negative / [enter] neutral${c.reset}`);
        const reaction = await new Promise<number>((resolve) => {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.once('data', (data: Buffer) => {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                const key = data.toString();
                if (key === '\x1b[A') {
                    logger.info(`${c.green}▲ positive${c.reset}`);
                    resolve(1);
                } else if (key === '\x1b[B') {
                    logger.info(`${c.red}▼ negative${c.reset}`);
                    resolve(-1);
                } else {
                    logger.info(`${c.amber}● neutral${c.reset}`);
                    resolve(0);
                }
            });
        });

        const trimmedName = neoname.trim() || null;
        await db.insert(feedback).values({ uid, fortunePk, reaction, comment: comment.trim(), neoname: trimmedName });
        logger.info(`${c.amber}thanks, ${trimmedName ?? 'anonymous'}!${c.reset}`);
    } catch (err) {
        rl.close();
        throw err;
    }
}
