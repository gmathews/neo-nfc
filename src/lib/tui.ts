import blessed from 'neo-blessed';

export const tag = {
    amber: (s: string) => `{#ffa500-fg}${s}{/}`,
    green: (s: string) => `{green-fg}${s}{/}`,
    red: (s: string) => `{red-fg}${s}{/}`,
    blue: (s: string) => `{#4fc1ff-fg}${s}{/}`,
};

export type FormField
    = | { type: 'text'; name: string; label: string }
        | { type: 'choice'; name: string; label: string; options: { label: string; value: string }[] };

export interface TUI {
    log: (msg: string) => void;
    clear: () => void;
    setBanner: (line1: string, line2?: string) => void;
    askForm: (title: string, fields: FormField[]) => Promise<Record<string, string>>;
    destroy: () => void;
}

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
        style: { border: { fg: 214 }, fg: 214 },
        padding: { left: 1, right: 1 },
    });

    const logBox = blessed.log({
        parent: screen,
        top: 3,
        left: 0,
        right: 0,
        bottom: 1,
        border: 'line',
        tags: true,
        scrollable: true,
        scrollOnInput: true,
        mouse: true,
        keys: true,
        style: { border: { fg: 214 } },
        padding: { left: 1, right: 1 },
    });

    function render() {
        screen.render();
    }

    function clear() {
        logBox.setContent('');
        render();
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
            bg: '#ffa500',
            item: { fg: 'black', bg: '#ffa500' },
            selected: { fg: '#ffa500', bg: 'black' },
            prefix: { fg: 'black', bg: '#ffa500', bold: true },
        },
        commands: {
            clear: { keys: ['f2'], callback: clear },
            quit: { keys: ['f10'], callback: () => process.exit(0) },
        },
    });

    screen.render();

    return {
        log: (msg) => {
            logBox.log(msg);
            render();
        },
        clear,
        setBanner: (l1, l2) => {
            banner.setContent(l2 ? `${l1}\n${l2}` : l1);
            render();
        },
        askForm: (title, fields) => new Promise((resolve) => {
            const rowsPerField = 3; // label + widget + spacer
            const height = 2 + fields.length * rowsPerField + 2;
            const form = blessed.form({
                parent: screen,
                border: 'line',
                width: '80%',
                height,
                top: 'center',
                left: 'center',
                keys: true,
                mouse: true,
                label: ` ${title} `,
                tags: true,
                style: { border: { fg: '#ffa500' }, label: { fg: '#ffa500' } },
                padding: { left: 1, right: 1 },
            });

            interface TextInput { kind: 'text'; name: string; box: blessed.Widgets.TextboxElement }
            interface ChoiceInput { kind: 'choice'; name: string; options: { label: string; value: string }[]; buttons: blessed.Widgets.BlessedElement[]; selected: number }
            const inputs: (TextInput | ChoiceInput)[] = [];

            const renderChoice = (label: string, selected: boolean): string =>
                selected ? `{#ffa500-fg}[${label}]{/}` : ` ${label} `;
            const renderChoiceRow = (choice: ChoiceInput) => {
                choice.buttons.forEach((btn, j) => {
                    btn.setContent(renderChoice(choice.options[j].label, choice.selected === j));
                });
            };

            fields.forEach((f, i) => {
                blessed.text({
                    parent: form,
                    top: i * rowsPerField,
                    left: 0,
                    right: 0,
                    height: 1,
                    tags: true,
                    content: f.label,
                });
                if (f.type === 'text') {
                    const box = blessed.textbox({
                        parent: form,
                        top: i * rowsPerField + 1,
                        left: 0,
                        right: 0,
                        height: 1,
                        inputOnFocus: true,
                        keys: true,
                        mouse: true,
                        name: f.name,
                        style: { fg: 'white', bg: 'black', focus: { bg: '#333333' } },
                    });
                    inputs.push({ kind: 'text', name: f.name, box });
                } else {
                    const buttons: blessed.Widgets.BlessedElement[] = [];
                    const choice: ChoiceInput = { kind: 'choice', name: f.name, options: f.options, buttons, selected: 0 };
                    let colOffset = 0;
                    f.options.forEach((opt, j) => {
                        const width = opt.label.length + 4;
                        const btn = blessed.box({
                            parent: form,
                            top: i * rowsPerField + 1,
                            left: colOffset,
                            width,
                            height: 1,
                            tags: true,
                            mouse: true,
                            clickable: true,
                            content: renderChoice(opt.label, choice.selected === j),
                            style: { fg: 'white' },
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
                content: '{#888888-fg}enter: next field   ← →: choose   enter on last: submit{/}',
            });

            function submit() {
                const values: Record<string, string> = {};
                for (const inp of inputs) {
                    if (inp.kind === 'text') values[inp.name] = inp.box.getValue();
                    else values[inp.name] = inp.options[inp.selected].value;
                }
                form.destroy();
                render();
                resolve(values);
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
        destroy: () => { screen.destroy(); },
    };
}
