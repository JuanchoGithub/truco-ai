import { GameState, Card, Suit, Rank, OpponentHandProbabilities, ActionType, Player, MessageObject } from '../types';
import { createDeck, getEnvidoValue, getCardHierarchy, calculateHandStrength } from '../trucoLogic';
import i18nService from '../i18nService';

const FULL_DECK = createDeck();
const ALL_SUITS: Suit[] = ['espadas', 'bastos', 'oros', 'copas'];

// FIX: Added and exported initializeProbabilities, updateProbsOnPlay, and updateProbsOnEnvido to resolve build errors.
function combinations<T>(pool: T[], k: number): T[][] {
    if (k < 0 || k > pool.length) {
        return [];
    }
    if (k === 0) {
        return [[]];
    }
    if (k === pool.length) {
        return [pool];
    }
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

const calculateProbabilitiesFromHands = (validHands: Card[][], k: number): { suitDist: Partial<Record<Suit, number>>, rankProbs: Partial<Record<Rank, number>> } => {
    const suitDist: Partial<Record<Suit, number>> = {};
    const rankProbs: Partial<Record<Rank, number>> = {};

    if (validHands.length === 0) {
        return { suitDist, rankProbs };
    }

    for (const hand of validHands) {
        for (const card of hand) {
            suitDist[card.suit] = (suitDist[card.suit] || 0) + 1;
            rankProbs[card.rank] = (rankProbs[card.rank] || 0) + 1;
        }
    }

    const totalCardsInValidHands = validHands.length * k;
    if (totalCardsInValidHands > 0) {
        for (const suit in suitDist) {
            suitDist[suit as Suit]! /= totalCardsInValidHands;
        }
        for (const rank in rankProbs) {
            rankProbs[rank as unknown as Rank]! /= totalCardsInValidHands;
        }
    }

    return { suitDist, rankProbs };
};


/**
 * Initializes the probability model for the opponent's hand at the start of a round.
 * @param possibleOpponentCards All cards not in the AI's hand.
 * @returns An OpponentHandProbabilities object.
 */
export const initializeProbabilities = (possibleOpponentCards: Card[]): OpponentHandProbabilities => {
    const k = 3;
    const possibleHands = combinations(possibleOpponentCards, k);
    const { suitDist, rankProbs } = calculateProbabilitiesFromHands(possibleHands, k);
    
    return {
        suitDist,
        rankProbs,
        unseenCards: possibleOpponentCards,
    };
};

/**
 * Updates probabilities after the opponent plays a card.
 * @param currentProbs The current probability state.
 * @param playedCard The card the opponent played.
 * @param opponentHandSize The number of cards the opponent has left.
 * @returns The updated OpponentHandProbabilities object.
 */
export const updateProbsOnPlay = (
    currentProbs: OpponentHandProbabilities,
    playedCard: Card,
    opponentHandSize: number
): OpponentHandProbabilities => {
    const newUnseenCards = currentProbs.unseenCards.filter(c =>
        !(c.rank === playedCard.rank && c.suit === playedCard.suit)
    );
    
    if (opponentHandSize <= 0) {
        return { suitDist: {}, rankProbs: {}, unseenCards: newUnseenCards };
    }

    // FIX: Explicitly cast the result of combinations to Card[][] to resolve a chain of type inference errors.
    const possibleHands = combinations(newUnseenCards, opponentHandSize) as Card[][];
    const { suitDist, rankProbs } = calculateProbabilitiesFromHands(possibleHands, opponentHandSize);

    return {
        suitDist,
        rankProbs,
        unseenCards: newUnseenCards,
    };
};

/**
 * Updates opponent hand probabilities based on a declared envido value.
 * This filters the possibilities to only hands that could achieve the score.
 */
export const updateProbsOnEnvido = (
    currentProbs: OpponentHandProbabilities,
    envidoValue: number,
    isOpponentMano: boolean
): OpponentHandProbabilities => {
    const k = 3; // Envido is declared with a full hand of 3
    // FIX: Explicitly cast the result of combinations to Card[][] to resolve a chain of type inference errors, similar to updateProbsOnPlay.
    const possibleHands = combinations(currentProbs.unseenCards, k) as Card[][];
    
    const validHands = possibleHands.filter(hand => getEnvidoValue(hand) === envidoValue);
    if (validHands.length === 0) return currentProbs; // No change if no hands match

    const { suitDist, rankProbs } = calculateProbabilitiesFromHands(validHands, k);

    // FIX: Replaced error-prone JSON stringify/parse method with a type-safe Map to find unique cards.
    // This resolves an error where the resulting array was not correctly typed as Card[].
    const uniqueCards = new Map<string, Card>();
    // FIX: The type assertion was moved to the `combinations` call to fix type inference at the source.
    for (const hand of validHands) {
        for (const card of hand) {
            uniqueCards.set(`${card.rank}-${card.suit}`, card);
        }
    }
    const validUnseenCards = Array.from(uniqueCards.values());

    return {
        suitDist,
        rankProbs,
        unseenCards: validUnseenCards,
    };
};

/**
 * Generates plausible opponent hands based on all known constraints, bucketed by strength.
 * This is used for Monte Carlo simulation in the truco strategy.
 * @param state The current game state.
 * @param reasoning An array of strings to log the AI's thought process, passed by reference.
 * @returns An object with `strong`, `medium`, and `weak` hands.
 */
export const generateConstrainedOpponentHand = (
    state: GameState, 
    reasoning: (string | MessageObject)[],
    numSamples: { strong: number; medium: number; weak: number }
): { strong: Card[][]; medium: Card[][]; weak: Card[][] } => {
    const { t } = i18nService;
    const { playerEnvidoValue, initialPlayerHand, playerHand, playedCards, aiHand, playerHasFlor, currentTrick, mano, hasEnvidoBeenCalledThisRound, playerTricks, gamePhase, lastCaller, playerTrucoCallHistory } = state;
    
    const cardsToGenerate = playerHand.length;
    if (cardsToGenerate === 0) {
        return { strong: [], medium: [], weak: [] };
    }

    const knownImpossibleCards = [...aiHand, ...playedCards];
    const unseenCards = FULL_DECK.filter(deckCard => 
        !knownImpossibleCards.some(knownCard => knownCard.rank === deckCard.rank && knownCard.suit === deckCard.suit)
    );
    
    const playerPlayedCards = initialPlayerHand.filter(c => !playerHand.some(h => h.rank === c.rank && h.suit === c.suit));

    let validOpponentHands: Card[][] = [];

    // 1. Flor Constraint (strongest)
    if (playerHasFlor) {
        reasoning.push(t('ai_logic.inference_flor'));
        if (playerPlayedCards.length > 1 && !playerPlayedCards.every(c => c.suit === playerPlayedCards[0].suit)) {
            reasoning.push(t('ai_logic.inference_flor_contradiction'));
        } else {
            const florSuit = playerPlayedCards.length > 0 ? playerPlayedCards[0].suit : null;
            const suitsToTest = florSuit ? [florSuit] : ALL_SUITS;

            for (const suit of suitsToTest) {
                const unseenOfSuit = unseenCards.filter(c => c.suit === suit);
                if (unseenOfSuit.length < cardsToGenerate) continue;

                const possibleFlorRemainders = combinations(unseenOfSuit, cardsToGenerate);
                for (const remainder of possibleFlorRemainders) {
                    const fullHand = [...playerPlayedCards, ...remainder];
                    if (fullHand.length === 3 && fullHand.every(c => c.suit === suit)) {
                        if (playerEnvidoValue === null || getEnvidoValue(fullHand) === playerEnvidoValue) {
                            validOpponentHands.push(remainder);
                        }
                    }
                }
            }
            if (validOpponentHands.length > 0) {
                reasoning.push(t('ai_logic.inference_flor_hypothesis', { count: validOpponentHands.length }));
            }
        }
    }
    
    // 2. Envido Constraint (if no valid flor hands were found)
    if (validOpponentHands.length === 0 && playerEnvidoValue !== null) {
        reasoning.push(t('ai_logic.inference_envido', { points: playerEnvidoValue }));
        const cardsToFind = 3 - playerPlayedCards.length;
        if (cardsToFind > 0) {
            const possibleRemainders = combinations(unseenCards, cardsToFind);
            for (const remainder of possibleRemainders) {
                const fullHand = [...playerPlayedCards, ...remainder];
                if (getEnvidoValue(fullHand) === playerEnvidoValue) {
                    validOpponentHands.push(remainder);
                }
            }
        }
        if (validOpponentHands.length > 0) {
            reasoning.push(t('ai_logic.inference_envido_hypothesis', { count: validOpponentHands.length }));
        }
    }

    // 3. Behavioral Truco Constraint
    const isRespondingToPlayerTruco = gamePhase === 'truco_called' && lastCaller === 'player' && currentTrick === 0;
    if (validOpponentHands.length === 0 && isRespondingToPlayerTruco) {
        const relevantHistory = playerTrucoCallHistory;
        
        // Use historical data if available
        if (relevantHistory && relevantHistory.length > 1) {
            const totalStrength = relevantHistory.reduce((sum, entry) => sum + entry.strength, 0);
            const avgStrength = totalStrength / relevantHistory.length;
            const mean = avgStrength;
            const stdDev = Math.sqrt(relevantHistory.map(entry => Math.pow(entry.strength - mean, 2)).reduce((a, b) => a + b) / relevantHistory.length);
            
            const strengthRange = { min: Math.max(0, avgStrength - stdDev * 1.5), max: avgStrength + stdDev * 1.5 };
            reasoning.push(t('ai_logic.inference_truco_behavioral', {
                avgStrength: avgStrength.toFixed(1),
                stdDev: stdDev.toFixed(1),
                min: strengthRange.min.toFixed(0),
                max: strengthRange.max.toFixed(0)
            }));

            const possibleRemainders = combinations(unseenCards, cardsToGenerate);
            const behaviorallyValidHands = [];
            for (const remainder of possibleRemainders) {
                const fullHand = [...playerPlayedCards, ...remainder];
                const handStrength = calculateHandStrength(fullHand);
                if (handStrength >= strengthRange.min && handStrength <= strengthRange.max) {
                     behaviorallyValidHands.push(remainder);
                }
            }
            if (behaviorallyValidHands.length > 0) {
                validOpponentHands = behaviorallyValidHands;
                reasoning.push(t('ai_logic.inference_truco_hypothesis', { count: validOpponentHands.length }));
            } else {
                reasoning.push(t('ai_logic.inference_truco_hypothesis_failed'));
            }
        } else {
            // Fallback to general strategy for early truco calls if no history
            reasoning.push(t('ai_logic.inference_truco_early'));
    
            const possibleRemainders = combinations(unseenCards, cardsToGenerate);
            const behaviorallyValidHands = [];
            
            for (const remainder of possibleRemainders) {
                const fullHand = [...playerPlayedCards, ...remainder];
                // Using the 50th percentile strength (11) as a minimum threshold for an early call
                if (calculateHandStrength(fullHand) >= 11) {
                     behaviorallyValidHands.push(remainder);
                }
            }
            
            if (behaviorallyValidHands.length > 0) {
                validOpponentHands = behaviorallyValidHands;
                reasoning.push(t('ai_logic.inference_truco_early_hypothesis', { count: validOpponentHands.length }));
            } else {
                reasoning.push(t('ai_logic.inference_truco_early_hypothesis_failed'));
            }
        }
    }
    
    let allPossibleHands: Card[][] = [];

    if (validOpponentHands.length > 0) {
        allPossibleHands = validOpponentHands;
    } else {
        reasoning.push(t('ai_logic.inference_general', { count: unseenCards.length }));
        if (unseenCards.length < cardsToGenerate) {
            reasoning.push(t('ai_logic.inference_error_not_enough_cards'));
            return { strong: [], medium: [], weak: [] };
        }
        allPossibleHands = combinations(unseenCards, cardsToGenerate);
    }
    
    // 4. Envido inference from player inaction.
    // This is applied *after* other constraints have been (or failed to be) applied.
    const envidoOpportunityPassed =
        currentTrick === 0 &&
        !hasEnvidoBeenCalledThisRound &&
        !playerHasFlor &&
        playerTricks[0] !== null; // Player has played a card in trick 1 without calling envido

    if (validOpponentHands.length === 0 && envidoOpportunityPassed) {
        reasoning.push(t('ai_logic.inference_envido_passive'));
        const playerContext = mano === 'player' ? 'mano' : 'pie';
        const callThreshold = state.opponentModel.envidoBehavior[playerContext].callThreshold;
        reasoning.push(t('ai_logic.inference_envido_passive_threshold', { threshold: callThreshold.toFixed(0) }));
        
        const filteredHands = allPossibleHands.filter(hand => {
            const fullHand = [...playerPlayedCards, ...hand];
            const envidoValue = getEnvidoValue(fullHand);
            
            // A player might bait with a very high envido, so we keep a small chance for that.
            if (envidoValue > callThreshold + 2) {
                return Math.random() < 0.1; // 10% chance to keep a hand well above their usual call threshold (represents baiting)
            }
            // They might also stretch their call threshold sometimes.
            if (envidoValue > callThreshold) {
                return Math.random() < 0.3; // 30% chance to keep a hand just above their threshold
            }
            return true; // Keep all hands below the threshold
        });

        // Only apply the filter if it doesn't drastically reduce the sample size, which could lead to bias.
        if (filteredHands.length > Math.min(10, allPossibleHands.length * 0.1)) {
            reasoning.push(t('ai_logic.inference_envido_passive_filter', {
                threshold: callThreshold.toFixed(0),
                before: allPossibleHands.length,
                after: filteredHands.length
            }));
            allPossibleHands = filteredHands;
        } else {
            reasoning.push(t('ai_logic.inference_envido_passive_filter_failed'));
        }
    }


    if (allPossibleHands.length === 0) {
        reasoning.push(t('ai_logic.inference_error_no_hands'));
        return { strong: [], medium: [], weak: [] };
    }

    // --- NEW STRATIFIED SAMPLING LOGIC ---

    // 1. Sort all possible hands by strength (weakest to strongest)
    const sortedHands = allPossibleHands
        .map(hand => ({ hand, strength: calculateHandStrength(hand) }))
        .sort((a, b) => a.strength - b.strength)
        .map(item => item.hand);

    const totalHands = sortedHands.length;

    // 2. Define strata (deciles)
    const decileSize = Math.max(1, Math.ceil(totalHands / 10)); // Ensure decileSize is at least 1
    const deciles: Card[][][] = [];
    for (let i = 0; i < 10; i++) {
        const start = i * decileSize;
        const end = Math.min(start + decileSize, totalHands);
        deciles.push(sortedHands.slice(start, end));
    }
    
    // Helper to randomly sample unique hands from a pool
    const sampleFromPool = (pool: Card[][], count: number): Card[][] => {
        if (!pool || pool.length === 0) return [];
        // Make a copy and shuffle it to get random unique samples
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        // Return either the requested count or the entire pool if it's smaller
        return shuffled.slice(0, Math.min(count, shuffled.length));
    };
    
    // 3. Sample from strata with fallbacks
    let strongSamples: Card[][], mediumSamples: Card[][], weakSamples: Card[][];

    // Strong hand samples (Decile 10, index 9)
    const strongPool = deciles[9] || [];
    strongSamples = sampleFromPool(strongPool, numSamples.strong);
    // Fallback: if no samples and hands exist, add the absolute strongest hand
    if (strongSamples.length === 0 && totalHands > 0) {
        strongSamples.push(sortedHands[totalHands - 1]);
    }

    // Medium hand samples (Deciles 4, 5, 6 -> indices 3, 4, 5)
    const mediumPool = [...(deciles[3] || []), ...(deciles[4] || []), ...(deciles[5] || [])];
    mediumSamples = sampleFromPool(mediumPool, numSamples.medium);
    // Fallback: if no samples and hands exist, add the median hand
    if (mediumSamples.length === 0 && totalHands > 0) {
        mediumSamples.push(sortedHands[Math.floor(totalHands / 2)]);
    }

    // Weak hand samples (Deciles 1, 2 -> indices 0, 1)
    const weakPool = [...(deciles[0] || []), ...(deciles[1] || [])];
    weakSamples = sampleFromPool(weakPool, numSamples.weak);
    // Fallback: if no samples and hands exist, add the absolute weakest hand
    if (weakSamples.length === 0 && totalHands > 0) {
        weakSamples.push(sortedHands[0]);
    }
    
    // 4. Update reasoning log and return
    reasoning.push(t('ai_logic.inference_stratified_samples', {
        strong: strongSamples.length,
        medium: mediumSamples.length,
        weak: weakSamples.length
    }));

    return {
        strong: strongSamples,
        medium: mediumSamples,
        weak: weakSamples,
    };
};
