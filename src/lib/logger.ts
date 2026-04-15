import pino from 'pino';

const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            destination: './kiosk.log',
            mkdir: true,
            ignore: 'pid,hostname',
            colorize: false,
        },
    },
});

export default logger;
