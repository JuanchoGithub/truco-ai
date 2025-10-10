
import { GameState, Card, Suit, Rank, OpponentHandProbabilities, ActionType, Player } from '../../types';
import { createDeck, getEnvidoValue, getCardHierarchy, calculateHandStrength } from '../trucoLogic';

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

    const possibleHands = combinations(newUnseenCards, opponentHandSize);
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
    const possibleHands = combinations(currentProbs.unseenCards, k);
    
    const validHands = possibleHands.filter(hand => getEnvidoValue(hand) === envidoValue);
    if (validHands.length === 0) return currentProbs; // No change if no hands match

    const { suitDist, rankProbs } = calculateProbabilitiesFromHands(validHands, k);

    // Filter unseen to only include cards that appear in at least one valid hand
    const validUnseenCards = Array.from(new Set(validHands.flat().map(c => JSON.stringify(c)))).map(s => JSON.parse(s));

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
    reasoning: string[]
): { strong: Card[]; medium: Card[]; weak: Card[] } => {
    const { playerEnvidoValue, initialPlayerHand, playerHand, playedCards, aiHand, playerHasFlor, currentTrick, mano, trickWinners, aiTricks, playerTricks, gamePhase, lastCaller, playerTrucoCallHistory } = state;
    
    const cardsToGenerate = playerHand.length;
    if (cardsToGenerate === 0) {
        return { strong: [], medium: [], weak: [] };
    }

    const knownImpossibleCards = [...aiHand, ...playedCards];
    let unseenCards = FULL_DECK.filter(deckCard => 
        !knownImpossibleCards.some(knownCard => knownCard.rank === deckCard.rank && knownCard.suit === deckCard.suit)
    );
    
    const playerPlayedCards = initialPlayerHand.filter(c => !playerHand.some(h => h.rank === c.rank && h.suit === c.suit));

    // 1. Suit-Following Constraint
    const voidedSuits = new Set<Suit>();
    for (let i = 0; i < currentTrick; i++) {
        let leader: Player = mano;
        for (let j = 0; j < i; j++) {
            const winner = trickWinners[j];
            if (winner && winner !== 'tie') {
                leader = winner;
            }
        }
        if (leader === 'ai' && aiTricks[i] && playerTricks[i]) {
            const leadCard = aiTricks[i]!;
            const playerCard = playerTricks[i]!;
            if (playerCard.suit !== leadCard.suit) {
                voidedSuits.add(leadCard.suit);
            }
        }
    }

    if (voidedSuits.size > 0) {
        reasoning.push(`- Inferencia de Palo: El jugador no tiene ${[...voidedSuits].join(', ')}.`);
        unseenCards = unseenCards.filter(c => !voidedSuits.has(c.suit));
    }
    
    let validOpponentHands: Card[][] = [];

    // 2. Flor Constraint (strongest)
    if (playerHasFlor) {
        reasoning.push('- Inferencia de Flor: La mano del jugador es de un solo palo.');
        if (playerPlayedCards.length > 1 && !playerPlayedCards.every(c => c.suit === playerPlayedCards[0].suit)) {
            reasoning.push('- Contradicción en Flor: Cartas jugadas de palos mixtos. Ignorando Flor.');
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
                reasoning.push(`- Hipótesis de Flor: ${validOpponentHands.length} manos posibles.`);
            }
        }
    }
    
    // 3. Envido Constraint (if no valid flor hands were found)
    if (validOpponentHands.length === 0 && playerEnvidoValue !== null) {
        reasoning.push(`- Inferencia de Envido: El jugador declaró ${playerEnvidoValue} puntos.`);
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
            reasoning.push(`- Hipótesis de Envido: ${validOpponentHands.length} manos posibles.`);
        }
    }

    // 4. Behavioral Truco Constraint
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
            reasoning.push(`- Inferencia de Comportamiento (Truco): El jugador cantó Truco. Basado en su historial (fuerza prom: ${avgStrength.toFixed(1)} ± ${stdDev.toFixed(1)}), su mano probable tiene una fuerza entre ${strengthRange.min.toFixed(0)} y ${strengthRange.max.toFixed(0)}.`);

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
                reasoning.push(`- Hipótesis de Truco: ${validOpponentHands.length} manos posibles que coinciden con el perfil de Truco del jugador.`);
            } else {
                reasoning.push(`- Hipótesis de Truco Fallida: Ninguna mano posible coincide. Puede ser un comportamiento atípico. Volviendo a la inferencia general.`);
            }
        } else {
            // Fallback to general strategy for early truco calls if no history
            reasoning.push(`- Inferencia de Comportamiento (Truco Temprano): El jugador cantó Truco en la primera mano sin historial previo. Asumo que tienen una mano por encima del promedio (percentil >50).`);
    
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
                reasoning.push(`- Hipótesis de Truco Temprano: ${validOpponentHands.length} manos posibles que coinciden con un perfil de Truco fuerte.`);
            } else {
                reasoning.push(`- Hipótesis de Truco Temprano Fallida: Ninguna mano fuerte posible. Puede ser un farol. Volviendo a la inferencia general.`);
            }
        }
    }
    
    let allPossibleHands: Card[][] = [];

    if (validOpponentHands.length > 0) {
        allPossibleHands = validOpponentHands;
    } else {
        reasoning.push(`- Inferencia General: No hay información específica. Generando todas las combinaciones desde ${unseenCards.length} cartas desconocidas.`);
        if (unseenCards.length < cardsToGenerate) {
            reasoning.push(`- Error de Simulación: No hay suficientes cartas desconocidas para generar una mano.`);
            return { strong: [], medium: [], weak: [] };
        }
        allPossibleHands = combinations(unseenCards, cardsToGenerate);
    }

    if (allPossibleHands.length === 0) {
        reasoning.push(`- Error de Simulación: No se pudieron generar manos de oponente.`);
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

    // 3. Sample from strata with fallbacks
    let strongHand: Card[], mediumHand: Card[], weakHand: Card[];

    // Strong hand (Decile 10, which is index 9)
    const strongPool = deciles[9];
    if (strongPool && strongPool.length > 0) {
        strongHand = strongPool[Math.floor(Math.random() * strongPool.length)];
    } else {
        // Fallback: get the absolute strongest hand
        strongHand = sortedHands[totalHands - 1];
    }

    // Medium hand (Deciles 4, 5, 6 -> indices 3, 4, 5)
    const mediumPool = [...(deciles[3] || []), ...(deciles[4] || []), ...(deciles[5] || [])];
    if (mediumPool.length > 0) {
        mediumHand = mediumPool[Math.floor(Math.random() * mediumPool.length)];
    } else {
        // Fallback: get the median hand
        mediumHand = sortedHands[Math.floor(totalHands / 2)];
    }

    // Weak hand (Deciles 1, 2 -> indices 0, 1)
    const weakPool = [...(deciles[0] || []), ...(deciles[1] || [])];
    if (weakPool.length > 0) {
        weakHand = weakPool[Math.floor(Math.random() * weakPool.length)];
    } else {
        // Fallback: get the absolute weakest hand
        weakHand = sortedHands[0];
    }
    
    // Ensure hands are defined even in extreme edge cases (e.g., only 1 possible hand)
    if (!strongHand) strongHand = sortedHands[totalHands-1];
    if (!mediumHand) mediumHand = sortedHands[Math.floor(totalHands / 2)];
    if (!weakHand) weakHand = sortedHands[0];
    
    // 4. Update reasoning log and return
    const strongStrength = calculateHandStrength(strongHand);
    const mediumStrength = calculateHandStrength(mediumHand);
    const weakStrength = calculateHandStrength(weakHand);
    reasoning.push(`- Muestras de Manos (Estratificado): [Fuerte: ${strongStrength}, Media: ${mediumStrength}, Débil: ${weakStrength}].`);

    return {
        strong: strongHand,
        medium: mediumHand,
        weak: weakHand,
    };
};
