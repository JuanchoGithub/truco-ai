import { GameState, Card, Suit, Rank, CardConstraint, Player } from '../types';
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
    cardComposition?: CardConstraint[];
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
    
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const deck = shuffle(createDeck());
        let aiHand: Card[] | null = null;

        // --- AI Hand Generation ---
        if (aiConstraints.cardComposition) {
            // Builder logic
            let availableCards = [...deck];
            let builtHand: Card[] = [];
            let possible = true;
            for (const constraint of aiConstraints.cardComposition) {
                const cardIndex = availableCards.findIndex(card => {
                    const h = getCardHierarchy(card);
                    const minMatch = constraint.minHierarchy === undefined || h >= constraint.minHierarchy;
                    const maxMatch = constraint.maxHierarchy === undefined || h <= constraint.maxHierarchy;
                    return minMatch && maxMatch;
                });

                if (cardIndex !== -1) {
                    const [pickedCard] = availableCards.splice(cardIndex, 1);
                    builtHand.push(pickedCard);
                } else {
                    possible = false;
                    break; // Cannot satisfy this constraint, try a new deck shuffle
                }
            }
            if (possible && checkConstraints(builtHand, { ...aiConstraints, cardComposition: undefined })) {
                aiHand = builtHand;
            }
        } else {
            // Combinatorial logic
            const aiNumCards = aiConstraints.numCards || 3;
            const allPossibleAiHands = combinations(deck, aiNumCards);
            const validAiHands = shuffle(allPossibleAiHands.filter(hand => checkConstraints(hand, aiConstraints)));
            if (validAiHands.length > 0) {
                aiHand = validAiHands[0];
            }
        }

        if (!aiHand) continue; // Try next attempt if AI hand failed to generate

        // --- Player Hand Generation ---
        const remainingDeck = deck.filter(c => !aiHand!.some(h => h.rank === c.rank && h.suit === c.suit));
        const playerNumCards = playerConstraints.numCards || 3;
        
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
    },
    {
        nameKey: 'scenario_tester.scenario_names.endgame_pressure_truco',
        baseState: {
            aiScore: 14,
            playerScore: 13,
            currentTurn: 'ai',
            mano: 'ai',
            gamePhase: 'trick_1',
            currentTrick: 0
        },
        generateHands: () => generateHands(
            { minTrucoStrength: 15, maxTrucoStrength: 22, mustNotHaveFlor: true }, // A decent, but not unbeatable hand for the AI
            { minTrucoStrength: 23, mustNotHaveFlor: true } // A winning hand for the Player
        )
    },
    // New Scenarios Start Here
    {
        nameKey: 'scenario_tester.scenario_names.dual_brava_probe',
        baseState: { aiScore: 0, playerScore: 0, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_1' },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 13 }, { minHierarchy: 13 }, { maxHierarchy: 4 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.ancho_feint_chain',
        baseState: { 
            aiScore: 7, 
            playerScore: 6, 
            hasEnvidoBeenCalledThisRound: true, 
            gamePhase: 'trick_1', 
            mano: 'ai', 
            currentTurn: 'ai',
            aiEnvidoValue: 28,
            playerEnvidoValue: 26,
        },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 14, maxHierarchy: 14 }, { minHierarchy: 10, maxHierarchy: 10 }, { maxHierarchy: 2 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.false_ace_bait',
        baseState: { 
            aiScore: 8, 
            playerScore: 7, 
            gamePhase: 'trick_1',
            currentTurn: 'ai', 
            mano: 'ai',
            trucoLevel: 1,
            lastCaller: 'player',
            hasEnvidoBeenCalledThisRound: true
        },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 13, maxHierarchy: 13 }, { minHierarchy: 8, maxHierarchy: 8 }, { minHierarchy: 9, maxHierarchy: 9 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.tie_breaker_low',
        baseState: { aiScore: 10, playerScore: 9, trickWinners: ['tie', null, null], currentTrick: 1, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_2' },
        generateHands: () => generateHands({ numCards: 2, minTrucoStrength: 18 }, { numCards: 2 })
    },
    {
        nameKey: 'scenario_tester.scenario_names.signal_masked_depletion',
        baseState: { aiScore: 3, playerScore: 2, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_1' },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 14, maxHierarchy: 14 }, { minHierarchy: 13, maxHierarchy: 13 }, { minHierarchy: 5, maxHierarchy: 5 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.post_envido_low_shift',
        baseState: { aiScore: 1, playerScore: 0, hasEnvidoBeenCalledThisRound: true, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_1' },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 14, maxHierarchy: 14 }, { minHierarchy: 11, maxHierarchy: 11 }, { minHierarchy: 7, maxHierarchy: 7 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.triple_brava_figure_probe',
        baseState: { aiScore: 7, playerScore: 6, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_1' },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 13 }, { minHierarchy: 13 }, { minHierarchy: 5, maxHierarchy: 7 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.parda_ancho_hint',
        baseState: { 
            aiScore: 12, 
            playerScore: 11, 
            trickWinners: ['tie', null, null], 
            currentTrick: 1, 
            mano: 'ai', 
            currentTurn: 'ai', 
            gamePhase: 'trick_2',
            trucoLevel: 2,
            lastCaller: 'player'
        },
        generateHands: () => generateHands({ numCards: 2, minTrucoStrength: 15 }, { numCards: 2 })
    },
    {
        nameKey: 'scenario_tester.scenario_names.false_7_deplete',
        baseState: { 
            aiScore: 4, 
            playerScore: 3, 
            gamePhase: 'retruco_called', 
            trucoLevel: 2, 
            lastCaller: 'player',
            currentTurn: 'ai',
            mano: 'player'
        },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 14, maxHierarchy: 14 }, { minHierarchy: 4, maxHierarchy: 4 }, { minHierarchy: 2, maxHierarchy: 2 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.envido_suit_misdirect',
        baseState: { aiScore: 9, playerScore: 8, hasEnvidoBeenCalledThisRound: true, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_1' },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 13, maxHierarchy: 13 }, { minHierarchy: 9, maxHierarchy: 9 }, { minHierarchy: 1, maxHierarchy: 1 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.brava_kiss_signal',
        baseState: { aiScore: 0, playerScore: 0, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_1' },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 14, maxHierarchy: 14 }, { minHierarchy: 8, maxHierarchy: 8 }, { minHierarchy: 9, maxHierarchy: 9 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.mid_game_figure_low',
        baseState: { aiScore: 6, playerScore: 5, currentTrick: 1, trickWinners: ['ai', null, null], mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_2' },
        generateHands: () => generateHands({ numCards: 2, minTrucoStrength: 12 }, { numCards: 2 })
    },
    {
        nameKey: 'scenario_tester.scenario_names.late_false_ace_chain',
        baseState: { aiScore: 14, playerScore: 13, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_1' },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 14, maxHierarchy: 14 }, { minHierarchy: 13, maxHierarchy: 13 }, { minHierarchy: 8, maxHierarchy: 8 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.parda_false_7',
        baseState: { aiScore: 2, playerScore: 1, trickWinners: ['tie', null, null], currentTrick: 1, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_2' },
        generateHands: () => generateHands({ numCards: 2, minTrucoStrength: 13, maxTrucoStrength: 15 }, { numCards: 2 })
    },
    {
        nameKey: 'scenario_tester.scenario_names.banter_low_glimpse',
        baseState: { 
            aiScore: 11, 
            playerScore: 10, 
            gamePhase: 'trick_1', 
            mano: 'ai', 
            currentTurn: 'ai',
            trucoLevel: 1,
            lastCaller: 'player',
            hasEnvidoBeenCalledThisRound: true
        },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 14, maxHierarchy: 14 }, { minHierarchy: 2, maxHierarchy: 2 }, { minHierarchy: 1, maxHierarchy: 1 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.ancho_deplete_post_tie',
        baseState: { aiScore: 7, playerScore: 6, trickWinners: ['tie', 'tie', null], currentTrick: 2, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_3' },
        generateHands: () => generateHands({ numCards: 1, minTrucoStrength: 10 }, { numCards: 1 })
    },
    {
        nameKey: 'scenario_tester.scenario_names.dual_false_bait',
        baseState: { aiScore: 13, playerScore: 12, hasEnvidoBeenCalledThisRound: true, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_1' },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 14, maxHierarchy: 14 }, { minHierarchy: 8, maxHierarchy: 8 }, { minHierarchy: 8, maxHierarchy: 8 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.mid_low_signal_mask',
        baseState: { aiScore: 4, playerScore: 3, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_1' },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 12, maxHierarchy: 12 }, { minHierarchy: 9, maxHierarchy: 9 }, { minHierarchy: 3, maxHierarchy: 3 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.figure_ancho_shift',
        baseState: { aiScore: 9, playerScore: 8, trickWinners: ['ai', null, null], currentTrick: 1, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_2' },
        generateHands: () => generateHands({ numCards: 2, minTrucoStrength: 15 }, { numCards: 2 })
    },
    {
        nameKey: 'scenario_tester.scenario_names.endgame_low_balance',
        baseState: { aiScore: 14, playerScore: 14, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_1' },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 14, maxHierarchy: 14 }, { minHierarchy: 4, maxHierarchy: 4 }, { minHierarchy: 2, maxHierarchy: 2 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.probe_false_deplete',
        baseState: { 
            aiScore: 1, 
            playerScore: 0, 
            gamePhase: 'retruco_called', 
            trucoLevel: 2, 
            lastCaller: 'player', 
            currentTurn: 'ai' 
        },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 13, maxHierarchy: 13 }, { minHierarchy: 7, maxHierarchy: 7 }, { minHierarchy: 1, maxHierarchy: 1 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.tie_ancho_glimpse',
        baseState: { aiScore: 5, playerScore: 4, trickWinners: ['tie', null, null], currentTrick: 1, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_2' },
        generateHands: () => generateHands({ numCards: 2, minTrucoStrength: 12 }, { numCards: 2 })
    },
    {
        nameKey: 'scenario_tester.scenario_names.brava_mid_chain',
        baseState: { aiScore: 10, playerScore: 9, hasEnvidoBeenCalledThisRound: true, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_1' },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 14, maxHierarchy: 14 }, { minHierarchy: 12, maxHierarchy: 12 }, { minHierarchy: 9, maxHierarchy: 9 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.signal_false_low',
        baseState: { aiScore: 12, playerScore: 11, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_1' },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 13, maxHierarchy: 13 }, { minHierarchy: 6, maxHierarchy: 6 }, { minHierarchy: 2, maxHierarchy: 2 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.post_parda_figure',
        baseState: { aiScore: 6, playerScore: 5, trickWinners: ['tie', null, null], currentTrick: 1, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_2' },
        generateHands: () => generateHands({ numCards: 2, minTrucoStrength: 13 }, { numCards: 2 })
    },
    {
        nameKey: 'scenario_tester.scenario_names.dual_ancho_bait',
        baseState: { aiScore: 2, playerScore: 1, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_1' },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 13, maxHierarchy: 13 }, { minHierarchy: 10, maxHierarchy: 10 }, { minHierarchy: 10, maxHierarchy: 10 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.false_brava_probe',
        baseState: { 
            aiScore: 14, 
            playerScore: 13, 
            gamePhase: 'truco_called', 
            lastCaller: 'player', 
            currentTurn: 'ai',
            trucoLevel: 1
        },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 12, maxHierarchy: 12 }, { minHierarchy: 4, maxHierarchy: 4 }, { minHierarchy: 1, maxHierarchy: 1 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.envido_low_unrelated',
        baseState: { aiScore: 9, playerScore: 8, hasEnvidoBeenCalledThisRound: true, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_1' },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 14, maxHierarchy: 14 }, { minHierarchy: 9, maxHierarchy: 9 }, { minHierarchy: 3, maxHierarchy: 3 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    },
    {
        nameKey: 'scenario_tester.scenario_names.all_tie_mid_hint',
        baseState: { aiScore: 11, playerScore: 10, trickWinners: ['tie', 'tie', null], currentTrick: 2, mano: 'ai', currentTurn: 'ai', gamePhase: 'trick_3' },
        generateHands: () => generateHands({ numCards: 1, minTrucoStrength: 5 }, { numCards: 1 })
    },
    {
        nameKey: 'scenario_tester.scenario_names.clutch_false_deplete',
        baseState: { 
            aiScore: 14, 
            playerScore: 14, 
            gamePhase: 'trick_1', 
            mano: 'ai', 
            currentTurn: 'ai',
            trucoLevel: 3,
            lastCaller: null
        },
        generateHands: () => generateHands({ cardComposition: [{ minHierarchy: 14, maxHierarchy: 14 }, { minHierarchy: 11, maxHierarchy: 11 }, { minHierarchy: 5, maxHierarchy: 5 }], mustNotHaveFlor: true }, { mustNotHaveFlor: true })
    }
];