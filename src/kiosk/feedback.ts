// Prompts the user for a reaction + comment after their fortune, skipping if they already left feedback today.
import { and, eq, gte } from 'drizzle-orm';
import { tag as t, TUI } from './tui.js';
import db from 'src/lib/db.js';
import { feedback } from 'src/lib/schema.js';

export async function askAndSaveFeedback(tui: TUI, uid: string, fortunePk: number): Promise<boolean> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const existing = await db.select({ id: feedback.id })
        .from(feedback)
        .where(and(eq(feedback.uid, uid), gte(feedback.createdAt, startOfToday)))
        .limit(1);
    if (existing.length > 0) {
        return true;
    }

    const values = await tui.askForm('feedback', [
        { type: 'text', name: 'comment', label: 'how do you feel about your horoscope?' },
        { type: 'text', name: 'neoname', label: 'what is your neoname?' },
        { type: 'choice', name: 'reaction', label: 'rate your horoscope', default: '0', options: [
            { label: '▲ positive', value: '1' },
            { label: '● neutral', value: '0' },
            { label: '▼ negative', value: '-1' },
        ] },
    ]);
    if (!values) return false;
    const { comment, neoname } = values;
    const reaction = parseInt(values.reaction, 10);
    if (reaction === 1) tui.log(t.green('▲ positive'));
    else if (reaction === -1) tui.log(t.red('▼ negative'));
    else tui.log(t.lime('● neutral'));

    const trimmedName = neoname.trim() || null;
    await db.insert(feedback).values({ uid, fortunePk, reaction, comment: comment.trim(), neoname: trimmedName });
    tui.log(t.lime(`thanks, ${trimmedName ?? 'anonymous'}!`));
    return false;
}
