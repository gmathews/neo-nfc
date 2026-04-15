import Fastify from 'fastify';
import { Card, KEY_TYPE_A, NFC, Reader } from 'nfc-pcsc';
import { AuthCardReadWrite } from 'src/lib/AuthCardReadWrite.js';
import db from 'src/lib/db.js';
import { askAndSaveFeedback } from 'src/lib/feedback.js';
import { getFortune } from 'src/lib/Fortunes.js';
import logger, { toError } from 'src/lib/logger.js';
import { registerRoutes } from 'src/lib/routes.js';
import { cardData } from 'src/lib/schema.js';
import { initTUI, tag as t } from 'src/lib/tui.js';

// TODO: add ascii art
// TODO: make ui less janky
// TODO: fortunes based on neosites
// TODO: break usb connector and have wires from inside laptop back

const app = Fastify({ loggerInstance: logger, disableRequestLogging: true });
await registerRoutes(app);
await app.listen({ port: 3000 });

const tui = initTUI();
tui.setBanner(t.amber('pre-cog futur3 site v1.01'), t.amber('> awaiting augment interface...'));

// const nfc = new NFC(console); // Create an instance of the NFC class w/ debug logging
const nfc = new NFC(); // Create an instance of the NFC class

const ACR122U_PREFIX = 'ACS ACR122U';
const lastFortune = new Map<string, { pk: number }>();

function hexToAscii(hex: string): string {
    let out = '';
    for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.slice(i, i + 2), 16);
        out += byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : '.';
    }
    return out;
}

function getMifareRW(reader: Reader, card: Card): { rw: AuthCardReadWrite; numOfSectors: number } | undefined {
    const mifareCheck = AuthCardReadWrite.checkMifare(card);
    if (mifareCheck === undefined) {
        return;
    }
    // Don't forget to fill YOUR keys and types for each sector! (default ones are stated below)
    const key = 'FFFFFFFFFFFF';
    const keyType = KEY_TYPE_A;
    const keys = Array.from({ length: mifareCheck.numOfSectors + 1 }, () => ({ keyType, key }));
    return { rw: new AuthCardReadWrite(reader, keys, mifareCheck.blockSize, mifareCheck.numOfBlocks),
        numOfSectors: mifareCheck.numOfSectors };
}

// Layout: "h3LLraz0r" (9B) + "/" (1B) + secs BE u32 (4B) + "/" (1B) + fortuneId (1B) = 16B
const FORTUNE_BLOCK = 120; // sector 30, block 0

function encodeFortuneBadge(fortuneId: number): string {
    const buf = Buffer.alloc(16);
    buf.write('h3LLraz0r/', 0, 'ascii');
    buf.writeUInt32BE(Math.floor(Date.now() / 1000), 10);
    buf.write('/', 14, 'ascii');
    buf.writeUInt8(fortuneId, 15);
    return buf.toString('hex');
}

async function writeFortuneBadge(reader: Reader, card: Card, fortuneId: number): Promise<void> {
    const mifare = getMifareRW(reader, card);
    if (mifare === undefined) {
        return;
    }
    await mifare.rw.write(FORTUNE_BLOCK, encodeFortuneBadge(fortuneId));
}

async function readAndStoreCard(reader: Reader, card: Card): Promise<void> {
    const mifare = getMifareRW(reader, card);
    if (mifare === undefined) {
        return;
    }
    const { rw: authedMifareRW, numOfSectors } = mifare;

    let lastDisplayData = '';
    let skipping = false;
    const allData: string[] = [];
    for (let sector = 0; sector < numOfSectors; sector++) {
        const blocks = await authedMifareRW.readSector(sector);
        for (const { block, data, isTrailer } of blocks) {
            allData.push(data);

            // Don't display trailers
            if (isTrailer) {
                continue;
            }

            // Skip all-zero rows and duplicate rows
            if (/^0+$/.test(data) || data === lastDisplayData) {
                if (!skipping) {
                    tui.log(t.amber('*'));
                    skipping = true;
                }
                lastDisplayData = data;
                continue;
            }
            tui.log(t.amber(`${String(block).padStart(3, '0')}  ${data}  [${hexToAscii(data)}]`));
            lastDisplayData = data;
            skipping = false;
        }
    }
    await db.insert(cardData).values({ uid: card.uid, data: allData.join('') });
}

function reportError(err: unknown, msg: string): void {
    logger.error(toError(err), msg);
    tui.log(t.red(msg));
}

async function handleCard(reader: Reader, card: Card): Promise<void> {
    tui.log(t.amber(`${reader.reader.name.substring(0, 7).toLocaleLowerCase()} augment _${card.uid}_ detected: ${card.atr?.toString('hex') ?? 'no atr'}`));

    const isAcr122u = reader.reader.name.startsWith(ACR122U_PREFIX);
    if (isAcr122u) {
        try {
            await readAndStoreCard(reader, card);
        } catch (err) {
            reportError(err, 'failed to read augment');
            return;
        }
    }

    const { pk, id: fortuneId, text } = await getFortune(card.uid);
    lastFortune.set(card.uid, { pk });
    tui.log(`${t.amber('your daily horoscope:')} ${t.green(text)}`);

    if (isAcr122u) {
        try {
            await writeFortuneBadge(reader, card, fortuneId);
        } catch (err) {
            reportError(err, `failed to write augment ${toError(err).message}`);
        }
    }
}

async function handleCardOff(reader: Reader, card: Card): Promise<void> {
    const shown = lastFortune.get(card.uid);
    if (shown) {
        lastFortune.delete(card.uid);
        const secondTime = await askAndSaveFeedback(tui, card.uid, shown.pk);
        if (reader.reader.name.startsWith(ACR122U_PREFIX)) {
            if (secondTime) {
                tui.log(`${t.amber('did you visit')} ${t.blue('terminal 418')}${t.amber('?')}`);
            } else {
                tui.log(`${t.amber('visit')} ${t.blue('terminal 418')}`);
            }
        }
    }
    tui.log(t.amber(`augment _${card.uid}_ removed`));
}

nfc.on('reader', (reader) => {
    tui.log(t.amber(`reader connected: *${reader.reader.name}*`));

    reader.on('card', (card) => {
        void handleCard(reader, card);
    });
    reader.on('card.off', (card) => {
        void handleCardOff(reader, card);
    });

    reader.on('error', (err) => {
        logger.error(err, 'reader error');
    });

    reader.on('end', () => {
        tui.log(t.amber(`reader disconnected: *${reader.reader.name}*`));
    });
});

nfc.on('error', (err) => {
    logger.error(err, 'NFC error');
});
