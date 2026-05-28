// Terminal 418: returns all current fortunes in an array indexed by fortune id.
import type { FastifySchema } from 'fastify';
import { sql } from 'drizzle-orm';
import db from 'src/lib/db.js';
import { fortune } from 'src/lib/schema.js';

export interface Terminal418Response {
    fortunes: (string | null)[];
}

export const getTerminal418Schema: FastifySchema = {
    response: {
        200: {
            type: 'object',
            properties: {
                fortunes: {
                    type: 'array',
                    items: { type: 'string', nullable: true },
                },
            },
        },
    },
};

export async function getTerminal418(): Promise<Terminal418Response> {
    const latestText = sql<string>`(select text from fortune f2 where f2.id = fortune.id order by f2.version desc limit 1)`;
    const rows = await db.select({ id: fortune.id, text: latestText })
        .from(fortune)
        .groupBy(fortune.id);

    const byId = new Map(rows.map(r => [r.id, r.text]));
    const maxId = rows.reduce((m, r) => Math.max(m, r.id), -1);
    const fortunes: (string | null)[] = Array.from({ length: maxId + 1 }, (_, i) => byId.get(i) ?? null);
    return { fortunes };
}
