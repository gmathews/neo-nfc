import Fastify from 'fastify';
import { Card, KEY_TYPE_A, NFC, Reader } from 'nfc-pcsc';
import { AuthCardReadWrite } from 'src/lib/AuthCardReadWrite.js';
import db from './lib/db.js';
import { askAndSaveFeedback } from './lib/feedback.js';
import { getFortune } from './lib/Fortunes.js';
import logger, { color as c } from './lib/logger.js';
import { registerRoutes } from './lib/routes.js';
import { cardData } from './lib/schema.js';

/** SCRIPT:
 * Excuse me, I see that you are augmented
 * *points at their neoband*
 * If you like, I can tell your fortune for a few credits
 * Can I see your hand?
 * <afirmative consent>
 * *have them place their palm, so the neoband touches the reader*
 *
 * <have them come back any time to show others >
 * <free; if they bring another person to have their fortune told>
 * <pyramid scheme>
 **/

// TODO: add ascii art.
// TODO: add write for terminal 418 kiosk(which fortune they got)
// TODO: fortunes based on neosites
// TODO: gives new fortune the next day, but doesn't ask for feedback
// TODO: display read needs to include first line if it has something
// TODO: break usb connector and have wires from inside laptop back

const app = Fastify({ loggerInstance: logger, disableRequestLogging: true });
await registerRoutes(app);
await app.listen({ port: 3000 });

// const nfc = new NFC(console); // Create an instance of the NFC class w/ debug logging
const nfc = new NFC(); // Create an instance of the NFC class

const ACR122U_PREFIX = 'ACS ACR122U';
const lastFortune = new Map<string, { pk: number }>();
let clearScreenAbort: AbortController | null = null;

// ## Note about the card's data structure
//
// ### MIFARE Classic EV1 1K
// - 1024 × 8 bit EEPROM memory
// - 16 sectors of 4 blocks
// - see https://www.nxp.com/docs/en/data-sheet/MF1S50YYX_V1.pdf
//
// ### MIFARE Classic EV1 4K
// - 4096 × 8 bit EEPROM memory
// - 32 sectors of 4 blocks and 8 sectors of 16 blocks
// - see https://www.nxp.com/docs/en/data-sheet/MF1S70YYX_V1.pdf
//
// One block contains 16 bytes.
// Don't forget specify the blockSize argument blockSize=16 in reader.read and reader.write calls.
// The smallest amount of data to write is one block. You can write only the entire blocks (card limitation).
//
// sector 0
//  block 0 - manufacturer data (read only)
//  block 1 - data block
//  block 2 - data block
//  block 3 - sector trailer 0
//   bytes 00-05: Key A (default 0xFFFFFFFFFFFF) (6 bytes)
//   bytes 06-09: Access Bits (default 0xFF0780) (4 bytes)
//   bytes 10-15: Key B (optional) (default 0xFFFFFFFFFFFF) (6 bytes)
// sector 1:
//  block 4 - data block
//  block 5 - data block
//  block 6 - data block
//  block 7 - sector trailer 1
// sector 2:
//  block 8 - data block
//  block 9 - data block
//  block 10 - data block
//  block 11 - sector trailer 2
// ... and so on ...
async function readAndStoreCard(reader: Reader, card: Card): Promise<void> {
    const mifareCheck = AuthCardReadWrite.checkMifare(card);
    if (mifareCheck === undefined) {
        return;
    }

    // sector trailer
    //  bytes 00-05: Key A (default 0xFFFFFFFFFFFF) (6 bytes)
    //  bytes 06-09: Access Bits (default 0xFF0780) (4 bytes)
    //  bytes 10-15: Key B (optional) (default 0xFFFFFFFFFFFF) (6 bytes)
    // Don't forget to fill YOUR keys and types for each sector! (default ones are stated below)
    const key = 'FFFFFFFFFFFF';
    const keyType = KEY_TYPE_A;
    const keys = Array.from({ length: mifareCheck.numOfSectors + 1 }, () => ({
        keyType,
        key,
    }));

    const authedMifareRW = new AuthCardReadWrite(reader, keys, mifareCheck.blockSize);

    let lastDisplayData = '';
    let skipping = false;
    const allData: string[] = [];
    for (let sector = 0; sector < mifareCheck.numOfSectors; sector++) {
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
                    logger.info(`${c.amber}*${c.reset}`);
                    skipping = true;
                }
                lastDisplayData = data;
                continue;
            }
            logger.debug(`${c.amber}${String(block).padStart(3, '0')}  ${data}${c.reset}`);
            lastDisplayData = data;
            skipping = false;
        }
    }
    await db.insert(cardData).values({ uid: card.uid, data: allData.join('') });
}

function displayPrompt() {
    process.stdout.write('\x1b[2J\x1b[H');
    logger.info(`${c.amber}pre-cog future site v1.01${c.reset}`);
    logger.info(`${c.amber}> awaiting augment interface...${c.reset}`);
}

function waitForClear(): Promise<void> {
    logger.info(`${c.amber}press enter to clear screen${c.reset}`);
    const abort = new AbortController();
    clearScreenAbort = abort;
    return new Promise<void>((resolve) => {
        const onData = () => {
            cleanup();
            displayPrompt();
            resolve();
        };
        const onAbort = () => {
            cleanup();
            resolve();
        };
        const cleanup = () => {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);
            abort.signal.removeEventListener('abort', onAbort);
            if (clearScreenAbort === abort) {
                clearScreenAbort = null;
            }
        };
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', onData);
        abort.signal.addEventListener('abort', onAbort);
    });
}

let prompted = false;

// eslint-disable-next-line @typescript-eslint/no-misused-promises
nfc.on('reader', async (reader) => {
    logger.info(`${c.amber}reader connected: *${reader.reader.name}*${c.reset}`);
    if (!prompted) {
        prompted = true;
        await waitForClear();
    }

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    reader.on('card', async (card) => {
        if (clearScreenAbort) {
            clearScreenAbort.abort();
            clearScreenAbort = null;
            process.stdout.write('\x1b[2J\x1b[H');
        }
        logger.info(`${c.amber}${reader.reader.name.substring(0, 7).toLocaleLowerCase()} augment _${card.uid}_ detected: ${card.atr?.toString('hex') ?? 'no atr'}${c.reset}`);

        if (reader.reader.name.startsWith(ACR122U_PREFIX)) {
            try {
                await readAndStoreCard(reader, card);
            } catch (err) {
                logger.error(err as Error, 'failed to read augment');
                // Don't give the horoscope if we couldn't read
                return;
            }
        }
        // Give the horoscope
        const { pk, text } = await getFortune(card.uid);
        lastFortune.set(card.uid, { pk });
        logger.info(`${c.amber}your daily horoscope: ${c.green}${text}${c.reset}`);
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    reader.on('card.off', async (card) => {
        const shown = lastFortune.get(card.uid);
        if (shown) {
            lastFortune.delete(card.uid);
            await askAndSaveFeedback(card.uid, shown.pk);
        }
        logger.info(`${c.amber}augment _${card.uid}_ removed${c.reset}\n`);
        await waitForClear();
    });

    reader.on('error', (err) => {
        logger.error(err, 'reader error');
    });

    reader.on('end', () => {
        logger.info(`${c.amber}reader disconnected: *${reader.reader.name}*${c.reset}`);
    });
});

nfc.on('error', (err) => {
    logger.error(err, 'NFC error');
});
