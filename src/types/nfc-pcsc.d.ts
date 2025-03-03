declare module 'nfc-pcsc' {
    import { EventEmitter } from 'events';

    export interface Card {
        type: string;
        uid: string;
        atr?: Buffer;
    }

    export interface Reader {
        reader: {
            name: string;
        };
        on(event: 'card', listener: (card: Card) => void): this;
        on(event: 'error', listener: (error: Error) => void): this;
        on(event: 'end', listener: () => void): this;
        read(block: number, length: number): Promise<Buffer>;
        authenticate(block: number, keyType: number, key: Buffer): Promise<void>;
    }

    export class NFC extends EventEmitter {
        on(event: 'reader', listener: (reader: Reader) => void): this;
        on(event: 'error', listener: (error: Error) => void): this;
    }

    const nfc: NFC;
    export default nfc;
}
