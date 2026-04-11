import pino from 'pino';

const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            ignore: 'pid,hostname,time,level',
            messageFormat: '{msg}',
            colorize: false,
        },
    },
});

export const color = {
    amber: '\x1b[38;5;214m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    reset: '\x1b[0m',
} as const;

export default logger;
