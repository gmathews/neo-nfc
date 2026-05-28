import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import type { Card, Reader } from 'nfc-pcsc';
import type { TUI } from 'src/kiosk/tui.js';
import { feedback } from 'src/lib/schema.js';

const client = createClient({ url: ':memory:' });
const testDb = drizzle(client);
await migrate(testDb, { migrationsFolder: 'drizzle' });

vi.doMock('nfc-pcsc', () => ({
    KEY_TYPE_A: 0x60,
    TAG_ISO_14443_3: 'TAG_ISO_14443_3',
}));
vi.doMock('src/lib/db.js', () => ({ default: testDb }));

const { createCardHandlers } = await import('src/kiosk/card.js');

// ATR layout (per AuthCardReadWrite.checkMifare): first 12 bytes = Mifare Classic
// header, bytes 13..19 = card-type version. '000200000000' selects Classic 4k
// (256 blocks), which is needed because FORTUNE_BLOCK = 120 must fit.
const MIFARE_HEADER = '3B8F8001804F0CA000000306';
const CLASSIC_4K_VERSION = '000200000000';
const atr = Buffer.from(`${MIFARE_HEADER}00${CLASSIC_4K_VERSION}00`, 'hex');

function makeCard(uid: string): Card {
    return { uid, type: 'TAG_ISO_14443_3', atr } as unknown as Card;
}

interface FakeReader {
    reader: { name: string };
    authenticate: ReturnType<typeof vi.fn>;
    read: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
}

function makeReader(): FakeReader {
    return {
        reader: { name: 'ACS ACR122U PICC Interface' },
        authenticate: vi.fn().mockResolvedValue(undefined),
        read: vi.fn().mockImplementation((_b: number, length: number) => Promise.resolve(Buffer.alloc(length))),
        write: vi.fn().mockResolvedValue(undefined),
    };
}

const asReader = (r: FakeReader): Reader => r as unknown as Reader;

function makeTui(readOnly = false): TUI {
    return {
        log: vi.fn(),
        logLine: vi.fn(() => ({ update: vi.fn() })),
        spinner: vi.fn(() => ({
            newLine: vi.fn(),
            setContent: vi.fn(),
            finalize: vi.fn(),
            stop: vi.fn(),
        })),
        clear: vi.fn(),
        setBanner: vi.fn(),
        showModal: vi.fn(),
        dismissModal: vi.fn(),
        setPanel: vi.fn(),
        clearPanel: vi.fn(),
        askForm: vi.fn().mockResolvedValue({ comment: 'looks good', neoname: 'tester', reaction: '0' }),
        dismissForm: vi.fn(),
        isReadOnly: vi.fn(() => readOnly),
        destroy: vi.fn(),
    };
}

const logCalls = (tui: TUI): string[] =>
    vi.mocked(tui.log).mock.calls.map(c => c[0]);

describe('card flow', () => {
    beforeEach(async () => {
        // feedback rows drive the second-time detection; reset between tests so
        // uids don't bleed. fortunes are seeded by migrations and stay put.
        await testDb.delete(feedback);
    });

    test('writes fortune badge in normal mode', async () => {
        const tui = makeTui(false);
        const reader = makeReader();
        const { handleCard } = createCardHandlers(tui);
        await handleCard(asReader(reader), makeCard('uid-1'));
        const calls = reader.write.mock.calls as [number, Buffer, number][];
        const fortuneCall = calls.find(([block]) => block === 120);
        if (!fortuneCall) throw new Error('expected a write to block 120');
        expect(fortuneCall[1].subarray(0, 9).toString('ascii')).toBe('h3LLraz0r');
    });

    test('skips fortune badge write in read-only mode', async () => {
        const tui = makeTui(true);
        const reader = makeReader();
        const { handleCard } = createCardHandlers(tui);
        await handleCard(asReader(reader), makeCard('uid-2'));
        const calls = reader.write.mock.calls as [number, Buffer, number][];
        expect(calls.find(([block]) => block === 120)).toBeUndefined();
    });

    test('logs read-only skip message when read-only is on', async () => {
        const tui = makeTui(true);
        const reader = makeReader();
        const { handleCard } = createCardHandlers(tui);
        await handleCard(asReader(reader), makeCard('uid-3'));
        expect(logCalls(tui).some(m => m.includes('read-only — skipping augment write'))).toBe(true);
    });

    test('first-time user sees the visit-418 prompt on card-off', async () => {
        const tui = makeTui(false);
        const reader = makeReader();
        const { handleCard, handleCardOff } = createCardHandlers(tui);
        const card = makeCard('uid-4');
        await handleCard(asReader(reader), card);
        vi.mocked(tui.log).mockClear();
        await handleCardOff(asReader(reader), card);
        expect(logCalls(tui).some(m => m.includes('visit') && m.includes('terminal 418'))).toBe(true);
        expect(vi.mocked(tui.askForm)).toHaveBeenCalledOnce();
    });

    test('returning user (existing feedback today) gets the "did you visit" wording', async () => {
        const tui = makeTui(false);
        const reader = makeReader();
        const { handleCard, handleCardOff } = createCardHandlers(tui);
        const card = makeCard('uid-5');
        await handleCard(asReader(reader), card);
        // Pre-existing feedback row should short-circuit askAndSaveFeedback to "second time"
        await testDb.insert(feedback).values({
            uid: 'uid-5',
            fortunePk: 1,
            reaction: 0,
            comment: 'earlier',
            neoname: 'someone',
        });
        vi.mocked(tui.log).mockClear();
        vi.mocked(tui.askForm).mockClear();
        await handleCardOff(asReader(reader), card);
        expect(logCalls(tui).some(m => m.includes('did you visit'))).toBe(true);
        expect(vi.mocked(tui.askForm)).not.toHaveBeenCalled();
    });

    test('read-only session suppresses the visit-418 prompt on card-off', async () => {
        const tui = makeTui(true);
        const reader = makeReader();
        const { handleCard, handleCardOff } = createCardHandlers(tui);
        const card = makeCard('uid-6');
        await handleCard(asReader(reader), card);
        vi.mocked(tui.log).mockClear();
        await handleCardOff(asReader(reader), card);
        expect(logCalls(tui).some(m => m.includes('terminal 418'))).toBe(false);
    });

    test('card-off without a prior card-on does nothing', async () => {
        const tui = makeTui();
        const reader = makeReader();
        const { handleCardOff } = createCardHandlers(tui);
        await handleCardOff(asReader(reader), makeCard('uid-unknown'));
        expect(vi.mocked(tui.askForm)).not.toHaveBeenCalled();
    });

    test('failed write keeps wroteBadge false so no visit-418 prompt', async () => {
        const tui = makeTui(false);
        const reader = makeReader();
        reader.write.mockRejectedValueOnce(new Error('card removed mid-write'));
        const { handleCard, handleCardOff } = createCardHandlers(tui);
        const card = makeCard('uid-7');
        await handleCard(asReader(reader), card);
        vi.mocked(tui.log).mockClear();
        await handleCardOff(asReader(reader), card);
        expect(logCalls(tui).some(m => m.includes('terminal 418'))).toBe(false);
    });

    test('feedback insertion goes through real db + schema', async () => {
        const tui = makeTui(false);
        const reader = makeReader();
        const { handleCard, handleCardOff } = createCardHandlers(tui);
        const card = makeCard('uid-8');
        await handleCard(asReader(reader), card);
        await handleCardOff(asReader(reader), card);
        const rows = await testDb.select().from(feedback);
        expect(rows).toHaveLength(1);
        expect(rows[0].uid).toBe('uid-8');
        expect(rows[0].comment).toBe('looks good');
        expect(rows[0].neoname).toBe('tester');
        expect(rows[0].reaction).toBe(0);
    });
});
