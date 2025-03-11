declare module 'nfc-pcsc' {
    import { EventEmitter } from 'events';

    export const KEY_TYPE_A = 0x60;
    export const KEY_TYPE_B = 0x61;
    export const TAG_ISO_14443_3 = 'TAG_ISO_14443_3';
    export const TAG_ISO_14443_4 = 'TAG_ISO_14443_4';

    export interface Card {
        type: typeof TAG_ISO_14443_3 | typeof TAG_ISO_14443_4;
        uid: string;
        atr?: Buffer;
        data?: Buffer; // Only on TAG_ISO_14443_4
    }

    export interface Reader {
        reader: {
            name: string;
        };
        on(event: 'card' | 'card.off', listener: (card: Card) => void): this;
        on(event: 'error', listener: (error: Error) => void): this;
        on(event: 'end', listener: () => void): this;
        read(blockNumber: number, length: number, blockSize = 4, packetSize = 16, readClass = 0xff): Promise<Buffer>;
        write(blockNumber: number, data: Buffer, blockSize = 4): Promise<true | boolean[]>;
        authenticate(block: number, keyType: number, key: string, obsolete?: boolean): Promise<boolean>;
    }

    // Define the Logger interface
    interface Logger {
        log(message: string, ...args: unknown[]): void;
        info(message: string, ...args: unknown[]): void;
        warn(message: string, ...args: unknown[]): void;
        error(message: string, ...args: unknown[]): void;
    }

    export class NFC extends EventEmitter {
        constructor(logger?: Logger);
        on(event: 'reader', listener: (reader: Reader) => void): this;
        on(event: 'error', listener: (error: Error) => void): this;
    }

    const nfc: NFC;
    export default nfc;
}
