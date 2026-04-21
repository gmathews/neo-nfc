// Fastify plugin: registers Swagger UI at /docs and mounts the fortune/user routes.
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyPluginAsync } from 'fastify';
import {
    getFortune,
    getFortuneSchema,
    getFortunes,
    getFortunesSchema,
    putFortune,
    putFortuneSchema,
} from 'src/lib/routes/fortune.js';
import {
    getReaderStatus,
    getReaderStatusSchema,
    postReaderBlock,
    postReaderBlockSchema,
    postReaderWrite,
    postReaderWriteSchema,
} from 'src/lib/routes/reader.js';
import {
    getTerminal418,
    getTerminal418Schema,
} from 'src/lib/routes/terminal418.js';
import {
    getUser,
    getUserSchema,
    getUsers,
    getUsersSchema,
} from 'src/lib/routes/user.js';

const routes: FastifyPluginAsync = async (app) => {
    await app.register(swagger, {
        openapi: {
            info: {
                title: 'Neotropolis Fortune API',
                version: '1.0.0',
            },
        },
    });
    await app.register(swaggerUi, { routePrefix: '/documentation' });

    app.get('/fortune', { schema: getFortunesSchema }, getFortunes);
    app.get('/fortune/:id', { schema: getFortuneSchema }, getFortune);
    app.put('/fortune/:id', { schema: putFortuneSchema }, putFortune);

    app.get('/user', { schema: getUsersSchema }, getUsers);
    app.get('/user/:uid', { schema: getUserSchema }, getUser);

    app.get('/terminal418', { schema: getTerminal418Schema }, getTerminal418);

    app.get('/reader/status', { schema: getReaderStatusSchema }, getReaderStatus);
    app.post('/reader/write', { schema: postReaderWriteSchema }, postReaderWrite);
    app.post('/reader/block', { schema: postReaderBlockSchema }, postReaderBlock);
};

export default routes;
