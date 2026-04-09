import { KEY_TYPE_A, NFC } from 'nfc-pcsc';
import { AuthCardReadWrite } from 'src/lib/AuthCardReadWrite.js';
import { getFortune } from './lib/Fortunes.js';

/** SCRIPT:
 * Excuse me, I see that you are augmented
 * *points at their neoband*
 * If you like, I can tell your fortune for a few credits
 * Can I see your palm?
 * <afirmative consent>
 * *have them place their palm, so the neoband touches the reader*
 **/

// const nfc = new NFC(console); // Create an instance of the NFC class w/ debug logging
const nfc = new NFC(); // Create an instance of the NFC class

nfc.on('reader', (reader) => {
    console.log(`Reader connected: *${reader.reader.name}*`);
    // #############
    // Example: MIFARE Classic
    // - should work well with any compatible PC/SC card reader
    // - what is covered:
    //   - authentication
    //   - reading data from card
    //   - writing data to card
    // - what is NOT covered yet:
    //   - using sector trailers to update access rights
    // #############

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

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    reader.on('card', async (card) => {
        console.log(`Card _${card.uid}_ detected:`, card.atr?.toString('hex'));
        // If we aren't attempting to R/W this type of card
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
            key, // key must be a 12-chars HEX string, an instance of Buffer, or array of bytes
        }));

        const authedMifareRW = new AuthCardReadWrite(reader, keys, mifareCheck.blockSize);

        try {
            for (let block = 0; block < mifareCheck.numOfBlocks; block++) {
                await authedMifareRW.read(block);
            }
        } catch (err) {
            console.error('failed to read card', err);
        }

        console.log(`Your luck for the day: ${getFortune(card.uid)}`);
    });

    reader.on('card.off', (card) => {
        console.log(`*${reader.reader.name}* card _${card.uid}_ removed`);
    });

    reader.on('error', (err) => {
        console.error('Reader error:', err);
    });

    reader.on('end', () => {
        console.log(`Reader disconnected: *${reader.reader.name}*`);
    });
});

nfc.on('error', (err) => {
    console.error('NFC error:', err);
});
