// Tracks the card currently presented on the NFC reader, so HTTP routes can
// target it for on-demand writes. Updated from the kiosk event wiring in app.ts.
import type { Card, Reader } from 'nfc-pcsc';

let current: { reader: Reader; card: Card } | null = null;

export function setCurrentCard(reader: Reader, card: Card): void {
    current = { reader, card };
}

export function clearCurrentCard(card: Card): void {
    if (current?.card.uid === card.uid) current = null;
}

export function getCurrentCard(): { reader: Reader; card: Card } | null {
    return current;
}
