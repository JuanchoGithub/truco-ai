import { GameState, ActionType, AiMove } from '../types';
import { findBestCardToPlay } from './ai/playCardStrategy';
import { getEnvidoResponse, getEnvidoCall } from './ai/envidoStrategy';
import { getTrucoResponse, getTrucoCall } from './ai/trucoStrategy';

export const getLocalAIMove = (state: GameState): AiMove => {
    const { gamePhase, currentTurn, lastCaller, currentTrick, hasEnvidoBeenCalledThisRound } = state;
    let reasoning: string[] = [];
    let move: AiMove | null = null;

    // 1. MUST RESPOND to a player's call
    if (gamePhase.includes('_called') && currentTurn === 'ai' && lastCaller === 'player') {
        reasoning.push(`[Response Logic]`);
        reasoning.push(`Player called ${gamePhase.replace('_called', '').toUpperCase()}. I must respond.`);

        const canCallEnvidoPrimero = gamePhase === 'truco_called' && currentTrick === 0 && state.playerTricks[0] === null && state.aiTricks[0] === null;
        if (canCallEnvidoPrimero) {
            const envidoCallDecision = getEnvidoCall(state);
            if (envidoCallDecision) {
                 const updatedReasoning = `[Envido Primero Logic]\nPlayer called TRUCO, but I will invoke priority for Envido.\n` + envidoCallDecision.reasoning;
                 return { ...envidoCallDecision, reasoning: updatedReasoning, action: { type: ActionType.CALL_ENVIDO } };
            }
        }

        if (gamePhase.includes('envido')) {
            move = getEnvidoResponse(state, reasoning);
        }
        if (gamePhase.includes('truco')) {
            move = getTrucoResponse(state, reasoning);
        }
        if (move) return move;
    }

    // 2. DECIDE TO MAKE A CALL
    if (!gamePhase.includes('_called')) {
        // Envido can only be called in trick 1 before cards are played
        const canCallEnvido = !hasEnvidoBeenCalledThisRound && currentTrick === 0 && state.playerTricks[0] === null && state.aiTricks[0] === null;
        if (canCallEnvido) {
            move = getEnvidoCall(state);
            if (move) return move;
        }
        
        // Truco can be called anytime envido is not active
        if (!gamePhase.includes('envido')) {
            move = getTrucoCall(state);
            if (move) return move;
        }
    }

    // 3. Just PLAY A CARD
    const cardToPlayResult = findBestCardToPlay(state);
    const finalReasoning = [...reasoning, ...cardToPlayResult.reasoning];
    
    return { 
        action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: cardToPlayResult.index } },
        reasoning: finalReasoning.join('\n')
    };
};