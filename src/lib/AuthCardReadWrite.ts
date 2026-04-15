import { Reader, Card, TAG_ISO_14443_3 } from 'nfc-pcsc';
import logger from './logger.js';

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
    // Reading and writing data from/to MIFARE Classic cards (e.g. MIFARE 1K) ALWAYS requires authentication!

    // How does the MIFARE Classic authentication work?
    // 1. You authenticate to a specific sector using a specific key (key + keyType).
    // 2. After the successful authentication, you are granted permissions according to the access conditions
    //    for the given key (access conditions are specified in the trailer section of each sector).
    //    Depending on the access conditions, you can read from / write to the blocks of this sector.
    // 3. If you want to access data in another sectors, you have to authenticate to that sector.
    //    Then you can access the data from the block within that sector (only from that sector).
    // summary: MIFARE Classic will only grant permissions based on the last authentication attempt.
    //          Consequently, if multiple reader.authenticate(...) commands are used,
    //          only the last one has an effect on all subsequent read/write operations.

    // reader.authenticate(blockNumber, keyType, key, obsolete = false)
    // - blockNumber - the number of any block withing the sector we want to authenticate
    // - keyType - type of key - either KEY_TYPE_A or KEY_TYPE_B
    // - key - 6 bytes - a Buffer instance, an array of bytes, or 12-chars HEX string
    // - obsolete - (default - false for PC/SC V2.07) use true for PC/SC V2.01
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
        await this.auth(block);
        // reader.read(blockNumber, length, blockSize = 4, packetSize = 16)
        // - blockNumber - memory block number where to start reading
        // - length - how many bytes to read
        // - blockSize - 4 for MIFARE Ultralight, 16 for MIFARE Classic
        // ! Caution! length must be divisible by blockSize
        // ! Caution! MIFARE Classic cards have sector trailers
        //   containing access bits instead of data, each last block in sector is sector trailer
        //   (e.g. block 3, 7, 11, 14)
        //   see memory structure above or https://github.com/pokusew/nfc-pcsc/issues/16#issuecomment-304989178
        const data = await this.reader.read(block, 16, this.blockSize);
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
            return this.reader.read(block, 16, this.blockSize)
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
            // EXAMPLE: we want to authenticate sector 1
            // authenticating one block within the sector will authenticate all blocks within that sector
            // so in our case, we choose block 4 that is within the sector 1, all blocks (4, 5, 6, 7)
            // will be authenticated with the given key
            const { keyType, key } = this.keys[sector];
            await this.reader.authenticate(block, keyType, key);

            // Note: writing might require to authenticate with a different key (based on the sector access conditions)
            logger.debug(`sector ${sector} successfully authenticated`);
            this.currentSector = sector;
        } catch (err) {
            logger.error(err as Error, `error when authenticating block ${block} within the sector ${sector}`);
            throw new AuthenticationError((err as Error).message);
        }
    }

    private keys: Mifare[];
    private reader: Reader;
    private currentSector: number | undefined;
    private blockSize: Blocksize;
    private numOfBlocks: number;
}
