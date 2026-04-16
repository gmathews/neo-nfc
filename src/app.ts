import Fastify from 'fastify';
import { NFC } from 'nfc-pcsc';
import { createCardHandlers } from 'src/kiosk/card.js';
import { initTUI, tag as t } from 'src/kiosk/tui.js';
import logger from 'src/lib/logger.js';
import routes from 'src/lib/routes.js';

// TODO: add ascii art
// TODO: make ui less janky
// TODO: fortunes based on neosites
// TODO: break usb connector and have wires from inside laptop back

const app = Fastify({ loggerInstance: logger, disableRequestLogging: true });
await app.register(routes);
await app.listen({ port: 3000 });

const tui = initTUI();
tui.setBanner(t.lime('pre-cog futur3 site v1.01'), t.lime('> awaiting augment interface...'));

// const nfc = new NFC(console); // w/ debug logging
const nfc = new NFC();
const { handleCard, handleCardOff } = createCardHandlers(tui);

nfc.on('reader', (reader) => {
    tui.log(t.lime(`reader connected: *${reader.reader.name}*`));

    reader.on('card', (card) => {
        void handleCard(reader, card);
    });
    reader.on('card.off', (card) => {
        void handleCardOff(reader, card);
    });

    reader.on('error', (err) => {
        logger.error(err, 'reader error');
    });

    reader.on('end', () => {
        tui.log(t.lime(`reader disconnected: *${reader.reader.name}*`));
    });
});

nfc.on('error', (err) => {
    logger.error(err, 'NFC error');
});
