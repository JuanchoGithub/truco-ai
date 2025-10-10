

import { AiMove, GameState, ActionType, Card } from '../types';
import { getCardName, getEnvidoValue } from './trucoLogic';
import { findBestCardToPlay } from './ai/playCardStrategy';

function createMirroredState(currentState: GameState): GameState {
    const mirroredTrickWinners = currentState.trickWinners.map(winner => {
        if (winner === 'player') return 'ai';
        if (winner === 'ai') return 'player';
        return winner; // 'tie' or null
    });

    const mirroredState: GameState = {
        ...currentState,
        playerHand: currentState.aiHand,
        aiHand: currentState.playerHand,
        initialPlayerHand: currentState.initialAiHand,
        initialAiHand: currentState.initialPlayerHand,
        playerTricks: currentState.aiTricks,
        aiTricks: currentState.playerTricks,
        trickWinners: mirroredTrickWinners,
        playerScore: currentState.aiScore,
        aiScore: currentState.playerScore,
        currentTurn: 'ai', // From the perspective of the AI playing as the player
        playerHasFlor: currentState.aiHasFlor,
        aiHasFlor: currentState.playerHasFlor,
        mano: currentState.mano === 'player' ? 'ai' : 'player',
        lastRoundWinner: currentState.lastRoundWinner === 'player' ? 'ai' : currentState.lastRoundWinner === 'ai' ? 'player' : currentState.lastRoundWinner,
        lastCaller: currentState.lastCaller === 'player' ? 'ai' : (currentState.lastCaller === 'ai' ? 'player' : null),
        turnBeforeInterrupt: currentState.turnBeforeInterrupt === 'player' ? 'ai' : (currentState.turnBeforeInterrupt === 'ai' ? 'player' : null),
        pendingTrucoCaller: currentState.pendingTrucoCaller === 'player' ? 'ai' : (currentState.pendingTrucoCaller === 'ai' ? 'player' : null),
        playerEnvidoValue: currentState.aiEnvidoValue,
        aiEnvidoValue: currentState.playerEnvidoValue,
    };
    return mirroredState;
}

// This function provides a simple, direct text for a move.
export const getSimpleSuggestionText = (move: AiMove, playerHand: Card[]): string => {
    const { action } = move;
    switch (action.type) {
        case ActionType.PLAY_CARD:
            const cardIndex = action.payload.cardIndex;
            // The suggestion is generated from a mirrored state, so the `cardIndex` corresponds to the player's actual hand.
            if (playerHand[cardIndex]) {
                return `Jugar el ${getCardName(playerHand[cardIndex])}.`;
            }
            return "Jugar una carta.";
        case ActionType.CALL_ENVIDO: return "Cantar 'Envido'.";
        case ActionType.CALL_REAL_ENVIDO: return "Cantar 'Real Envido'.";
        case ActionType.CALL_FALTA_ENVIDO: return "Cantar 'Falta Envido'.";
        case ActionType.DECLARE_FLOR: return "Cantar 'Flor'.";
        case ActionType.CALL_TRUCO: return "Cantar 'Truco'.";
        case ActionType.CALL_RETRUCO: return "Cantar 'Retruco'.";
        case ActionType.CALL_VALE_CUATRO: return "Cantar 'Vale Cuatro'.";
        case ActionType.ACCEPT: return "Decir 'Quiero'.";
        case ActionType.DECLINE: return "Decir 'No Quiero'.";
        case ActionType.RESPOND_TO_ENVIDO_WITH_FLOR: return "Responder con 'Flor'.";
        case ActionType.ACKNOWLEDGE_FLOR: return "Reconocer la flor ('Son buenas').";
        case ActionType.CALL_CONTRAFLOR: return "Cantar 'Contraflor'.";
        case ActionType.ACCEPT_CONTRAFLOR: return "Aceptar con 'Con Flor Quiero'.";
        case ActionType.DECLINE_CONTRAFLOR: return "Rechazar con 'Con Flor me achico'.";
        default: return "Considerar el siguiente movimiento.";
    }
};

const summarizeHand = (hand: Card[]): string => {
    if (hand.length === 0) return "No nos quedan cartas.";
    if (hand.length === 1) return `Nuestra última carta es el ${getCardName(hand[0])}.`;
    return `Nos quedan: ${hand.map(getCardName).join(' y ')}.`;
}

// New helper function to describe envido strength
function getEnvidoStrengthText(points: number): string {
    if (points >= 30) return "un puntaje excelente";
    if (points >= 27) return "un buen puntaje";
    if (points >= 24) return "un puntaje decente";
    return "un puntaje bajo";
}

// New helper to create a safe card play alternative text
function getSafeCardPlayAlternative(state: GameState): string {
    try {
        const mirroredStateForSafePlay = createMirroredState(state);
        const safePlay = findBestCardToPlay(mirroredStateForSafePlay);
        const cardToPlay = state.playerHand[safePlay.index];
        if (cardToPlay) {
            return ` Si no te animás, la jugada más segura es tirar el ${getCardName(cardToPlay)}.`;
        }
        return "";
    } catch (error) {
        console.error("Error generating safe play alternative:", error);
        return "";
    }
}

// This function generates a more conversational, strategic summary.
export const generateSuggestionSummary = (move: AiMove, state: GameState): string => {
    const { action, reasoning } = move;
    const { playerHand, gamePhase, round, roundHistory, initialPlayerHand } = state;

    // FIX: Calculate envido points directly from the player's initial hand to ensure accuracy for the assistant,
    // avoiding any potential stale or incorrect data in roundHistory.
    const playerEnvidoPoints = getEnvidoValue(initialPlayerHand);
    const isResponding = gamePhase.includes('_called');
    const alternativePlayText = getSafeCardPlayAlternative(state);

    if (isResponding) {
        // --- Specific logic for responding to AI calls ---
        if (action.type === ActionType.ACCEPT) {
            if (gamePhase.includes('envido')) {
                if (reasoning.includes("Las probabilidades están a mi favor")) {
                    return `Tenemos ${playerEnvidoPoints} puntos. La IA cantó, pero nuestras chances de ganar son buenas. Deberíamos aceptar con 'Quiero'.`;
                }
                if (reasoning.includes("podría ser un farol")) {
                    return `Tenemos ${playerEnvidoPoints} puntos. Es arriesgado, pero la IA podría estar de farol. Podemos 'Querer' para ver sus cartas.`;
                }
                return `La IA nos desafía, y nosotros tenemos ${playerEnvidoPoints} puntos. La recomendación es aceptar con 'Quiero'.`;
            }
            if (gamePhase.includes('truco')) {
                 if (reasoning.includes("Mi mano es sólida") || reasoning.includes("La equidad es aceptable")) {
                    return `Nuestra mano es lo suficientemente buena como para competir. Deberíamos aceptar el desafío del Truco con 'Quiero'.`;
                }
                if (reasoning.includes("oponente podría estar faroleando")) {
                    return `Aunque nuestra mano no es ideal, la IA podría estar mintiendo. Acepta con 'Quiero' para no dejar que nos intimide.`;
                }
                return `La IA subió la apuesta. La sugerencia es aceptar el desafío con 'Quiero'.`;
            }
        }

        if (action.type === ActionType.DECLINE) {
            if (gamePhase.includes('envido')) {
                if (reasoning.includes("El riesgo es muy alto") || reasoning.includes("Mi mano parece más débil")) {
                    return `Tenemos ${playerEnvidoPoints} puntos, pero la IA cantó fuerte, y es probable que tengan más. Lo más seguro es retirarse con 'No Quiero'.`;
                }
                return `Nuestros ${playerEnvidoPoints} puntos de envido probablemente no son suficientes. Es mejor decir 'No Quiero' para no perder puntos.`;
            }
            if (gamePhase.includes('truco')) {
                if (reasoning.includes("La equidad es muy baja") || reasoning.includes("Mi mano es débil") || reasoning.includes("casi nula")) {
                    return `Nuestra mano es demasiado débil para este desafío. La mejor jugada es retirarse con 'No Quiero' para minimizar la pérdida de puntos.`;
                }
                return `La IA subió la apuesta y no tenemos cartas para competir. Es mejor decir 'No Quiero'.`;
            }
        }

        if (action.type === ActionType.CALL_RETRUCO || action.type === ActionType.CALL_VALE_CUATRO) {
            const callType = action.type.replace('CALL_', '').replace('_', ' ');
            if (reasoning.includes("Mi mano es de élite") || reasoning.includes("La equidad es muy alta") || reasoning.includes("escalando agresivamente")) {
                return `¡Nuestra mano es excelente! La IA cantó Truco, pero podemos redoblar la apuesta con '${callType}' porque tenemos muchas chances de ganar.${alternativePlayText}`;
            }
             if (reasoning.includes("farol de desesperación") || reasoning.includes("farol agresivo")) {
                return `Estamos en una mala posición, pero podemos intentar un farol arriesgado. Sube la apuesta a '${callType}' para ver si logramos que la IA se retire.${alternativePlayText}`;
            }
            return `Tenemos una mano muy fuerte. Es un buen momento para responder al Truco de la IA con un '${callType}'.${alternativePlayText}`;
        }
        
        if (action.type === ActionType.CALL_REAL_ENVIDO || action.type === ActionType.CALL_FALTA_ENVIDO || (action.type === ActionType.CALL_ENVIDO && isResponding)) {
            const callType = action.type.replace('CALL_', '').replace('_', ' ');
            const strengthText = getEnvidoStrengthText(playerEnvidoPoints);

            // Case 1: Responding to TRUCO with Envido Primero
            if (gamePhase === 'truco_called' && action.type === ActionType.CALL_ENVIDO) {
                const isBluff = /farol|mano.*débil/i.test(reasoning);
                if (isBluff) {
                    return `La IA cantó Truco, pero podemos interrumpir con 'Envido Primero'. Aunque nuestros ${playerEnvidoPoints} puntos son bajos, es un buen farol.${alternativePlayText}`;
                }
                const opponentCardPlayed = state.aiTricks[0];
                const context = opponentCardPlayed ? `Después de que la IA jugara el ${getCardName(opponentCardPlayed)}, ` : "";
                return `${context}la IA cantó Truco. Tenemos ${playerEnvidoPoints} de envido (${strengthText}), así que deberíamos interrumpir con 'Envido Primero' para reclamar esos puntos.`;
            }

            // Case 2: Responding to ENVIDO with another Envido call
            if (reasoning.includes("Mi mano es mucho más fuerte")) {
                return `¡Tenemos ${playerEnvidoPoints} puntos, ${strengthText}! La IA cree que tiene una buena mano, pero la nuestra es superior. Deberíamos redoblar la apuesta con '${callType}'.${alternativePlayText}`;
            }
            
            // Fallback for responding to Envido.
            return `Tenemos ${playerEnvidoPoints} puntos (${strengthText}). La sugerencia es responder al 'Envido' de la IA subiendo la apuesta a '${callType}'.${alternativePlayText}`;
        }
    }

    // --- Logic for proactive moves ---

    // --- Truco call ---
    if (action.type === ActionType.CALL_TRUCO || action.type === ActionType.CALL_RETRUCO || action.type === ActionType.CALL_VALE_CUATRO) {
        if (reasoning.includes("Parda y Gano")) {
            return "¡Jugada clave! La primera mano fue empate. Si ganas esta, ganas la ronda. Cantar 'Truco' es una jugada sin riesgo: si se retiran, ganas 1 punto. Si aceptan, ¡ganas 2!";
        }

        let isBluff = false;
        // Check for the explicit bluff flag in the action payload first for reliability
        if ('payload' in action && action.payload && 'trucoContext' in action.payload && action.payload.trucoContext) {
            isBluff = action.payload.trucoContext.isBluff;
        } else {
            // Fallback to reasoning string if context is missing for some reason
            isBluff = /farol|bluff|mano.*débil/i.test(reasoning);
        }

        const callType = action.type.replace('CALL_', '').replace('_',' ');

        if (isBluff) {
            return `Nuestra mano es débil, pero podemos intentar un farol cantando '${callType}'.${alternativePlayText}`;
        } else {
            return `¡Tenemos una mano muy fuerte! Es el momento ideal para cantar '${callType}' y aumentar el valor de la ronda.${alternativePlayText}`;
        }
    }

    // --- Envido call ---
    if (action.type === ActionType.CALL_ENVIDO || action.type === ActionType.CALL_REAL_ENVIDO || action.type === ActionType.CALL_FALTA_ENVIDO) {
        const callType = action.type.replace('CALL_', '').replace('_', ' ');
        
        const isBluff = /farol|mano.*débil/i.test(reasoning);

        if (isBluff) {
             const foldRateMatch = reasoning.match(/tasa de abandono.* ([\d\.]+)%/);
             let opponentInfo = "la IA podría retirarse.";
             if (foldRateMatch && foldRateMatch[1]) {
                 opponentInfo = `la IA tiene una probabilidad de retirarse del ${foldRateMatch[1]}%.`;
             }
             return `Tenemos solo ${playerEnvidoPoints} puntos de envido, que es bajo. Sin embargo, ${opponentInfo} Podemos intentar un farol (bluff) cantando '${callType}'.${alternativePlayText}`;
        }
        const strengthText = getEnvidoStrengthText(playerEnvidoPoints);
        return `¡Tenemos ${playerEnvidoPoints} de envido! Es ${strengthText}, deberíamos cantar '${callType}'.${alternativePlayText}`;
    }

    // --- Playing a card ---
    if (action.type === ActionType.PLAY_CARD) {
        const cardIndex = action.payload.cardIndex;
        const card = playerHand[cardIndex];
        if (!card) return getSimpleSuggestionText(move, playerHand);

        let strategicReason = "";
        if (reasoning.includes("carta más alta")) {
            strategicReason = "para asegurar la mano.";
        } else if (reasoning.includes("carta más baja para ver qué tiene")) {
            strategicReason = "para ver qué juega la IA sin arriesgar una carta buena.";
        } else if (reasoning.includes("carta ganadora de ronda más débil")) {
            strategicReason = "para ganar la ronda gastando lo mínimo.";
        } else if (reasoning.includes("Descartaré mi carta más baja")) {
            strategicReason = "porque no podemos ganar esta mano y es mejor guardar las otras.";
        } else if (reasoning.includes("Parda y Canto")) {
            strategicReason = "para empatar, ocultar nuestra carta más fuerte y poder cantar Truco después.";
        } else {
            strategicReason = "según la estrategia de la IA.";
        }
        
        return `La mejor jugada es tirar el ${getCardName(card)} ${strategicReason}`;
    }
    
    // Fallback for actions not yet covered (like flor, which is self-explanatory)
    return getSimpleSuggestionText(move, playerHand);
};