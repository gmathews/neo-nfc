import { KEY_TYPE_A, NFC, TAG_ISO_14443_3 } from 'nfc-pcsc';
import { nfcCard } from 'nfccard-tool';

const nfc = new NFC(console); // Create an instance of the NFC class

nfc.on('reader', (reader) => {
    console.log(`Reader connected: ${reader.reader.name}`);
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
        console.log(`Card detected:`, card);
        // MIFARE Classic is ISO/IEC 14443-3 tag
        // skip other standards
        if (card.type !== TAG_ISO_14443_3) {
            return;
        }

        const cardHeader = await reader.read(0, 20);

        const tag = nfcCard.parseInfo(cardHeader);
        console.log('tag', tag);

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

        // Don't forget to fill YOUR keys and types! (default ones are stated below)
        const key = 'FFFFFFFFFFFh'; // key must be a 12-chars HEX string, an instance of Buffer, or array of bytes
        const keyType = KEY_TYPE_A;

        try {
            // we want to authenticate sector 1
            // authenticating one block within the sector will authenticate all blocks within that sector
            // so in our case, we choose block 4 that is within the sector 1, all blocks (4, 5, 6, 7)
            // will be authenticated with the given key
            await reader.authenticate(4, keyType, key);

            // Note: writing might require to authenticate with a different key (based on the sector access conditions)
            console.info('sector 1 successfully authenticated');
        } catch (err) {
            console.error(`error when authenticating block 4 within the sector 1`, err);
            return;
        }

        // example reading 16 bytes (one block) assuming containing 32bit integer
        // !!! note that we don't need 16 bytes - 32bit integer takes only 4 bytes !!!
        try {
            // reader.read(blockNumber, length, blockSize = 4, packetSize = 16)
            // - blockNumber - memory block number where to start reading
            // - length - how many bytes to read
            // - blockSize - 4 for MIFARE Ultralight, 16 for MIFARE Classic
            // ! Caution! length must be divisible by blockSize
            // ! Caution! MIFARE Classic cards have sector trailers
            //   containing access bits instead of data, each last block in sector is sector trailer
            //   (e.g. block 3, 7, 11, 14)
            //   see memory structure above or https://github.com/pokusew/nfc-pcsc/issues/16#issuecomment-304989178

            const data = await reader.read(4, 16, 16); // blockSize=16 must specified for MIFARE Classic cards

            console.info(`data read`, data);

            const payload = data.readInt32BE(0);

            console.info('data converted', payload);
        } catch (err) {
            console.error(`error when reading data`, err);
        }
    });

    reader.on('card.off', (card) => {
        console.log(`${reader.reader.name}  card removed`, card);
    });

    reader.on('error', (err) => {
        console.error('Reader error:', err);
    });

    reader.on('end', () => {
        console.log('Reader disconnected:', reader.reader.name);
    });
});

nfc.on('error', (err) => {
    console.error('NFC error:', err);
});
