

import { GameState, ActionType, AiMove } from '../types';
import { findBestCardToPlay } from './ai/playCardStrategy';
import { getEnvidoResponse, getEnvidoCall, getFlorResponse, getFlorCallOrEnvidoCall } from './ai/envidoStrategy';
import { getTrucoResponse, getTrucoCall } from './ai/trucoStrategy';
import { getCardName, getEnvidoDetails, calculateHandStrength } from './trucoLogic';
import { getRandomPhrase, FLOR_PHRASES, ENVIDO_PRIMERO_PHRASES, QUIERO_PHRASES, NO_QUIERO_PHRASES } from './ai/phrases';

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

    // 1. MUST RESPOND to a player's call
    if (gamePhase.includes('_called') && currentTurn === 'ai' && lastCaller === 'player') {
        reasoning.push(`[Lógica de Respuesta]`);
        reasoning.push(`El jugador cantó ${gamePhase.replace('_called', '').toUpperCase()}. Debo responder.`);

        // Flor response logic
        if (gamePhase === 'flor_called' || gamePhase === 'contraflor_called') {
            move = getFlorResponse(state, reasoning);
            if (move) return move;
        }

        const canCallEnvidoPrimero = gamePhase === 'truco_called' && currentTrick === 0 && state.playerTricks[0] === null && state.aiTricks[0] === null && !hasEnvidoBeenCalledThisRound;
        if (canCallEnvidoPrimero) {
            // If AI has flor, it must respond with flor to envido/truco.
            if (aiHasFlor) {
                const blurbText = getRandomPhrase(FLOR_PHRASES);
                return {
                    action: { type: ActionType.RESPOND_TO_ENVIDO_WITH_FLOR, payload: { blurbText } },
                    reasoning: "[Lógica de Prioridad: Flor]\nEl jugador cantó TRUCO, pero mi Flor tiene prioridad. Debo declararla."
                };
            }
            const envidoCallDecision = getEnvidoCall(state);
            if (envidoCallDecision) {
                 const blurbText = getRandomPhrase(ENVIDO_PRIMERO_PHRASES);
                 const updatedReasoning = `[Lógica de Envido Primero]\nEl jugador cantó TRUCO, pero invocaré la prioridad del Envido.\n` + envidoCallDecision.reasoning;
                 return { ...envidoCallDecision, reasoning: updatedReasoning, action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } } };
            }
        }
        
        if (gamePhase === 'envido_called') {
            // Check for Flor response to Envido
            if (aiHasFlor) {
                const blurbText = getRandomPhrase(FLOR_PHRASES);
                return {
                    action: { type: ActionType.RESPOND_TO_ENVIDO_WITH_FLOR, payload: { blurbText } },
                    reasoning: "[Lógica de Prioridad: Flor]\nEl jugador cantó Envido. Mi Flor lo anula y gana 3 puntos."
                };
            }
            move = getEnvidoResponse(state, reasoning);
        }

        if (gamePhase.includes('truco') || gamePhase.includes('vale_cuatro')) {
            move = getTrucoResponse(state, reasoning);
        }
        if (move) return move;
    }

    // 2. DECIDE TO MAKE A CALL
    if (!gamePhase.includes('_called')) {
        let singingMove: AiMove | null = null;
        let trucoMove: AiMove | null = null;
        
        // Envido/Flor can only be called in trick 1 before cards are played.
        const canSing = !hasEnvidoBeenCalledThisRound && currentTrick === 0 && state.playerTricks[0] === null && state.aiTricks[0] === null;
        if (canSing) {
            singingMove = getFlorCallOrEnvidoCall(state);
        }
        
        // Truco can be called anytime envido/flor is not active
        if (!gamePhase.includes('envido') && !gamePhase.includes('flor')) {
            trucoMove = getTrucoCall(state);
        }

        // New strategic decision point: Choose between Envido/Flor and Truco
        if (singingMove && trucoMove) {
            const aiEnvidoDetails = getEnvidoDetails(state.initialAiHand);
            const handStrength = calculateHandStrength(state.initialAiHand);
            
            // With a monster hand, the AI might hide its Envido to set a Truco trap.
            // Hand strength >= 20 is the 90th percentile. Envido >= 31 is very strong.
            if (aiEnvidoDetails.value >= 31 && handStrength >= 20) {
                // 60% chance to prioritize the Truco trap
                if (Math.random() < 0.60) {
                    const reasoning = `[Lógica Estratégica Superior: Sacrificar Envido]\n` +
                                    `Evaluación de Mano Completa:\n` +
                                    `  - Puntos de Envido/Flor: ${aiEnvidoDetails.value} (Extremadamente Fuerte).\n` +
                                    `  - Fuerza de Truco: ${handStrength} (Élite).\n` +
                                    `Análisis: Mi mano es un "monstruo" en ambas fases. Cantar un Envido/Flor tan alto (que probablemente ganaría) alertaría al jugador de mis cartas altas, haciéndolo jugar el Truco con extrema cautela.\n` +
                                    `Decisión Táctica: No cantaré. Sacrificaré la ganancia de puntos para ocultar mi fuerza y tender una trampa, con el objetivo de ganar más puntos en un Truco posterior.\n` +
                                    `\n--- Procediendo con el plan de Truco ---\n` +
                                    trucoMove.reasoning;
                    return { ...trucoMove, reasoning };
                }
            }
            // By default, a valid Envido/Flor call takes precedence.
            return singingMove;
        }

        if (singingMove) return singingMove;
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
