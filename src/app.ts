import { NFC } from 'nfc-pcsc';

const nfc = new NFC(); // Create an instance of the NFC class

nfc.on('reader', (reader) => {
    console.log(`Reader connected: ${reader.reader.name}`);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    reader.on('card', async (card) => {
        console.log(`Card detected:`, card);

        try {
            // Read data from the card (example: reading block 4)
            const blockNumber = 4; // Replace with the block you want to read
            const data = await reader.read(blockNumber, 16); // 16 is the block size
            console.log(`Data read from block ${blockNumber}:`, data.toString('hex'));
        } catch (err) {
            console.error('Error reading card:', err);
        }
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
