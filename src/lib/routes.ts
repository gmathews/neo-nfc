import type { FastifyInstance, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerDefault } from 'fastify';
import type { Logger } from 'pino';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { and, asc, count, desc, eq, gt, lt, sql } from 'drizzle-orm';
import db from './db.js';
import { cardData, feedback, fortune } from './schema.js';

const PAGE_SIZE = 20;

async function paginate<T, C extends string | number>(opts: {
    fetchForward: () => Promise<T[]>;
    fetchPrev: (() => Promise<T[]>) | null;
    getCursor: (row: T) => C;
}): Promise<{ items: T[]; nextCursor: C | null; prevCursor: C | null }> {
    const rows = await opts.fetchForward();
    const hasMore = rows.length > PAGE_SIZE;
    const items = rows.slice(0, PAGE_SIZE);
    const nextCursor = hasMore ? opts.getCursor(items[items.length - 1]) : null;
    let prevCursor: C | null = null;
    if (opts.fetchPrev) {
        const prev = await opts.fetchPrev();
        if (prev.length >= PAGE_SIZE) {
            prevCursor = opts.getCursor(prev[prev.length - 1]);
        }
    }
    return { items, nextCursor, prevCursor };
}

export async function registerRoutes(app: FastifyInstance<RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, Logger>): Promise<void> {
    await app.register(swagger, {
        openapi: {
            info: {
                title: 'Neotropolis Fortune API',
                version: '1.0.0',
            },
        },
    });
    await app.register(swaggerUi, { routePrefix: '/docs' });
    // GET /fortune — paginated list of fortunes (cursor-based, up to 20)
    app.get('/fortune', {
        schema: {
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
        },
    }, async (request) => {
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
    });

    // GET /fortune/:id — get the latest version of a fortune, with feedback stats
    app.get('/fortune/:id', {
        schema: {
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
        },
    }, async (request, reply) => {
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
    });

    // PUT /fortune/:id — update a fortune's text, incrementing the version
    app.put('/fortune/:id', {
        schema: {
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
        },
    }, async (request, reply) => {
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
    });

    // GET /user — paginated list of users (cursor-based, up to 20)
    app.get('/user', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    cursor: { type: 'string' },
                    neoname: { type: 'string' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        users: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    uid: { type: 'string' },
                                    lastSeen: { type: 'string' },
                                    neoname: { type: 'string', nullable: true },
                                },
                            },
                        },
                        nextCursor: { type: 'string', nullable: true },
                        prevCursor: { type: 'string', nullable: true },
                    },
                },
            },
        },
    }, async (request) => {
        const { cursor, neoname: neonameSearch } = request.query as { cursor?: string; neoname?: string };

        const allUsers = sql`(
            select uid, created_at from card_data
            union all
            select uid, created_at from feedback
        )`;
        const lastSeenCol = sql<string>`max(u.created_at)`;
        const neonameCol = sql<string | null>`(select neoname from feedback f where f.uid = u.uid and f.neoname is not null order by f.created_at desc limit 1)`;

        const baseSelect = () => db.select({
            uid: sql<string>`u.uid`,
            lastSeen: lastSeenCol,
            neoname: neonameCol,
        }).from(sql`${allUsers} as u`).groupBy(sql`u.uid`);

        const neonameFilter = neonameSearch
            ? sql`u.uid in (select uid from feedback where neoname like ${'%' + neonameSearch + '%'})`
            : undefined;

        const withFilters = (...conditions: (ReturnType<typeof lt> | undefined)[]) => {
            const filtered = conditions.filter((c): c is ReturnType<typeof lt> => c !== undefined);
            return filtered.length > 0 ? baseSelect().where(and(...filtered)) : baseSelect();
        };

        const { items: users, nextCursor, prevCursor } = await paginate({
            fetchForward: () => cursor
                ? withFilters(lt(lastSeenCol, cursor), neonameFilter).orderBy(sql`${lastSeenCol} desc`).limit(PAGE_SIZE + 1)
                : withFilters(neonameFilter).orderBy(sql`${lastSeenCol} desc`).limit(PAGE_SIZE + 1),
            fetchPrev: cursor
                ? () => withFilters(gt(lastSeenCol, cursor), neonameFilter).orderBy(asc(lastSeenCol)).limit(PAGE_SIZE)
                : null,
            getCursor: r => r.lastSeen,
        });

        return { users, nextCursor, prevCursor };
    });

    // GET /user/:uid — paginated events for a uid, newest first
    app.get('/user/:uid', {
        schema: {
            params: {
                type: 'object',
                properties: { uid: { type: 'string' } },
                required: ['uid'],
            },
            querystring: {
                type: 'object',
                properties: { cursor: { type: 'string' } },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        lastFeedback: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                createdAt: { type: 'string' },
                                fortuneId: { type: 'integer' },
                                fortuneVersion: { type: 'integer' },
                                reaction: { type: 'integer' },
                                comment: { type: 'string' },
                                neoname: { type: 'string', nullable: true },
                            },
                        },
                        lastData: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                createdAt: { type: 'string' },
                                data: { type: 'string' },
                            },
                        },
                        events: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    type: { type: 'string', enum: ['feedback', 'card_read'] },
                                    createdAt: { type: 'string' },
                                    fortuneId: { type: 'integer' },
                                    fortuneVersion: { type: 'integer' },
                                    reaction: { type: 'integer' },
                                    comment: { type: 'string' },
                                    neoname: { type: 'string', nullable: true },
                                    data: { type: 'string' },
                                },
                            },
                        },
                        nextCursor: { type: 'string', nullable: true },
                        prevCursor: { type: 'string', nullable: true },
                    },
                },
                404: {
                    type: 'object',
                    properties: { error: { type: 'string' } },
                },
            },
        },
    }, async (request, reply) => {
        const { uid } = request.params as { uid: string };
        const { cursor } = request.query as { cursor?: string };

        const feedbackQuery = db.select({
            createdAt: feedback.createdAt,
            fortuneId: fortune.id,
            fortuneVersion: fortune.version,
            reaction: feedback.reaction,
            comment: feedback.comment,
            neoname: feedback.neoname,
        })
            .from(feedback)
            .innerJoin(fortune, eq(feedback.fortunePk, fortune.pk))
            .where(eq(feedback.uid, uid));

        const cardQuery = db.select()
            .from(cardData)
            .where(eq(cardData.uid, uid));

        const [feedbackRows, cardRows] = await Promise.all([feedbackQuery, cardQuery]);

        if (feedbackRows.length === 0 && cardRows.length === 0) {
            return reply.status(404).send({ error: `user ${uid} not found` });
        }

        const allEvents = [
            ...feedbackRows.map(r => ({
                type: 'feedback' as const,
                createdAt: r.createdAt,
                fortuneId: r.fortuneId,
                fortuneVersion: r.fortuneVersion,
                reaction: r.reaction,
                comment: r.comment,
                neoname: r.neoname,
            })),
            ...cardRows.map(r => ({
                type: 'card_read' as const,
                createdAt: r.createdAt,
                data: r.data,
            })),
        ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        const startIdx = cursor
            ? allEvents.findIndex(e => e.createdAt < cursor)
            : 0;
        const page = startIdx >= 0 ? allEvents.slice(startIdx, startIdx + PAGE_SIZE + 1) : [];
        const hasMore = page.length > PAGE_SIZE;
        const events = page.slice(0, PAGE_SIZE);
        const nextCursor = hasMore ? events[events.length - 1].createdAt : null;
        const prevCursor = startIdx > 0 ? allEvents[startIdx - 1].createdAt : null;

        const lastFeedbackRow = feedbackRows.length > 0
            ? feedbackRows.reduce((a, b) => a.createdAt > b.createdAt ? a : b)
            : null;
        const lastFeedback = lastFeedbackRow
            ? {
                    createdAt: lastFeedbackRow.createdAt,
                    fortuneId: lastFeedbackRow.fortuneId,
                    fortuneVersion: lastFeedbackRow.fortuneVersion,
                    reaction: lastFeedbackRow.reaction,
                    comment: lastFeedbackRow.comment,
                    neoname: lastFeedbackRow.neoname,
                }
            : null;
        const lastCardRow = cardRows.length > 0
            ? cardRows.reduce((a, b) => a.createdAt > b.createdAt ? a : b)
            : null;
        const lastData = lastCardRow
            ? {
                    createdAt: lastCardRow.createdAt,
                    data: lastCardRow.data,
                }
            : null;

        return { lastFeedback, lastData, events, nextCursor, prevCursor };
    });
}
