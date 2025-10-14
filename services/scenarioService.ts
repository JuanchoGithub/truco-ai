import { GameState, Card, Suit, Rank } from '../types';
import { createDeck, getEnvidoValue, hasFlor, calculateHandStrength, getCardHierarchy } from './trucoLogic';

// --- Hand Generation Utilities ---

export interface HandConstraints {
    hasFlor?: boolean;
    mustNotHaveFlor?: boolean;
    minEnvido?: number;
    maxEnvido?: number;
    minTrucoStrength?: number;
    maxTrucoStrength?: number;
    numCards?: number;
    hasCardThatBeats?: Card;
    allCardsWeakerThan?: Card;
}

function shuffle<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function combinations<T>(pool: T[], k: number): T[][] {
    if (k < 0 || k > pool.length) return [];
    if (k === 0) return [[]];
    const combs: T[][] = [];
    for (let i = 0; i < pool.length - k + 1; i++) {
        const head = pool.slice(i, i + 1);
        const tailCombs = combinations(pool.slice(i + 1), k - 1);
        for (const tail of tailCombs) {
            combs.push(head.concat(tail));
        }
    }
    return combs;
}

function checkConstraints(hand: Card[], constraints: HandConstraints): boolean {
    if (constraints.hasFlor && !hasFlor(hand)) return false;
    if (constraints.mustNotHaveFlor && hasFlor(hand)) return false;
    if (constraints.minEnvido && getEnvidoValue(hand) < constraints.minEnvido) return false;
    if (constraints.maxEnvido && getEnvidoValue(hand) > constraints.maxEnvido) return false;
    if (constraints.minTrucoStrength && calculateHandStrength(hand) < constraints.minTrucoStrength) return false;
    if (constraints.maxTrucoStrength && calculateHandStrength(hand) > constraints.maxTrucoStrength) return false;
    if (constraints.hasCardThatBeats && !hand.some(c => getCardHierarchy(c) > getCardHierarchy(constraints.hasCardThatBeats!))) return false;
    if (constraints.allCardsWeakerThan && !hand.every(c => getCardHierarchy(c) < getCardHierarchy(constraints.allCardsWeakerThan!))) return false;
    return true;
}

function generateHands(aiConstraints: HandConstraints, playerConstraints: HandConstraints): { aiHand: Card[], playerHand: Card[] } | null {
    const MAX_ATTEMPTS = 500;
    const deck = shuffle(createDeck());
    const aiNumCards = aiConstraints.numCards || 3;
    const playerNumCards = playerConstraints.numCards || 3;

    const allPossibleAiHands = combinations(deck, aiNumCards);
    const validAiHands = shuffle(allPossibleAiHands.filter(hand => checkConstraints(hand, aiConstraints)));

    if (validAiHands.length === 0) {
        console.error("Could not find any valid AI hands for constraints:", aiConstraints);
        return null;
    }

    for (let i = 0; i < Math.min(validAiHands.length, MAX_ATTEMPTS); i++) {
        const aiHand = validAiHands[i];
        const remainingDeck = deck.filter(c => !aiHand.some(h => h.rank === c.rank && h.suit === c.suit));
        
        if (remainingDeck.length < playerNumCards) continue;

        const allPossiblePlayerHands = combinations(remainingDeck, playerNumCards);
        const validPlayerHands = allPossiblePlayerHands.filter(hand => checkConstraints(hand, playerConstraints));

        if (validPlayerHands.length > 0) {
            const playerHand = validPlayerHands[Math.floor(Math.random() * validPlayerHands.length)];
            return { aiHand, playerHand };
        }
    }

    console.error("Could not find a valid pair of hands after max attempts for constraints:", { aiConstraints, playerConstraints });
    return null; // Could not find a valid pair
}


// --- Scenario Definitions ---

export interface PredefinedScenario {
    nameKey: string;
    baseState: Partial<GameState>;
    generateHands: () => { aiHand: Card[], playerHand: Card[] } | null;
}

export const predefinedScenarios: PredefinedScenario[] = [
    {
        nameKey: 'scenario_tester.scenario_names.parda_y_gano',
        baseState: {
            aiTricks: [ { rank: 3, suit: 'bastos' }, null, null ],
            playerTricks: [ { rank: 3, suit: 'oros' }, null, null ],
            trickWinners: ['tie', null, null],
            currentTrick: 1,
            mano: 'ai',
            currentTurn: 'ai',
            gamePhase: 'trick_2',
            aiScore: 5,
            playerScore: 5
        },
        generateHands: () => generateHands(
            { numCards: 2, minTrucoStrength: 18 }, // Needs a strong 2-card hand (e.g., 7-espada + 6)
            { numCards: 2, maxTrucoStrength: 15 }  // Opponent has a weaker 2-card hand
        )
    },
    {
        nameKey: 'scenario_tester.scenario_names.do_or_die',
        baseState: {
            aiScore: 13,
            playerScore: 14,
            trucoLevel: 1,
            gamePhase: 'truco_called',
            lastCaller: 'player',
            currentTurn: 'ai',
            mano: 'player'
        },
        generateHands: () => generateHands(
            { maxTrucoStrength: 10, mustNotHaveFlor: true }, // Weak hand for AI
            { minTrucoStrength: 20, mustNotHaveFlor: true }  // Strong hand for Opponent
        )
    },
    {
        nameKey: 'scenario_tester.scenario_names.lopsided_bait',
        baseState: {
            aiScore: 8,
            playerScore: 8,
            currentTrick: 0,
            mano: 'ai',
            currentTurn: 'ai',
            gamePhase: 'trick_1'
        },
        generateHands: () => generateHands(
            { minEnvido: 31, maxTrucoStrength: 10, mustNotHaveFlor: true }, // High envido, weak truco
            { mustNotHaveFlor: true } // Any non-flor hand for opponent
        )
    },
    {
        nameKey: 'scenario_tester.scenario_names.envido_primero',
        baseState: {
            aiScore: 10,
            playerScore: 10,
            trucoLevel: 1,
            gamePhase: 'truco_called',
            lastCaller: 'player',
            currentTurn: 'ai',
            mano: 'player',
            currentTrick: 0
        },
        generateHands: () => generateHands(
            { minEnvido: 33, mustNotHaveFlor: true }, // Excellent envido for AI
            { mustNotHaveFlor: true } // Any non-flor hand for opponent
        )
    },
    {
        nameKey: 'scenario_tester.scenario_names.flor_vs_envido',
        baseState: {
            aiScore: 2,
            playerScore: 2,
            gamePhase: 'envido_called',
            lastCaller: 'player',
            currentTurn: 'ai',
            mano: 'player',
            currentTrick: 0
        },
        generateHands: () => generateHands(
            { hasFlor: true }, // AI must have flor
            { minEnvido: 30, mustNotHaveFlor: true } // Opponent has high envido but no flor
        )
    }
];