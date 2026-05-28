import { createClient } from '@libsql/client';
import { gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Card, Reader } from 'nfc-pcsc';
import type { ErrorResponse } from 'src/lib/routes/common.js';
import type {
    FortunePutResponse,
    FortuneResponse,
    FortunesListResponse,
} from 'src/lib/routes/fortune.js';
import type {
    ReaderBlockResponse,
    ReaderStatusResponse,
    ReaderWriteResponse,
} from 'src/lib/routes/reader.js';
import type { Terminal418Response } from 'src/lib/routes/terminal418.js';
import type { UserResponse, UsersListResponse } from 'src/lib/routes/user.js';
import { cardData, feedback, fortune } from 'src/lib/schema.js';

const client = createClient({ url: ':memory:' });
const testDb = drizzle(client);
await migrate(testDb, { migrationsFolder: 'drizzle' });

// Snapshot the migration-seeded fortune pks so we can reset additions per test.
const seededPks = await testDb.select({ pk: fortune.pk }).from(fortune);
const initialMaxFortunePk = seededPks.reduce((m, r) => Math.max(m, r.pk), 0);

vi.doMock('nfc-pcsc', () => ({
    KEY_TYPE_A: 0x60,
    TAG_ISO_14443_3: 'TAG_ISO_14443_3',
}));
vi.doMock('src/lib/db.js', () => ({ default: testDb }));

const { default: routes } = await import('src/lib/routes.js');
const { setCurrentCard, clearCurrentCard } = await import('src/lib/readerState.js');

interface FakeReader {
    reader: { name: string };
    authenticate: ReturnType<typeof vi.fn>;
    read: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
}

// ATR for Mifare Classic 4k — needed for FORTUNE_BLOCK (120) to fit.
const MIFARE_HEADER = '3B8F8001804F0CA000000306';
const CLASSIC_4K_VERSION = '000200000000';
const mifareAtr = Buffer.from(`${MIFARE_HEADER}00${CLASSIC_4K_VERSION}00`, 'hex');

function makeMifareCard(uid: string): Card {
    return { uid, type: 'TAG_ISO_14443_3', atr: mifareAtr } as unknown as Card;
}

function makeUnknownCard(uid: string): Card {
    return { uid, type: 'other', atr: Buffer.alloc(0) } as unknown as Card;
}

function makeFakeReader(): FakeReader {
    return {
        reader: { name: 'ACS ACR122U PICC Interface' },
        authenticate: vi.fn().mockResolvedValue(undefined),
        read: vi.fn().mockImplementation((_b: number, length: number) => Promise.resolve(Buffer.alloc(length))),
        write: vi.fn().mockResolvedValue(undefined),
    };
}

function presentCard(reader: FakeReader, card: Card): void {
    setCurrentCard(reader as unknown as Reader, card);
}

function requireCursor<T extends string | number>(c: T | null, label: string): T {
    if (c === null) throw new Error(`expected non-null ${label}`);
    return c;
}

let app: FastifyInstance;

beforeAll(async () => {
    app = Fastify();
    await app.register(routes);
    await app.ready();
});

afterAll(async () => {
    await app.close();
});

beforeEach(async () => {
    await testDb.delete(feedback);
    await testDb.delete(cardData);
    await testDb.delete(fortune).where(gt(fortune.pk, initialMaxFortunePk));
    clearCurrentCard({ uid: 'never-matches' } as unknown as Card);
    // Workaround: clearCurrentCard only clears if the uid matches. Force-clear by
    // setting then clearing with the same uid.
    const sentinel = makeUnknownCard('__reset__');
    presentCard(makeFakeReader(), sentinel);
    clearCurrentCard(sentinel);
});

describe('GET /fortune', () => {
    test('returns first page with nextCursor when many exist', async () => {
        const res = await app.inject({ method: 'GET', url: '/fortune' });
        expect(res.statusCode).toBe(200);
        const body = res.json<FortunesListResponse>();
        expect(body.fortunes.length).toBe(20);
        expect(body.nextCursor).toBe(body.fortunes[body.fortunes.length - 1].id);
        for (let i = 1; i < body.fortunes.length; i++) {
            expect(body.fortunes[i].id).toBeGreaterThan(body.fortunes[i - 1].id);
        }
    });

    test('paginates forward via cursor', async () => {
        const r1 = await app.inject({ method: 'GET', url: '/fortune' });
        const cursor = requireCursor(r1.json<FortunesListResponse>().nextCursor, 'fortunes nextCursor');
        const r2 = await app.inject({ method: 'GET', url: `/fortune?cursor=${cursor}` });
        const body = r2.json<FortunesListResponse>();
        expect(body.fortunes.length).toBeGreaterThan(0);
        expect(body.fortunes[0].id).toBeGreaterThan(cursor);
    });

    test('exposes prevCursor once a full previous page exists', async () => {
        // pagination.ts only fills prevCursor when there are >= PAGE_SIZE rows behind
        // the cursor, so we need to advance two pages in before checking.
        const r1 = await app.inject({ method: 'GET', url: '/fortune' });
        const c1 = requireCursor(r1.json<FortunesListResponse>().nextCursor, 'page 1 nextCursor');
        const r2 = await app.inject({ method: 'GET', url: `/fortune?cursor=${c1}` });
        const c2 = requireCursor(r2.json<FortunesListResponse>().nextCursor, 'page 2 nextCursor');
        const r3 = await app.inject({ method: 'GET', url: `/fortune?cursor=${c2}` });
        expect(r3.json<FortunesListResponse>().prevCursor).not.toBeNull();
    });

    test('returns empty list when search matches nothing', async () => {
        const res = await app.inject({ method: 'GET', url: '/fortune?search=zzNOMATCHzz' });
        const body = res.json<FortunesListResponse>();
        expect(body.fortunes).toEqual([]);
        expect(body.nextCursor).toBeNull();
    });
});

describe('GET /fortune/:id', () => {
    test('returns the latest version for an id', async () => {
        // Add a new version so we can verify "latest" is honored.
        await testDb.insert(fortune).values({ id: 0, version: 999, text: 'new version' });
        const res = await app.inject({ method: 'GET', url: '/fortune/0' });
        expect(res.statusCode).toBe(200);
        const body = res.json<FortuneResponse>();
        expect(body.id).toBe(0);
        expect(body.version).toBe(999);
        expect(body.text).toBe('new version');
        expect(body.feedback).toEqual({ count: 0, sum: 0 });
    });

    test('respects ?version=N to fetch a specific version', async () => {
        await testDb.insert(fortune).values({ id: 0, version: 999, text: 'new version' });
        const res = await app.inject({ method: 'GET', url: '/fortune/0?version=0' });
        const body = res.json<FortuneResponse>();
        expect(body.version).toBe(0);
        expect(body.text).not.toBe('new version');
    });

    test('aggregates feedback count and reaction sum', async () => {
        const [row] = await testDb.select().from(fortune).limit(1);
        await testDb.insert(feedback).values([
            { uid: 'a', fortunePk: row.pk, reaction: 1, comment: 'good', neoname: null },
            { uid: 'b', fortunePk: row.pk, reaction: -1, comment: 'bad', neoname: null },
            { uid: 'c', fortunePk: row.pk, reaction: 1, comment: 'good', neoname: null },
        ]);
        const res = await app.inject({ method: 'GET', url: `/fortune/${row.id}` });
        const body = res.json<FortuneResponse>();
        expect(body.feedback.count).toBe(3);
        expect(body.feedback.sum).toBe(1);
    });

    test('returns 404 for an unknown id', async () => {
        const res = await app.inject({ method: 'GET', url: '/fortune/9999' });
        expect(res.statusCode).toBe(404);
        expect(res.json<ErrorResponse>().error).toContain('9999');
    });

    test('returns 404 for an unknown version of an existing id', async () => {
        const res = await app.inject({ method: 'GET', url: '/fortune/0?version=9999' });
        expect(res.statusCode).toBe(404);
        const err = res.json<ErrorResponse>().error;
        expect(err).toContain('9999');
        expect(err).toContain('version');
    });
});

describe('PUT /fortune/:id', () => {
    test('creates a new version with the next version number', async () => {
        const before = await app.inject({ method: 'GET', url: '/fortune/0' });
        const beforeVersion = before.json<FortuneResponse>().version;

        const put = await app.inject({
            method: 'PUT',
            url: '/fortune/0',
            payload: { text: 'updated fortune body' },
        });
        expect(put.statusCode).toBe(200);
        const body = put.json<FortunePutResponse>();
        expect(body.id).toBe(0);
        expect(body.version).toBe(beforeVersion + 1);
        expect(body.text).toBe('updated fortune body');

        const after = await app.inject({ method: 'GET', url: '/fortune/0' });
        expect(after.json<FortuneResponse>().text).toBe('updated fortune body');
    });

    test('returns 404 when updating an unknown id', async () => {
        const res = await app.inject({
            method: 'PUT',
            url: '/fortune/9999',
            payload: { text: 'never lands' },
        });
        expect(res.statusCode).toBe(404);
    });
});

describe('GET /terminal418', () => {
    test('returns latest fortune text indexed by id', async () => {
        await testDb.insert(fortune).values({ id: 0, version: 999, text: 'latest 0' });
        const res = await app.inject({ method: 'GET', url: '/terminal418' });
        expect(res.statusCode).toBe(200);
        const body = res.json<Terminal418Response>();
        expect(body.fortunes[0]).toBe('latest 0');
        expect(body.fortunes.length).toBeGreaterThan(1);
    });
});

describe('GET /user/:uid', () => {
    test('returns 404 for unknown uid', async () => {
        const res = await app.inject({ method: 'GET', url: '/user/never-existed' });
        expect(res.statusCode).toBe(404);
    });

    test('returns feedback + card events with lastFeedback / lastData', async () => {
        const [row] = await testDb.select().from(fortune).limit(1);
        await testDb.insert(feedback).values({
            uid: 'u-1', fortunePk: row.pk, reaction: 1, comment: 'nice', neoname: 'alice',
        });
        await testDb.insert(cardData).values({ uid: 'u-1', data: 'deadbeef' });

        const res = await app.inject({ method: 'GET', url: '/user/u-1' });
        expect(res.statusCode).toBe(200);
        const body = res.json<UserResponse>();
        expect(body.lastFeedback?.neoname).toBe('alice');
        expect(body.lastFeedback?.reaction).toBe(1);
        expect(body.lastData?.data).toBe('deadbeef');
        expect(body.events).toHaveLength(2);
        expect(body.events.map(e => e.type).sort()).toEqual(['card_read', 'feedback']);
    });
});

describe('GET /user/:uid pagination', () => {
    test('paginates events for a user with cursor + prevCursor', async () => {
        // Need more than PAGE_SIZE (20) events to trip the cursor path.
        const rows = Array.from({ length: 25 }, (_, i) => ({
            uid: 'u-page',
            data: `block-${i}`,
            createdAt: new Date(2026, 0, 1, 0, 0, i).toISOString(),
        }));
        await testDb.insert(cardData).values(rows);

        const r1 = await app.inject({ method: 'GET', url: '/user/u-page' });
        const p1 = r1.json<UserResponse>();
        expect(p1.events).toHaveLength(20);
        const cursor = requireCursor(p1.nextCursor, 'user events nextCursor');

        const r2 = await app.inject({ method: 'GET', url: `/user/u-page?cursor=${encodeURIComponent(cursor)}` });
        const p2 = r2.json<UserResponse>();
        expect(p2.events.length).toBeGreaterThan(0);
        expect(p2.prevCursor).not.toBeNull();
        // Second page events are older than the cursor (createdAt < cursor).
        for (const e of p2.events) {
            expect(e.createdAt < cursor).toBe(true);
        }
    });
});

describe('GET /user', () => {
    test('paginates the user list with a cursor', async () => {
        const [row] = await testDb.select().from(fortune).limit(1);
        // 22 distinct uids → triggers nextCursor on page 1 and exercises the
        // cursor branch on page 2.
        const rows = Array.from({ length: 22 }, (_, i) => ({
            uid: `u-list-${i.toString().padStart(2, '0')}`,
            fortunePk: row.pk,
            reaction: 0,
            comment: '',
            neoname: null,
            createdAt: new Date(2026, 0, 1, 0, 0, i).toISOString(),
        }));
        await testDb.insert(feedback).values(rows);

        const r1 = await app.inject({ method: 'GET', url: '/user' });
        const p1 = r1.json<UsersListResponse>();
        expect(p1.users).toHaveLength(20);
        const cursor = requireCursor(p1.nextCursor, 'users nextCursor');

        const r2 = await app.inject({ method: 'GET', url: `/user?cursor=${encodeURIComponent(cursor)}` });
        const p2 = r2.json<UsersListResponse>();
        expect(p2.users.length).toBeGreaterThan(0);
        for (const u of p2.users) {
            expect(u.lastSeen < cursor).toBe(true);
        }
    });

    test('filters by neoname search', async () => {
        const [row] = await testDb.select().from(fortune).limit(1);
        await testDb.insert(feedback).values([
            { uid: 'u-a', fortunePk: row.pk, reaction: 0, comment: '', neoname: 'gibson' },
            { uid: 'u-b', fortunePk: row.pk, reaction: 0, comment: '', neoname: 'molly' },
        ]);

        const res = await app.inject({ method: 'GET', url: '/user?neoname=gib' });
        expect(res.statusCode).toBe(200);
        const body = res.json<UsersListResponse>();
        expect(body.users.map(u => u.uid)).toEqual(['u-a']);
        expect(body.users[0].neoname).toBe('gibson');
    });
});

describe('GET /reader/status', () => {
    test('reports no card when none is presented', async () => {
        const res = await app.inject({ method: 'GET', url: '/reader/status' });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ present: false, uid: null, readerName: null });
    });

    test('reports the current card and reader name when one is presented', async () => {
        presentCard(makeFakeReader(), makeMifareCard('uid-42'));
        const res = await app.inject({ method: 'GET', url: '/reader/status' });
        const body = res.json<ReaderStatusResponse>();
        expect(body.present).toBe(true);
        expect(body.uid).toBe('uid-42');
        expect(body.readerName).toContain('ACR122U');
    });
});

describe('POST /reader/block', () => {
    test('returns 409 when no card is present', async () => {
        const res = await app.inject({
            method: 'POST', url: '/reader/block',
            payload: { block: 1, data: '00'.repeat(16) },
        });
        expect(res.statusCode).toBe(409);
    });

    test('returns 400 for an unsupported card type', async () => {
        presentCard(makeFakeReader(), makeUnknownCard('uid-x'));
        const res = await app.inject({
            method: 'POST', url: '/reader/block',
            payload: { block: 1, data: '00'.repeat(16) },
        });
        expect(res.statusCode).toBe(400);
        expect(res.json<ErrorResponse>().error).toContain('unsupported');
    });

    test('returns 400 when the block is out of range', async () => {
        presentCard(makeFakeReader(), makeMifareCard('uid-oor'));
        // Mifare Classic 4k has 256 blocks (max index 255).
        const res = await app.inject({
            method: 'POST', url: '/reader/block',
            payload: { block: 9999, data: '00'.repeat(16) },
        });
        expect(res.statusCode).toBe(400);
        expect(res.json<ErrorResponse>().error).toContain('out of range');
    });

    test('refuses to write a sector trailer', async () => {
        presentCard(makeFakeReader(), makeMifareCard('uid-1'));
        const res = await app.inject({
            method: 'POST', url: '/reader/block',
            payload: { block: 3, data: '00'.repeat(16) },
        });
        expect(res.statusCode).toBe(400);
        expect(res.json<ErrorResponse>().error).toContain('trailer');
    });

    test('returns 400 when data length does not match the block size', async () => {
        presentCard(makeFakeReader(), makeMifareCard('uid-1'));
        const res = await app.inject({
            method: 'POST', url: '/reader/block',
            payload: { block: 1, data: 'aa' },
        });
        expect(res.statusCode).toBe(400);
        expect(res.json<ErrorResponse>().error).toContain('hex chars');
    });

    test('returns 400 when data is not hex', async () => {
        presentCard(makeFakeReader(), makeMifareCard('uid-1'));
        const res = await app.inject({
            method: 'POST', url: '/reader/block',
            payload: { block: 1, data: 'z'.repeat(32) },
        });
        expect(res.statusCode).toBe(400);
        expect(res.json<ErrorResponse>().error).toContain('hex');
    });

    test('writes to a writable block and returns uid + block', async () => {
        const reader = makeFakeReader();
        presentCard(reader, makeMifareCard('uid-w'));
        const data = '11'.repeat(16);
        const res = await app.inject({
            method: 'POST', url: '/reader/block',
            payload: { block: 1, data },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json<ReaderBlockResponse>()).toEqual({ uid: 'uid-w', block: 1 });
        expect(reader.write).toHaveBeenCalledOnce();
        const [block, buf] = reader.write.mock.calls[0] as [number, Buffer, number];
        expect(block).toBe(1);
        expect(buf.toString('hex')).toBe(data);
    });

    test('surfaces a 500 when the underlying write fails', async () => {
        const reader = makeFakeReader();
        reader.write.mockRejectedValueOnce(new Error('hardware glitch'));
        presentCard(reader, makeMifareCard('uid-fail'));
        const res = await app.inject({
            method: 'POST', url: '/reader/block',
            payload: { block: 1, data: '00'.repeat(16) },
        });
        expect(res.statusCode).toBe(500);
        expect(res.json<ErrorResponse>().error).toContain('hardware glitch');
    });
});

describe('POST /reader/write', () => {
    test('returns 409 when no card is present', async () => {
        const res = await app.inject({
            method: 'POST', url: '/reader/write',
            payload: { data: '00'.repeat(16) },
        });
        expect(res.statusCode).toBe(409);
    });

    test('returns 400 when data is not aligned to block size', async () => {
        presentCard(makeFakeReader(), makeMifareCard('uid-m'));
        const res = await app.inject({
            method: 'POST', url: '/reader/write',
            payload: { data: '00' },
        });
        expect(res.statusCode).toBe(400);
        expect(res.json<ErrorResponse>().error).toContain('aligned');
    });

    test('returns 400 for an unsupported card type', async () => {
        presentCard(makeFakeReader(), makeUnknownCard('uid-bad'));
        const res = await app.inject({
            method: 'POST', url: '/reader/write',
            payload: { data: '00'.repeat(16) },
        });
        expect(res.statusCode).toBe(400);
        expect(res.json<ErrorResponse>().error).toContain('unsupported');
    });

    test('returns 500 with partial written count when a mid-stream write fails', async () => {
        const reader = makeFakeReader();
        // blocks 0 (skip), 1, 2, 3 (trailer skip), 4 (fail), ...
        // → expect 2 successful writes (1, 2) before block 4 fails.
        reader.write
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('aborted'));
        presentCard(reader, makeMifareCard('uid-fail'));
        const res = await app.inject({
            method: 'POST', url: '/reader/write',
            payload: { data: '11'.repeat(16 * 8) },
        });
        expect(res.statusCode).toBe(500);
        const body = res.json<{ error: string; written: number }>();
        expect(body.written).toBe(2);
        expect(body.error).toContain('block 4');
    });

    test('skips block 0 + sector trailers, writes everything else', async () => {
        const reader = makeFakeReader();
        presentCard(reader, makeMifareCard('uid-many'));
        // 8 blocks worth: block 0 (manufacturer, skip), 1, 2, 3 (trailer, skip), 4, 5, 6, 7 (trailer, skip).
        const data = '11'.repeat(16 * 8);
        const res = await app.inject({
            method: 'POST', url: '/reader/write',
            payload: { data },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json<ReaderWriteResponse>()).toEqual({ uid: 'uid-many', written: 5, skipped: 3 });
        const writtenBlocks = (reader.write.mock.calls as [number, Buffer, number][]).map(c => c[0]);
        expect(writtenBlocks).toEqual([1, 2, 4, 5, 6]);
    });
});
