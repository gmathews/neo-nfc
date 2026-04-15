// Cursor-based pagination helper shared across the route modules.
export const PAGE_SIZE = 20;

export async function paginate<T, C extends string | number>(opts: {
    fetchForward: () => Promise<T[]>;
    fetchPrev: (() => Promise<T[]>) | null;
    getCursor: (row: T) => C;
}): Promise<{ items: T[]; nextCursor: C | null; prevCursor: C | null }> {
    const rows = await opts.fetchForward();
    const hasMore = rows.length > PAGE_SIZE;
    const items = rows.slice(0, PAGE_SIZE);
    const nextCursor = hasMore ? opts.getCursor(items[items.length - 1]) : null;
    let prevCursor: C | null = null;
    if (opts.fetchPrev) {
        const prev = await opts.fetchPrev();
        if (prev.length >= PAGE_SIZE) {
            prevCursor = opts.getCursor(prev[prev.length - 1]);
        }
    }
    return { items, nextCursor, prevCursor };
}
