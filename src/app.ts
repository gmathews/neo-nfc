import { NFC } from 'nfc-pcsc';

const nfc = new NFC(); // Create an instance of the NFC class

nfc.on('reader', (reader) => {
    console.log(`Reader connected: ${reader.reader.name}`);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    reader.on('card', async (card) => {
        console.log(`Card detected:`, card);

        // example reading 12 bytes assuming containing text in utf8
        try {
            // reader.read(blockNumber, length, blockSize = 4, packetSize = 16)
            const data = await reader.read(4, 12); // starts reading in block 4, continues to 5 and 6 in order to read 12 bytes
            console.log(`data read`, data);
            const payload = data.toString(); // utf8 is default encoding
            console.log(`data converted`, payload);
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
