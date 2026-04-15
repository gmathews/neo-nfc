// HTTP handlers + JSON schemas for listing, fetching, and updating fortunes.
import type { FastifyReply, FastifyRequest, FastifySchema } from 'fastify';
import { and, asc, count, desc, eq, gt, lt, sql } from 'drizzle-orm';
import db from 'src/lib/db.js';
import { PAGE_SIZE, paginate } from 'src/lib/routes/pagination.js';
import { feedback, fortune } from 'src/lib/schema.js';

export const getFortunesSchema: FastifySchema = {
    querystring: {
        type: 'object',
        properties: {
            cursor: { type: 'integer' },
            search: { type: 'string' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                fortunes: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'integer' },
                            text: { type: 'string' },
                        },
                    },
                },
                nextCursor: { type: 'integer', nullable: true },
                prevCursor: { type: 'integer', nullable: true },
            },
        },
    },
};

export async function getFortunes(request: FastifyRequest) {
    const { cursor = -1, search } = request.query as { cursor?: number; search?: string };

    const latestText = sql<string>`(select text from fortune f2 where f2.id = fortune.id order by f2.version desc limit 1)`;
    const baseSelect = () => db.select({ id: fortune.id, text: latestText })
        .from(fortune)
        .groupBy(fortune.id);

    const searchFilter = search
        ? sql`${latestText} like ${'%' + search + '%'}`
        : undefined;

    const withFilters = (...conditions: (ReturnType<typeof gt> | undefined)[]) => {
        const filtered = conditions.filter((c): c is ReturnType<typeof gt> => c !== undefined);
        return filtered.length > 0 ? baseSelect().where(and(...filtered)) : baseSelect();
    };

    const { items: fortunes, nextCursor, prevCursor } = await paginate({
        fetchForward: () => withFilters(gt(fortune.id, cursor), searchFilter).orderBy(asc(fortune.id)).limit(PAGE_SIZE + 1),
        fetchPrev: cursor >= 0
            ? () => withFilters(lt(fortune.id, cursor), searchFilter).orderBy(desc(fortune.id)).limit(PAGE_SIZE)
            : null,
        getCursor: r => r.id,
    });

    return { fortunes, nextCursor, prevCursor };
}

export const getFortuneSchema: FastifySchema = {
    params: {
        type: 'object',
        properties: { id: { type: 'integer' } },
        required: ['id'],
    },
    querystring: {
        type: 'object',
        properties: { version: { type: 'integer' } },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                id: { type: 'integer' },
                version: { type: 'integer' },
                text: { type: 'string' },
                feedback: {
                    type: 'object',
                    properties: {
                        count: { type: 'integer' },
                        sum: { type: 'integer' },
                    },
                },
            },
        },
        404: {
            type: 'object',
            properties: { error: { type: 'string' } },
        },
    },
};

export async function getFortune(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: number };
    const { version } = request.query as { version?: number };

    const result = await db.select({ pk: fortune.pk, version: fortune.version, text: fortune.text })
        .from(fortune)
        .where(version !== undefined
            ? and(eq(fortune.id, id), eq(fortune.version, version))
            : eq(fortune.id, id))
        .orderBy(desc(fortune.version))
        .limit(1);

    if (result.length === 0) {
        return reply.status(404).send({ error: version !== undefined ? `fortune ${id} version ${version} not found` : `fortune ${id} not found` });
    }

    const [stats] = await db.select({
        count: count(),
        sum: sql<number>`coalesce(sum(${feedback.reaction}), 0)`,
    })
        .from(feedback)
        .where(eq(feedback.fortunePk, result[0].pk));

    return {
        id,
        version: result[0].version,
        text: result[0].text,
        feedback: {
            count: stats.count,
            sum: stats.sum,
        },
    };
}

export const putFortuneSchema: FastifySchema = {
    params: {
        type: 'object',
        properties: { id: { type: 'integer' } },
        required: ['id'],
    },
    body: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
    },
    response: {
        200: {
            type: 'object',
            properties: {
                id: { type: 'integer' },
                version: { type: 'integer' },
                text: { type: 'string' },
            },
        },
        404: {
            type: 'object',
            properties: { error: { type: 'string' } },
        },
    },
};

export async function putFortune(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: number };
    const { text: newText } = request.body as { text: string };

    const latest = await db.select({ version: fortune.version })
        .from(fortune)
        .where(eq(fortune.id, id))
        .orderBy(desc(fortune.version))
        .limit(1);

    if (latest.length === 0) {
        return reply.status(404).send({ error: `fortune ${id} not found` });
    }

    const newVersion = latest[0].version + 1;
    await db.insert(fortune).values({ id, version: newVersion, text: newText });

    return { id, version: newVersion, text: newText };
}
