// NFC card flow: read the card, serve the daily fortune, write a fortune badge back, and collect feedback on removal.
import { Card, KEY_TYPE_A, Reader } from 'nfc-pcsc';
import { AuthCardReadWrite } from './AuthCardReadWrite.js';
import { augmentSplash, horoscopePanel, infectionFrame, severedSplash } from './ascii.js';
import { askAndSaveFeedback } from './feedback.js';
import { getFortune } from './fortunes.js';
import { hexToAscii } from './hex.js';
import { tag as t, type TUI } from './tui.js';
import db from 'src/lib/db.js';
import logger, { toError } from 'src/lib/logger.js';
import { cardData } from 'src/lib/schema.js';

const ACR122U_PREFIX = 'ACS ACR122U';
const isAcr122u = (reader: Reader): boolean => reader.reader.name.startsWith(ACR122U_PREFIX);
// Layout: "h3LLraz0r" (9B) + "/" (1B) + secs BE u32 (4B) + "/" (1B) + fortuneId (1B) = 16B
const FORTUNE_BLOCK = 120; // sector 30, block 0
// r00t k1d infection lives in sector 32 (4k cards only):
//   blocks 128-129: ascii "infected by r00t k1d" (20B, padded)
//   block 130: single-byte infection counter (1..5)
const ROOTKID_INFECTION_BLOCK = 128;
const ROOTKID_MAGIC = 'infected by r00t k1d';
const ROOTKID_MAX_COUNTER = 5;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function getMifareRW(reader: Reader, card: Card): { rw: AuthCardReadWrite; numOfSectors: number } | undefined {
    const mifareCheck = AuthCardReadWrite.checkMifare(card);
    if (mifareCheck === undefined) {
        return;
    }
    const key = 'FFFFFFFFFFFF';
    const keyType = KEY_TYPE_A;
    const keys = Array.from({ length: mifareCheck.numOfSectors + 1 }, () => ({ keyType, key }));
    return {
        rw: new AuthCardReadWrite(reader, keys, mifareCheck.blockSize, mifareCheck.numOfBlocks),
        numOfSectors: mifareCheck.numOfSectors,
    };
}

function encodeFortuneBadge(fortuneId: number): string {
    const buf = Buffer.alloc(16);
    buf.write('h3LLraz0r/', 0, 'ascii');
    buf.writeUInt32BE(Math.floor(Date.now() / 1000), 10);
    buf.write('/', 14, 'ascii');
    buf.writeUInt8(fortuneId, 15);
    return buf.toString('hex');
}

function detectRootKidInfection(allData: string[]): { counter: number } | undefined {
    // Only 4k cards reach block 128 — 1k/Ultralight fall through here.
    if (allData.length <= ROOTKID_INFECTION_BLOCK + 2) return;
    const magicHex = Buffer.from(ROOTKID_MAGIC, 'ascii').toString('hex');
    const b0 = allData[ROOTKID_INFECTION_BLOCK];
    const b1 = allData[ROOTKID_INFECTION_BLOCK + 1];
    const counterBlock = allData[ROOTKID_INFECTION_BLOCK + 2];
    if (!(b0 + b1).toLowerCase().startsWith(magicHex)) return;
    const counter = parseInt(counterBlock.slice(0, 2), 16);
    if (!counter) return;
    return { counter: Math.min(counter, ROOTKID_MAX_COUNTER) };
}

function showInfection(tui: TUI, counter: number): void {
    tui.showModal(tick => infectionFrame(counter, tick), 2000 + counter * 1000);
}

async function writeFortuneBadge(reader: Reader, card: Card, fortuneId: number): Promise<void> {
    const mifare = getMifareRW(reader, card);
    if (mifare === undefined) {
        return;
    }
    await mifare.rw.write(FORTUNE_BLOCK, encodeFortuneBadge(fortuneId));
}

async function readAndStoreCard(tui: TUI, reader: Reader, card: Card): Promise<void> {
    const mifare = getMifareRW(reader, card);
    if (mifare === undefined) {
        return;
    }
    const { rw: authedMifareRW, numOfSectors } = mifare;

    const spinner = tui.spinner((frame, content) => t.lime(`${frame} ${content}`));
    const allData: string[] = [];
    let lastDisplayData = '';
    let skipping = false;
    try {
        for (let sector = 0; sector < numOfSectors; sector++) {
            const blocks = await authedMifareRW.readSector(sector);
            for (const { block, data, isTrailer } of blocks) {
                allData.push(data);
                if (isTrailer) continue;
                if (/^0+$/.test(data) || data === lastDisplayData) {
                    if (!skipping) {
                        spinner.newLine('*');
                        skipping = true;
                    }
                    lastDisplayData = data;
                    continue;
                }
                const prefix = `${String(block).padStart(3, '0')}  `;
                const suffix = `  [${hexToAscii(data)}]`;
                spinner.newLine(prefix);
                for (let i = 1; i < data.length; i++) {
                    spinner.setContent(prefix + data.slice(0, i));
                    await sleep(3);
                }
                spinner.finalize(t.lime(`  ${prefix}${data}${suffix}`));
                lastDisplayData = data;
                skipping = false;
            }
        }
    } finally {
        spinner.stop();
    }
    await db.insert(cardData).values({ uid: card.uid, data: allData.join('') });
    const infection = detectRootKidInfection(allData);
    if (infection) showInfection(tui, infection.counter);
}

export interface CardHandlers {
    handleCard: (reader: Reader, card: Card) => Promise<void>;
    handleCardOff: (reader: Reader, card: Card) => Promise<void>;
}

export function createCardHandlers(tui: TUI): CardHandlers {
    const lastFortune = new Map<string, { pk: number }>();

    function reportError(err: unknown, msg: string): void {
        logger.error(toError(err), msg);
        tui.log(t.red(msg));
    }

    async function handleCard(reader: Reader, card: Card): Promise<void> {
        tui.dismissForm();
        tui.clearPanel();
        const readerName = reader.reader.name.substring(0, 7).toLocaleLowerCase();
        tui.log(t.lime(augmentSplash(readerName, card.uid)));

        const isAcr122 = isAcr122u(reader);
        if (isAcr122) {
            try {
                await readAndStoreCard(tui, reader, card);
            } catch (err) {
                reportError(err, 'failed to read augment');
                return;
            }
        }

        const { pk, id: fortuneId, text } = await getFortune(card.uid);
        lastFortune.set(card.uid, { pk });
        tui.setPanel(horoscopePanel(text));
        tui.log(t.green('▶ horoscope ready — look right →'));

        if (isAcr122) {
            try {
                await writeFortuneBadge(reader, card, fortuneId);
            } catch (err) {
                reportError(err, `failed to write augment ${toError(err).message}`);
            }
        }
    }

    async function handleCardOff(reader: Reader, card: Card): Promise<void> {
        tui.dismissModal();
        tui.log(t.lime(severedSplash(card.uid)));
        const shown = lastFortune.get(card.uid);
        if (shown) {
            lastFortune.delete(card.uid);
            const secondTime = await askAndSaveFeedback(tui, card.uid, shown.pk);
            if (isAcr122u(reader)) {
                if (secondTime) {
                    tui.log(`${t.lime('did you visit')} ${t.blue('terminal 418')}${t.lime('?')}`);
                } else {
                    tui.log(`${t.lime('visit')} ${t.blue('terminal 418')}`);
                }
            }
        }
    }

    return { handleCard, handleCardOff };
}
