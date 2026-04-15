// ASCII art splashes + matrix rain renderer for the side panel.

function boxify(lines: string | string[]): string {
    const arr = Array.isArray(lines) ? lines : [lines];
    const innerWidth = Math.max(...arr.map(l => l.length));
    const horizontal = '═'.repeat(innerWidth + 2);
    const pad = (s: string) => ` ${s}${' '.repeat(innerWidth - s.length)} `;
    const out = [`   ╔${horizontal}╗`];
    for (const l of arr) out.push(`   ║${pad(l)}║`);
    out.push(`   ╚${horizontal}╝`);
    return out.join('\n');
}

export function augmentSplash(reader: string, uid: string): string {
    return boxify(`▓▒░ ${reader} ${uid} augment link established ░▒▓`);
}

export function severedSplash(uid: string): string {
    return boxify(`░▒▓ ${uid} link severed ▓▒░`);
}

export function horoscopePanel(text: string): string {
    return [
        '.·˚ ✦ ˚·.',
        '◈ daily horoscope ◈',
        '.·˚ ✦ ˚·.',
        '',
        text,
    ].join('\n');
}

function wrapLine(text: string, width: number): string[] {
    if (text.length <= width) return [text];
    const words = text.split(' ');
    const out: string[] = [];
    let cur = '';
    for (const word of words) {
        if (!cur) cur = word;
        else if (cur.length + 1 + word.length <= width) cur += ` ${word}`;
        else {
            out.push(cur);
            cur = word;
        }
    }
    if (cur) out.push(cur);
    return out;
}

const MATRIX_CHARS = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789+-*<>=#?!$%';
const randChar = () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];

interface Column { head: number; speed: number; length: number }

function newColumn(height: number, fresh: boolean): Column {
    return {
        head: fresh ? -Math.random() * height : Math.random() * height - height * 0.3,
        speed: 0.25 + Math.random() * 0.85,
        length: 6 + Math.floor(Math.random() * 14),
    };
}

export function createMatrix(): (width: number, height: number, overlay?: string) => string {
    let cols: Column[] = [];
    let buf: string[][] = [];
    let lastW = 0;
    let lastH = 0;

    return (width: number, height: number, overlay?: string): string => {
        if (width <= 0 || height <= 0) return '';
        if (width !== lastW || height !== lastH) {
            cols = Array.from({ length: width }, () => newColumn(height, false));
            buf = Array.from({ length: height }, () => Array.from({ length: width }, () => ' '));
            lastW = width;
            lastH = height;
        }

        for (let x = 0; x < width; x++) {
            const c = cols[x];
            const prev = Math.floor(c.head);
            c.head += c.speed;
            const cur = Math.floor(c.head);
            for (let y = Math.max(0, prev + 1); y <= cur && y < height; y++) {
                buf[y][x] = randChar();
            }
            if (c.head - c.length > height) {
                cols[x] = newColumn(height, true);
            }
        }

        const grid: { ch: string; color: string }[][] = [];
        for (let y = 0; y < height; y++) {
            const row: { ch: string; color: string }[] = [];
            for (let x = 0; x < width; x++) {
                const c = cols[x];
                const d = c.head - y;
                if (d >= 0 && d < c.length) {
                    if (d < 1) {
                        row.push({ ch: randChar(), color: '#e0ffe0' });
                    } else {
                        const fade = 1 - d / c.length;
                        const g = Math.max(40, Math.floor(40 + fade * 210));
                        row.push({ ch: buf[y][x], color: `#00${g.toString(16).padStart(2, '0')}00` });
                    }
                } else {
                    row.push({ ch: ' ', color: '' });
                }
            }
            grid.push(row);
        }

        if (overlay) {
            const lines: string[] = [];
            for (const raw of overlay.split('\n')) {
                if (raw === '') lines.push('');
                else for (const w of wrapLine(raw, width)) lines.push(w);
            }
            const startY = Math.max(0, Math.floor((height - lines.length) / 2));
            for (let i = 0; i < lines.length; i++) {
                const row = startY + i;
                if (row < 0 || row >= height) continue;
                const line = lines[i];
                if (line === '') continue;
                const startX = Math.max(0, Math.floor((width - line.length) / 2));
                for (let j = 0; j < line.length; j++) {
                    const x = startX + j;
                    if (x < 0 || x >= width) continue;
                    const ch = line[j];
                    grid[row][x] = { ch, color: ch === ' ' ? '' : '#aaffaa' };
                }
            }
        }

        const rows: string[] = [];
        for (let y = 0; y < height; y++) {
            let rowStr = '';
            let curColor = '';
            for (let x = 0; x < width; x++) {
                const cell = grid[y][x];
                if (cell.color !== curColor) {
                    if (curColor) rowStr += '{/}';
                    if (cell.color) rowStr += `{${cell.color}-fg}`;
                    curColor = cell.color;
                }
                rowStr += cell.ch;
            }
            if (curColor) rowStr += '{/}';
            rows.push(rowStr);
        }
        return rows.join('\n');
    };
}
