
import { GameState, ActionType, AiMove } from '../types';
import { findBestCardToPlay } from './ai/playCardStrategy';
import { getEnvidoResponse, getEnvidoCall } from './ai/envidoStrategy';
import { getTrucoResponse, getTrucoCall } from './ai/trucoStrategy';
import { getCardName, getEnvidoDetails, calculateHandStrength } from './trucoLogic';
import { getRandomPhrase, FLOR_PHRASES, ENVIDO_PRIMERO_PHRASES } from './ai/phrases';

export const getLocalAIMove = (state: GameState): AiMove => {
    const { gamePhase, currentTurn, lastCaller, currentTrick, hasEnvidoBeenCalledThisRound, aiHasFlor, playerHasFlor, hasFlorBeenCalledThisRound, playerTricks, aiTricks, trickWinners } = state;
    let reasoning: string[] = [];
    let move: AiMove | null = null;

    // Recap the previous trick if it's not the first trick
    if (currentTrick > 0) {
        const lastTrickIndex = currentTrick - 1;
        const playerCard = playerTricks[lastTrickIndex];
        const aiCard = aiTricks[lastTrickIndex];
        const winner = trickWinners[lastTrickIndex];

        if (playerCard && aiCard && winner) {
            reasoning.push(`[Resumen Mano ${lastTrickIndex + 1}]`);
            reasoning.push(`Jugador jugó: ${getCardName(playerCard)}`);
            reasoning.push(`Yo jugué: ${getCardName(aiCard)}`);
            reasoning.push(`Resultado: ${winner === 'tie' ? 'Empate' : `${winner.toUpperCase()} ganó`}`);
            reasoning.push(`--------------------`);
        }
    }

    const canDeclareFlor = aiHasFlor && !hasFlorBeenCalledThisRound && currentTrick === 0 && state.aiTricks[0] === null;
    if (canDeclareFlor) {
        const blurbText = getRandomPhrase(FLOR_PHRASES);
        return {
            action: { type: ActionType.DECLARE_FLOR, payload: { blurbText } },
            reasoning: "[Lógica de Flor]\n¡Tengo Flor! Debo cantarla para ganar 3 puntos."
        };
    }

    // 1. MUST RESPOND to a player's call
    if (gamePhase.includes('_called') && currentTurn === 'ai' && lastCaller === 'player') {
        reasoning.push(`[Lógica de Respuesta]`);
        reasoning.push(`El jugador cantó ${gamePhase.replace('_called', '').toUpperCase()}. Debo responder.`);

        const canCallEnvidoPrimero = gamePhase === 'truco_called' && currentTrick === 0 && state.playerTricks[0] === null && state.aiTricks[0] === null && !playerHasFlor && !aiHasFlor && !hasEnvidoBeenCalledThisRound;
        if (canCallEnvidoPrimero) {
            const envidoCallDecision = getEnvidoCall(state);
            if (envidoCallDecision) {
                 const blurbText = getRandomPhrase(ENVIDO_PRIMERO_PHRASES);
                 const updatedReasoning = `[Lógica de Envido Primero]\nEl jugador cantó TRUCO, pero invocaré la prioridad del Envido.\n` + envidoCallDecision.reasoning;
                 return { ...envidoCallDecision, reasoning: updatedReasoning, action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } } };
            }
        }

        if (gamePhase.includes('envido')) {
            move = getEnvidoResponse(state, reasoning);
        }
        // FIX: Broadened the condition to include 'vale_cuatro' to correctly handle all truco-related responses.
        if (gamePhase.includes('truco') || gamePhase.includes('vale_cuatro')) {
            move = getTrucoResponse(state, reasoning);
        }
        if (move) return move;
    }

    // 2. DECIDE TO MAKE A CALL
    if (!gamePhase.includes('_called')) {
        let envidoMove: AiMove | null = null;
        let trucoMove: AiMove | null = null;
        
        // Envido can only be called in trick 1 before cards are played, and if no one has flor
        const canCallEnvido = !hasEnvidoBeenCalledThisRound && !hasFlorBeenCalledThisRound && !aiHasFlor && !playerHasFlor && currentTrick === 0 && state.playerTricks[0] === null && state.aiTricks[0] === null;
        if (canCallEnvido) {
            envidoMove = getEnvidoCall(state);
        }
        
        // Truco can be called anytime envido is not active
        if (!gamePhase.includes('envido')) {
            trucoMove = getTrucoCall(state);
        }

        // New strategic decision point: Choose between Envido and Truco
        if (envidoMove && trucoMove) {
            const aiEnvidoDetails = getEnvidoDetails(state.initialAiHand);
            const handStrength = calculateHandStrength(state.initialAiHand);
            
            // With a monster hand, the AI might hide its Envido to set a Truco trap.
            // Hand strength >= 20 is the 90th percentile. Envido >= 31 is very strong.
            if (aiEnvidoDetails.value >= 31 && handStrength >= 20) {
                // 60% chance to prioritize the Truco trap
                if (Math.random() < 0.60) {
                    const reasoning = `[Lógica Estratégica Superior: Sacrificar Envido]\n` +
                                    `Evaluación de Mano Completa:\n` +
                                    `  - Puntos de Envido: ${aiEnvidoDetails.value} (Extremadamente Fuerte).\n` +
                                    `  - Fuerza de Truco: ${handStrength} (Élite).\n` +
                                    `Análisis: Mi mano es un "monstruo" en ambas fases. Cantar un Envido tan alto (que probablemente ganaría) alertaría al jugador de mis cartas altas (como el As de Espadas, 7s, 3s), haciéndolo jugar el Truco con extrema cautela.\n` +
                                    `Decisión Táctica: No cantaré Envido. Sacrificaré la ganancia de puntos del Envido para ocultar mi fuerza y tender una trampa, con el objetivo de ganar más puntos en un Truco posterior.\n` +
                                    `\n--- Procediendo con el plan de Truco ---\n` +
                                    trucoMove.reasoning;
                    return { ...trucoMove, reasoning };
                }
            }
            // By default, a valid Envido call takes precedence.
            return envidoMove;
        }

        if (envidoMove) return envidoMove;
        if (trucoMove) return trucoMove;
    }

    // 3. Just PLAY A CARD
    const cardToPlayResult = findBestCardToPlay(state);
    const finalReasoning = [...reasoning, ...cardToPlayResult.reasoning];
    
    return { 
        action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: cardToPlayResult.index } },
        reasoning: finalReasoning.join('\n')
    };
};
