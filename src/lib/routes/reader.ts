// HTTP handlers for reader-side operations: report whether a card is present
// and (if so) write stored scan data back to it.
import type { FastifyReply, FastifyRequest, FastifySchema } from 'fastify';
import { KEY_TYPE_A } from 'nfc-pcsc';
import { AuthCardReadWrite } from 'src/kiosk/AuthCardReadWrite.js';
import logger, { toError } from 'src/lib/logger.js';
import { getCurrentCard } from 'src/lib/readerState.js';
import type { ErrorResponse } from 'src/lib/routes/common.js';

export interface ReaderStatusResponse {
    present: boolean;
    uid: string | null;
    readerName: string | null;
}

export interface ReaderBlockResponse {
    uid: string;
    block: number;
}

export interface ReaderWriteResponse {
    uid: string;
    written: number;
    skipped: number;
}

// postReaderWrite's 500 path returns how many blocks made it before the failure.
export interface ReaderWritePartialFailureResponse {
    error: string;
    written: number;
}

export const getReaderStatusSchema: FastifySchema = {
    response: {
        200: {
            type: 'object',
            properties: {
                present: { type: 'boolean' },
                uid: { type: 'string', nullable: true },
                readerName: { type: 'string', nullable: true },
            },
        },
    },
};

export function getReaderStatus(): ReaderStatusResponse {
    const curr = getCurrentCard();
    if (!curr) return { present: false, uid: null, readerName: null };
    return {
        present: true,
        uid: curr.card.uid,
        readerName: curr.reader.reader.name,
    };
}

export const postReaderBlockSchema: FastifySchema = {
    body: {
        type: 'object',
        properties: {
            block: { type: 'integer', minimum: 1 },
            data: { type: 'string' },
        },
        required: ['block', 'data'],
    },
    response: {
        200: {
            type: 'object',
            properties: {
                uid: { type: 'string' },
                block: { type: 'integer' },
            },
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } },
        500: { type: 'object', properties: { error: { type: 'string' } } },
    },
};

export async function postReaderBlock(request: FastifyRequest, reply: FastifyReply): Promise<ReaderBlockResponse | ErrorResponse> {
    const curr = getCurrentCard();
    if (!curr) {
        reply.code(409);
        return { error: 'no card on reader' };
    }
    const { block, data } = request.body as { block: number; data: string };
    const mifareCheck = AuthCardReadWrite.checkMifare(curr.card);
    if (!mifareCheck) {
        reply.code(400);
        return { error: 'unsupported card type on reader' };
    }
    const { blockSize, numOfSectors, numOfBlocks } = mifareCheck;
    if (block >= numOfBlocks) {
        reply.code(400);
        return { error: `block ${block} out of range (max ${numOfBlocks - 1})` };
    }
    if (blockSize === 16 && isMifareClassicTrailer(block)) {
        reply.code(400);
        return { error: `block ${block} is a sector trailer — refusing to write` };
    }
    if (data.length !== blockSize * 2) {
        reply.code(400);
        return { error: `data must be ${blockSize * 2} hex chars` };
    }
    if (!/^[0-9a-fA-F]+$/.test(data)) {
        reply.code(400);
        return { error: 'data must be hex' };
    }
    const keys = Array.from({ length: numOfSectors + 1 }, () => ({
        keyType: KEY_TYPE_A,
        key: 'FFFFFFFFFFFF',
    }));
    const rw = new AuthCardReadWrite(curr.reader, keys, blockSize, numOfBlocks);
    try {
        await rw.write(block, data);
        return { uid: curr.card.uid, block };
    } catch (err) {
        const error = toError(err);
        logger.error(error, `block write failed at ${block}`);
        reply.code(500);
        return { error: error.message };
    }
}

export const postReaderWriteSchema: FastifySchema = {
    body: {
        type: 'object',
        properties: { data: { type: 'string' } },
        required: ['data'],
    },
    response: {
        200: {
            type: 'object',
            properties: {
                uid: { type: 'string' },
                written: { type: 'integer' },
                skipped: { type: 'integer' },
            },
        },
        400: {
            type: 'object',
            properties: { error: { type: 'string' } },
        },
        409: {
            type: 'object',
            properties: { error: { type: 'string' } },
        },
        500: {
            type: 'object',
            properties: { error: { type: 'string' }, written: { type: 'integer' } },
        },
    },
};

function isMifareClassicTrailer(block: number): boolean {
    // Classic 1k: 16 sectors × 4 blocks (trailer every 4th).
    // Classic 4k: low 32 sectors × 4 blocks, then 8 sectors × 16 blocks starting at block 128.
    const lowSectorBlocks = 32 * 4;
    if (block < lowSectorBlocks) return block % 4 === 3;
    return (block - lowSectorBlocks) % 16 === 15;
}

export async function postReaderWrite(request: FastifyRequest, reply: FastifyReply): Promise<ReaderWriteResponse | ErrorResponse | ReaderWritePartialFailureResponse> {
    const curr = getCurrentCard();
    if (!curr) {
        reply.code(409);
        return { error: 'no card on reader' };
    }
    const { data } = request.body as { data: string };
    const mifareCheck = AuthCardReadWrite.checkMifare(curr.card);
    if (!mifareCheck) {
        reply.code(400);
        return { error: 'unsupported card type on reader' };
    }
    const { blockSize, numOfSectors, numOfBlocks } = mifareCheck;
    const hexPerBlock = blockSize * 2;
    if (data.length % hexPerBlock !== 0) {
        reply.code(400);
        return { error: `data not aligned to ${blockSize}-byte blocks` };
    }
    const blockCount = Math.min(numOfBlocks, data.length / hexPerBlock);
    const keys = Array.from({ length: numOfSectors + 1 }, () => ({
        keyType: KEY_TYPE_A,
        key: 'FFFFFFFFFFFF',
    }));
    const rw = new AuthCardReadWrite(curr.reader, keys, blockSize, numOfBlocks);

    let written = 0;
    let skipped = 0;
    for (let block = 0; block < blockCount; block++) {
        // Block 0 is the manufacturer block (read-only on factory cards).
        // Sector trailers store keys; writing them with the read-back value
        // would set KeyA to zero (KeyA always reads as 0x00..00) and lock us out.
        if (block === 0 || (blockSize === 16 && isMifareClassicTrailer(block))) {
            skipped++;
            continue;
        }
        const blockData = data.slice(block * hexPerBlock, (block + 1) * hexPerBlock);
        try {
            await rw.write(block, blockData);
            written++;
        } catch (err) {
            const error = toError(err);
            logger.error(error, `write failed at block ${block}`);
            reply.code(500);
            return { error: `write failed at block ${block}: ${error.message}`, written };
        }
    }
    return { uid: curr.card.uid, written, skipped };
}
