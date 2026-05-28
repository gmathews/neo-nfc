// HTTP handlers + JSON schemas for listing users and inspecting a single user's events.
import type { FastifyReply, FastifyRequest, FastifySchema } from 'fastify';
import { asc, eq, gt, lt, type SQL, sql } from 'drizzle-orm';
import db from 'src/lib/db.js';
import type { ErrorResponse } from 'src/lib/routes/common.js';
import { PAGE_SIZE, paginate } from 'src/lib/routes/pagination.js';
import { cardData, feedback, fortune } from 'src/lib/schema.js';

export interface UsersListResponse {
    users: { uid: string; lastSeen: string; neoname: string | null }[];
    nextCursor: string | null;
    prevCursor: string | null;
}

export interface FeedbackEvent {
    type: 'feedback';
    createdAt: string;
    fortuneId: number;
    fortuneVersion: number;
    reaction: number;
    comment: string;
    neoname: string | null;
}

export interface CardReadEvent {
    type: 'card_read';
    createdAt: string;
    data: string;
}

export type UserEvent = FeedbackEvent | CardReadEvent;

export interface UserResponse {
    lastFeedback: Omit<FeedbackEvent, 'type'> | null;
    lastData: Omit<CardReadEvent, 'type'> | null;
    events: UserEvent[];
    nextCursor: string | null;
    prevCursor: string | null;
}

export const getUsersSchema: FastifySchema = {
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
};

export async function getUsers(request: FastifyRequest): Promise<UsersListResponse> {
    const { cursor, neoname: neonameSearch } = request.query as { cursor?: string; neoname?: string };

    const allUsers = sql`(
        select uid, created_at from card_data
        union all
        select uid, created_at from feedback
    )`;
    const lastSeenCol = sql<string>`max(u.created_at)`;
    const neonameCol = sql<string | null>`(select neoname from feedback f where f.uid = u.uid and f.neoname is not null order by f.created_at desc limit 1)`;

    const neonameFilter = neonameSearch
        ? sql`u.uid in (select uid from feedback where neoname like ${'%' + neonameSearch + '%'})`
        : undefined;

    // The cursor filter is on max(u.created_at), which is an aggregate — it
    // must go in HAVING. The neoname filter is on u.uid, which is a plain
    // row column — that goes in WHERE.
    const buildQuery = (havingFilter: SQL | undefined) => {
        let q = db.select({
            uid: sql<string>`u.uid`,
            lastSeen: lastSeenCol,
            neoname: neonameCol,
        }).from(sql`${allUsers} as u`).$dynamic();
        if (neonameFilter) q = q.where(neonameFilter);
        q = q.groupBy(sql`u.uid`);
        if (havingFilter) q = q.having(havingFilter);
        return q;
    };

    const { items: users, nextCursor, prevCursor } = await paginate({
        fetchForward: () => buildQuery(cursor ? lt(lastSeenCol, cursor) : undefined)
            .orderBy(sql`${lastSeenCol} desc`).limit(PAGE_SIZE + 1),
        fetchPrev: cursor
            ? () => buildQuery(gt(lastSeenCol, cursor)).orderBy(asc(lastSeenCol)).limit(PAGE_SIZE)
            : null,
        getCursor: r => r.lastSeen,
    });

    return { users, nextCursor, prevCursor };
}

export const getUserSchema: FastifySchema = {
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
};

export async function getUser(request: FastifyRequest, reply: FastifyReply): Promise<UserResponse | ErrorResponse> {
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
        reply.code(404);
        return { error: `user ${uid} not found` };
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
}
