// Hex-string to printable-ASCII helper for displaying card block contents in the TUI.
export function hexToAscii(hex: string): string {
    let out = '';
    for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.slice(i, i + 2), 16);
        out += byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : '.';
    }
    return out;
}
