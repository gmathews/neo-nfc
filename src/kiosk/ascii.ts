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

const GLITCH_CHARS = '▓▒░█▀▄◆◇⚠!@#$%^&*?/\\~';
function glitchify(text: string, intensity: number): string {
    if (intensity <= 0) return text;
    let out = '';
    for (const ch of text) {
        if (ch === ' ' || ch === '\n') out += ch;
        else if (Math.random() < intensity) out += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        else out += ch;
    }
    return out;
}

export const INFECTION_BOX = { width: 60, height: 14 };

// Two cartoony skull-emoji-shaped skulls: round cranium, tapered jaw, teeth, chin.
const SKULL_A = [
    '   ▄▀▀▀▀▀▄   ',
    '  █ O   O █  ',
    '  █   ▽   █  ',
    '  ▀█▄▄▄▄▄█▀  ',
    '    ║║║║║    ',
    '     ▀▀▀     ',
];
const SKULL_B = [
    '   ▄▀▀▀▀▀▄   ',
    '  █ X   X █  ',
    '  █   △   █  ',
    '  ▀█▄▄▄▄▄█▀  ',
    '    ║║║║║    ',
    '     ▀▀▀     ',
];
// Crossed bones under each skull: X shape with knob ends (jolly roger).
const CROSSBONES = [
    'o\\         /o',
    ' \\\\       // ',
    '   \\\\   //   ',
    '   //   \\\\   ',
    ' //       \\\\ ',
    'o/         \\o',
];
const LEFT_COLUMN = [...SKULL_A, ...CROSSBONES];
const RIGHT_COLUMN = [...SKULL_B, ...CROSSBONES];
const MIDDLE_WIDTH = 30;

function centerPad(text: string, width: number): string {
    const left = Math.floor((width - text.length) / 2);
    const right = width - text.length - left;
    return ' '.repeat(Math.max(0, left)) + text + ' '.repeat(Math.max(0, right));
}

export function infectionFrame(counter: number, tick: number): string {
    const intensity = Math.min(0.55, counter * 0.1);
    // Pulse: keep the magic string readable most of the time; glitch briefly every cycle.
    const magicGlitching = tick % 8 < 2;
    const magicIntensity = magicGlitching ? intensity * 0.6 : 0;
    const skullIntensity = intensity * 0.3;

    const middleFor = (row: number): string => {
        if (row === 1) {
            return `{red-fg}${centerPad(glitchify('░▓█ SYSTEM BREACH █▓░', intensity), MIDDLE_WIDTH)}{/}`;
        }
        if (row === 3) {
            const msg = `>> ${glitchify('infected by r00t k1d', magicIntensity)} <<`;
            return `{red-fg}${centerPad(msg, MIDDLE_WIDTH)}{/}`;
        }
        return ' '.repeat(MIDDLE_WIDTH);
    };

    return LEFT_COLUMN.map((left, i) => {
        const a = `{red-fg}${glitchify(left, skullIntensity)}{/}`;
        const b = `{red-fg}${glitchify(RIGHT_COLUMN[i], skullIntensity)}{/}`;
        return `${a}${middleFor(i)}${b}`;
    }).join('\n');
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

export function createMatrix(overlayColor: string): (width: number, height: number, overlay?: string) => string {
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
                    grid[row][x] = { ch, color: ch === ' ' ? '' : overlayColor };
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
