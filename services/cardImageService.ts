import { Card, Suit, Rank } from '../types';
import { getCardName } from './trucoLogic';
import i18nService from './i18nService';

const SPRITE_SHEET_URL_REMOTE = 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Baraja_espa%C3%B1ola_completa.png';
const SPRITE_SHEET_URL_LOCAL = '/cartas2.png';
const COLS = 12;
const CARD_WIDTH = 208;
const CARD_HEIGHT = 320;
const ROW_SPACING = 320;

let remoteSpriteSheet: HTMLImageElement;
let remoteSpriteSheetPromise: Promise<HTMLImageElement> | null = null;
let localSpriteSheet: HTMLImageElement;
let localSpriteSheetPromise: Promise<HTMLImageElement> | null = null;

const suitToRow: Record<Suit, number> = {
    'oros': 0,
    'copas': 1,
    'espadas': 2,
    'bastos': 3,
};

// The spritesheet has 12 ranks (1-12), but Truco omits 8 and 9.
// We map our ranks to the correct column index on the spritesheet.
const rankToCol: Record<Rank, number> = {
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    7: 6,
    10: 9,
    11: 10,
    12: 11,
};

function getSpriteSheet(mode: 'image' | 'local-image'): Promise<HTMLImageElement> {
    if (mode === 'image') {
        if (remoteSpriteSheet) {
            return Promise.resolve(remoteSpriteSheet);
        }
        if (remoteSpriteSheetPromise) {
            return remoteSpriteSheetPromise;
        }
        
        remoteSpriteSheetPromise = new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous"; // Needed for drawing remote images to a canvas
            img.onload = () => {
                remoteSpriteSheet = img;
                resolve(img);
            };
            img.onerror = (err) => {
                console.error(i18nService.t('cardImageService.errors.remote_load_failed'), err);
                // Clear the promise so it can be retried later
                remoteSpriteSheetPromise = null;
                reject(new Error(i18nService.t('cardImageService.errors.remote_load_failed')));
            };
            img.src = SPRITE_SHEET_URL_REMOTE;
        });

        return remoteSpriteSheetPromise;
    } else { // 'local-image'
        if (localSpriteSheet) {
            return Promise.resolve(localSpriteSheet);
        }
        if (localSpriteSheetPromise) {
            return localSpriteSheetPromise;
        }
        
        localSpriteSheetPromise = new Promise((resolve, reject) => {
            const img = new Image();
            // No crossOrigin for local files
            img.onload = () => {
                localSpriteSheet = img;
                resolve(img);
            };
            img.onerror = (err) => {
                console.error(i18nService.t('cardImageService.errors.local_load_failed'), err);
                // Clear the promise so it can be retried later
                localSpriteSheetPromise = null;
                reject(new Error(i18nService.t('cardImageService.errors.local_load_failed_path')));
            };
            img.src = SPRITE_SHEET_URL_LOCAL;
        });

        return localSpriteSheetPromise;
    }
}

// Cache generated card images to avoid re-processing
const canvasCache = new Map<string, string>();

export async function getCardImageDataUrl(card: Card, mode: 'image' | 'local-image'): Promise<string> {
    const cacheKey = `${mode}-${card.suit}-${card.rank}`;
    if (canvasCache.has(cacheKey)) {
        return canvasCache.get(cacheKey)!;
    }

    const img = await getSpriteSheet(mode);
    
    const row = suitToRow[card.suit];
    const col = rankToCol[card.rank];

    if (row === undefined || col === undefined) {
        throw new Error(i18nService.t('cardImageService.errors.invalid_card', { cardName: getCardName(card) }));
    }

    const x = col * CARD_WIDTH;
    const y = row * ROW_SPACING;

    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error(i18nService.t('cardImageService.errors.no_canvas_context'));
    }

    ctx.drawImage(img, x, y, CARD_WIDTH, CARD_HEIGHT, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL();
    canvasCache.set(cacheKey, dataUrl);

    return dataUrl;
}