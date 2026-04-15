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

export function toError(err: unknown): Error {
    return err instanceof Error ? err : new Error(String(err));
}

export default logger;
