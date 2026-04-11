import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export const fortune = sqliteTable('fortune', {
    pk: integer('pk').primaryKey({ autoIncrement: true }),
    id: integer('id').notNull(),
    version: integer('version').notNull(),
    text: text('text').notNull(),
}, t => [
    unique().on(t.id, t.version),
]);

export const cardData = sqliteTable('card_data', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uid: text('uid').notNull(),
    data: text('data').notNull(),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const feedback = sqliteTable('feedback', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uid: text('uid').notNull(),
    fortunePk: integer('fortune_pk').notNull().references(() => fortune.pk),
    reaction: integer('reaction').notNull(),
    comment: text('comment').notNull(),
    neoname: text('neoname').notNull(),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
