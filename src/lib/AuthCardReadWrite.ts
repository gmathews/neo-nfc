import { Reader, Card, TAG_ISO_14443_3 } from 'nfc-pcsc';
import logger, { toError } from './logger.js';

class AuthenticationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export interface Mifare {
    keyType: number;
    key: string;
};
type Blocksize = 4 | 16;

export class AuthCardReadWrite {
    constructor(reader: Reader, keys: Mifare[], blockSize: Blocksize, numOfBlocks: number) {
        this.reader = reader;
        this.keys = keys;
        this.blockSize = blockSize;
        this.numOfBlocks = numOfBlocks;
    }

    async write(block: number, hexData: string) {
        if (hexData.length !== this.blockSize * 2) {
            throw new Error(`write data must be ${this.blockSize * 2} hex chars (got ${hexData.length})`);
        } else if (block >= this.numOfBlocks) {
            throw new Error(`block ${block} doesn't fit in ${this.numOfBlocks}`);
        }
        await this.auth(block);
        const buf = Buffer.from(hexData, 'hex');
        await this.reader.write(block, buf, this.blockSize);
    }

    async read(block: number) {
        if (block >= this.numOfBlocks) {
            throw new Error(`block ${block} doesn't fit in ${this.numOfBlocks}`);
        }
        await this.auth(block);
        const data = await this.reader.read(block, this.blockSize, this.blockSize);
        return data.toString('hex');
    }

    /** Reads all blocks in a sector (including trailer). Returns array of { block, data, isTrailer } */
    async readSector(sector: number): Promise<{ block: number; data: string; isTrailer: boolean }[]> {
        const isLowSector = sector < 32;
        const blocksPerSector = isLowSector ? 4 : 16;
        const firstBlock = isLowSector
            ? sector * 4
            : 128 + (sector - 32) * 16;

        // Auth once for the sector
        await this.auth(firstBlock);

        // Read all blocks in parallel (including trailer)
        const reads = Array.from({ length: blocksPerSector }, (_, i) => {
            const block = firstBlock + i;
            return this.reader.read(block, this.blockSize, this.blockSize)
                .then((buf: Buffer) => ({
                    block,
                    data: buf.toString('hex'),
                    isTrailer: i === blocksPerSector - 1,
                }));
        });
        return Promise.all(reads);
    }

    static checkMifare(card: Card): undefined | {
        blockSize: Blocksize; numOfSectors: number; numOfBlocks: number;
    } {
        // MIFARE Classic is ISO/IEC 14443-3 tag
        // Early exit for non-compatible cards
        if (card.type !== TAG_ISO_14443_3 || !card.atr) {
            return;
        }
        // Mifare Classic card
        const MIFARE_CLASSIC_HEADER = '3B8F8001804F0CA000000306';
        // Mifare Classic card types
        const CLASSIC_1K = '000100000000';
        const CLASSIC_4K = '000200000000';
        const ULTRALIGHT = '000300000000';

        // Extract and check header
        const header = card.atr.subarray(0, 12).toString('hex').toUpperCase();
        if (header !== MIFARE_CLASSIC_HEADER) {
            return;
        }
        // Check card version
        const version = card.atr.subarray(13, 19).toString('hex');
        switch (version) {
            case CLASSIC_1K:
                logger.debug('Mifare Classic 1k');
                return { blockSize: 16, numOfSectors: 16, numOfBlocks: 64 };
            case CLASSIC_4K:
                logger.debug('Mifare Classic 4k');
                return { blockSize: 16, numOfSectors: 40, numOfBlocks: 256 };
            case ULTRALIGHT:
                logger.debug('Mifare Ultralight');
                return { blockSize: 4, numOfSectors: 16, numOfBlocks: 64 };
            default:
                logger.info('Other card');
                return;
        }
    }

    /**
    @description authenticate only one block within the sector. it will authenticate
    all blocks within that sector
    @example we choose block 4 that is within the sector 1, all blocks (4, 5, 6, 7)
    will be authenticated with the given key
    */
    private async auth(block: number) {
        // 32 sectors of 4 blocks and 8 sectors of 16 blocks
        const lowSectorBlocks = 32 * 4;
        const isLowSector = block < lowSectorBlocks;
        const sector = isLowSector ? Math.trunc(block / 4) : 32 + Math.trunc((block - lowSectorBlocks) / 16);
        // If we are currently authenticated on this sector, no need to do anything
        if (this.currentSector === sector) {
            return;
        }
        if (sector >= this.keys.length) {
            throw new AuthenticationError(`No key for sector ${sector}`);
        }
        try {
            const { keyType, key } = this.keys[sector];
            await this.reader.authenticate(block, keyType, key);

            logger.debug(`sector ${sector} successfully authenticated`);
            this.currentSector = sector;
        } catch (err) {
            const error = toError(err);
            logger.error(error, `error when authenticating block ${block} within the sector ${sector}`);
            throw new AuthenticationError(error.message);
        }
    }

    private keys: Mifare[];
    private reader: Reader;
    private currentSector: number | undefined;
    private blockSize: Blocksize;
    private numOfBlocks: number;
}
