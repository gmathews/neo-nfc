// Cyberpunk terminal UI built on neo-blessed: banner, scrolling log, right-side art/horoscope panel, and a modal askForm.
import blessed from 'neo-blessed';
import { createMatrix } from './ascii.js';

const LOG_WIDTH = 80;
const FORM_WIDTH = 60;

export const palette = {
    lime: '#88ff88', // primary accent — labels, banner text, active selection
    limeBright: '#aaffaa', // input text, choice buttons, matrix overlay
    chrome: '#00aa44', // borders, listbar background
    dim: '#4a8a4a', // hint footer
    focusBg: '#003311', // textbox focus background
    blue: '#4fc1ff', // cross-reference highlights (terminal 418)
};

export const tag = {
    lime: (s: string) => `{${palette.lime}-fg}${s}{/}`,
    green: (s: string) => `{green-fg}${s}{/}`,
    red: (s: string) => `{red-fg}${s}{/}`,
    blue: (s: string) => `{${palette.blue}-fg}${s}{/}`,
};

export type FormField
    = | { type: 'text'; name: string; label: string }
        | { type: 'choice'; name: string; label: string; options: { label: string; value: string }[]; default?: string };

export interface LogLineHandle {
    update: (content: string) => void;
}

export interface SpinnerHandle {
    newLine: (content: string) => void;
    setContent: (content: string) => void;
    finalize: (final: string) => void;
    stop: () => void;
}

export interface TUI {
    log: (msg: string) => void;
    logLine: (initial: string) => LogLineHandle;
    spinner: (render: (frame: string, content: string) => string) => SpinnerHandle;
    clear: () => void;
    setBanner: (line1: string, line2?: string) => void;
    showModal: (getFrame: (tick: number) => string, durationMs: number, width: number, height: number) => void;
    setPanel: (content: string) => void;
    clearPanel: () => void;
    askForm: (title: string, fields: FormField[], header?: string) => Promise<Record<string, string> | null>;
    dismissForm: () => void;
    destroy: () => void;
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function initTUI(): TUI {
    const screen = blessed.screen({ smartCSR: true, title: 'neotropolis' });

    const banner = blessed.box({
        parent: screen,
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        border: 'line',
        tags: true,
        style: { border: { fg: palette.chrome }, fg: palette.lime },
        padding: { left: 1, right: 1 },
    });

    const logBox = blessed.log({
        parent: screen,
        top: 3,
        left: 0,
        width: LOG_WIDTH,
        bottom: 1,
        border: 'line',
        tags: true,
        scrollable: true,
        scrollOnInput: true,
        mouse: true,
        keys: true,
        style: { border: { fg: palette.chrome } },
        padding: { left: 1, right: 1 },
    });

    const panel = blessed.box({
        parent: screen,
        top: 3,
        left: LOG_WIDTH,
        right: 0,
        bottom: 1,
        border: 'line',
        tags: true,
        wrap: false,
        scrollable: false,
        style: { border: { fg: palette.chrome }, fg: palette.lime },
        padding: { left: 1, right: 1 },
    });

    let activeForm: { dismiss: () => void } | null = null;
    const dismissForm = () => activeForm?.dismiss();
    screen.key(['escape'], dismissForm);

    let panelOverride: string | null = null;
    const matrix = createMatrix(palette.limeBright);
    function renderPanel() {
        const w = (panel.width as number) - (panel.iwidth as number);
        const h = (panel.height as number) - (panel.iheight as number);
        panel.setContent(matrix(w, h, panelOverride ?? undefined));
        screen.render();
    }
    const panelTimer = setInterval(renderPanel, 120);

    function render() {
        screen.render();
    }

    const lines: string[] = [];
    function flushLog() {
        logBox.setContent(lines.join('\n'));
        logBox.setScrollPerc(100);
        render();
    }

    function logFn(msg: string) {
        lines.push(msg);
        flushLog();
    }

    function logLineFn(initial: string): LogLineHandle {
        lines.push(initial);
        const idx = lines.length - 1;
        flushLog();
        return {
            update: (content) => {
                lines[idx] = content;
                flushLog();
            },
        };
    }

    function spinnerFn(renderFrame: (frame: string, content: string) => string): SpinnerHandle {
        let frameIdx = 0;
        let content = '';
        let handle: LogLineHandle | null = null;
        const id = setInterval(() => {
            frameIdx = (frameIdx + 1) % SPINNER_FRAMES.length;
            if (handle) handle.update(renderFrame(SPINNER_FRAMES[frameIdx], content));
        }, 80);
        return {
            newLine: (c) => {
                if (handle) handle.update(renderFrame(' ', content));
                content = c;
                handle = logLineFn(renderFrame(SPINNER_FRAMES[frameIdx], content));
            },
            setContent: (c) => {
                content = c;
                if (handle) handle.update(renderFrame(SPINNER_FRAMES[frameIdx], content));
            },
            finalize: (final) => {
                if (handle) {
                    handle.update(final);
                    handle = null;
                }
            },
            stop: () => {
                clearInterval(id);
                if (handle) {
                    handle.update(renderFrame(' ', content));
                    handle = null;
                }
            },
        };
    }

    function setPanel(content: string) {
        panelOverride = content;
        renderPanel();
    }

    function clearPanel() {
        panelOverride = null;
        renderPanel();
    }

    function clear() {
        lines.length = 0;
        flushLog();
        clearPanel();
    }

    // @types/blessed is incomplete for listbar; blessed accepts prefix styles and command keys
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (blessed as any).listbar({
        parent: screen,
        bottom: 0,
        left: 0,
        right: 0,
        height: 1,
        mouse: true,
        keys: true,
        autoCommandKeys: false,
        style: {
            bg: palette.chrome,
            item: { fg: 'black', bg: palette.chrome },
            selected: { fg: palette.lime, bg: 'black' },
            prefix: { fg: 'black', bg: palette.chrome, bold: true },
        },
        commands: {
            clear: { keys: ['C-d'], callback: clear },
            quit: { keys: ['C-c'], callback: () => process.exit(0) },
        },
    });

    screen.render();

    let activeModal: { timer: NodeJS.Timeout; timeout: NodeJS.Timeout; box: blessed.Widgets.BoxElement } | null = null;
    function dismissModal() {
        if (!activeModal) return;
        clearInterval(activeModal.timer);
        clearTimeout(activeModal.timeout);
        activeModal.box.destroy();
        activeModal = null;
    }

    return {
        log: logFn,
        logLine: logLineFn,
        spinner: spinnerFn,
        setPanel,
        clearPanel,
        clear,
        setBanner: (l1, l2) => {
            banner.setContent(l2 ? `${l1}\n${l2}` : l1);
            render();
        },
        showModal: (getFrame, durationMs, width, height) => {
            dismissModal();
            // Center on the log window (banner occupies 3 rows on top, listbar 1 row on bottom).
            const screenHeight = screen.height as number;
            const top = 3 + Math.max(0, Math.floor((screenHeight - 4 - height) / 2));
            const left = Math.max(0, Math.floor((LOG_WIDTH - width) / 2));
            const box = blessed.box({
                parent: screen,
                top,
                left,
                width,
                height,
                border: 'line',
                tags: true,
                align: 'center',
                style: { border: { fg: 'red' }, fg: palette.lime, bg: 'black' },
                padding: { left: 1, right: 1 },
            });
            let tick = 0;
            const redraw = () => {
                box.setContent(getFrame(tick));
                render();
            };
            redraw();
            const timer = setInterval(() => {
                tick++;
                redraw();
            }, 90);
            const timeout = setTimeout(dismissModal, durationMs);
            activeModal = { timer, timeout, box };
        },
        dismissForm,
        askForm: (title, fields, header) => new Promise((resolve) => {
            const rowsPerField = 3; // label + widget + spacer
            const headerRows = header ? 2 : 0; // header text + spacer
            const height = 2 + headerRows + fields.length * rowsPerField + 1;
            const form = blessed.form({
                parent: screen,
                border: 'line',
                left: Math.floor((LOG_WIDTH - FORM_WIDTH) / 2),
                width: FORM_WIDTH,
                height,
                top: 'center',
                keys: true,
                mouse: true,
                label: ` ${title} `,
                tags: true,
                style: { border: { fg: palette.lime }, label: { fg: palette.lime } },
                padding: { left: 1, right: 1 },
            });

            let finished = false;
            function finish(values: Record<string, string> | null) {
                if (finished) return;
                finished = true;
                if (activeForm === myForm) activeForm = null;
                form.destroy();
                render();
                resolve(values);
            }
            const dismiss = () => {
                finish(null);
            };
            const myForm = { dismiss };
            activeForm = myForm;

            interface TextInput { kind: 'text'; name: string; box: blessed.Widgets.TextboxElement }
            interface ChoiceInput { kind: 'choice'; name: string; options: { label: string; value: string }[]; buttons: blessed.Widgets.BlessedElement[]; selected: number }
            const inputs: (TextInput | ChoiceInput)[] = [];

            const renderChoice = (label: string, selected: boolean): string =>
                selected ? `{${palette.lime}-fg}[${label}]{/}` : ` ${label} `;
            const renderChoiceRow = (choice: ChoiceInput) => {
                choice.buttons.forEach((btn, j) => {
                    btn.setContent(renderChoice(choice.options[j].label, choice.selected === j));
                });
            };

            if (header) {
                blessed.text({
                    parent: form,
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 1,
                    tags: true,
                    content: header,
                    style: { fg: palette.lime },
                });
            }

            fields.forEach((f, i) => {
                blessed.text({
                    parent: form,
                    top: headerRows + i * rowsPerField,
                    left: 0,
                    right: 0,
                    height: 1,
                    tags: true,
                    content: f.label,
                    style: { fg: palette.lime },
                });
                if (f.type === 'text') {
                    const box = blessed.textbox({
                        parent: form,
                        top: headerRows + i * rowsPerField + 1,
                        left: 0,
                        right: 0,
                        height: 1,
                        inputOnFocus: true,
                        keys: true,
                        mouse: true,
                        name: f.name,
                        style: { fg: palette.limeBright, bg: 'black', focus: { bg: palette.focusBg } },
                    });
                    inputs.push({ kind: 'text', name: f.name, box });
                } else {
                    const buttons: blessed.Widgets.BlessedElement[] = [];
                    const defaultIdx = f.default !== undefined
                        ? f.options.findIndex(o => o.value === f.default)
                        : 0;
                    const choice: ChoiceInput = { kind: 'choice', name: f.name, options: f.options, buttons, selected: defaultIdx >= 0 ? defaultIdx : 0 };
                    let colOffset = 0;
                    f.options.forEach((opt, j) => {
                        const width = opt.label.length + 4;
                        const btn = blessed.box({
                            parent: form,
                            top: headerRows + i * rowsPerField + 1,
                            left: colOffset,
                            width,
                            height: 1,
                            tags: true,
                            mouse: true,
                            clickable: true,
                            content: renderChoice(opt.label, choice.selected === j),
                            style: { fg: palette.limeBright },
                        });
                        btn.on('click', () => {
                            choice.selected = j;
                            renderChoiceRow(choice);
                            render();
                        });
                        buttons.push(btn);
                        colOffset += width + 1;
                    });
                    inputs.push(choice);
                }
            });

            blessed.text({
                parent: form,
                bottom: 0,
                left: 0,
                right: 0,
                height: 1,
                tags: true,
                content: `{${palette.dim}-fg}enter: next field   ← →: choose   enter on last: submit{/}`,
            });

            function submit() {
                const values: Record<string, string> = {};
                for (const inp of inputs) {
                    if (inp.kind === 'text') values[inp.name] = inp.box.getValue();
                    else values[inp.name] = inp.options[inp.selected].value;
                }
                finish(values);
            }

            function focusIdx(i: number) {
                const inp = inputs[i];
                if (inp.kind === 'text') inp.box.focus();
                else inp.buttons[inp.selected].focus();
                render();
            }

            inputs.forEach((inp, i) => {
                const advance = () => {
                    if (i === inputs.length - 1) {
                        submit();
                    } else {
                        setImmediate(() => {
                            focusIdx(i + 1);
                        });
                    }
                };
                if (inp.kind === 'text') {
                    inp.box.on('submit', advance);
                    inp.box.on('cancel', dismiss);
                } else {
                    inp.buttons.forEach((btn) => {
                        btn.key(['left'], () => {
                            inp.selected = (inp.selected - 1 + inp.options.length) % inp.options.length;
                            renderChoiceRow(inp);
                            focusIdx(i);
                        });
                        btn.key(['right'], () => {
                            inp.selected = (inp.selected + 1) % inp.options.length;
                            renderChoiceRow(inp);
                            focusIdx(i);
                        });
                        btn.key(['enter'], () => {
                            advance();
                        });
                    });
                }
            });

            focusIdx(0);
        }),
        destroy: () => {
            clearInterval(panelTimer);
            dismissModal();
            screen.destroy();
        },
    };
}
