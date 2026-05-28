import { hexToAscii } from 'src/kiosk/hex.js';

describe('hexToAscii', () => {
    test('decodes printable ASCII bytes', () => {
        // "Hello" → 48 65 6c 6c 6f
        expect(hexToAscii('48656c6c6f')).toBe('Hello');
    });

    test('replaces non-printable bytes with a dot', () => {
        // 0x00 (NUL), 0x1f (below space), 0x7f (DEL) are all non-printable.
        expect(hexToAscii('001f7f')).toBe('...');
    });

    test('mixes printable and non-printable in the same input', () => {
        // 'A' = 0x41, NUL = 0x00, 'B' = 0x42
        expect(hexToAscii('410042')).toBe('A.B');
    });

    test('returns empty string for empty input', () => {
        expect(hexToAscii('')).toBe('');
    });
});
