


import { AiMove, GameState, ActionType, Card } from '../types';
import { getCardName, getEnvidoValue } from './trucoLogic';
import { findBestCardToPlay } from './ai/playCardStrategy';
import i18nService from './i18nService';

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
            if (playerHand[cardIndex]) {
                return i18nService.t('suggestion.play_card', { cardName: getCardName(playerHand[cardIndex]) });
            }
            return i18nService.t('suggestion.play_card', { cardName: 'a card' });
        case ActionType.CALL_ENVIDO: return i18nService.t('actionBar.envido');
        case ActionType.CALL_REAL_ENVIDO: return i18nService.t('actionBar.real_envido');
        case ActionType.CALL_FALTA_ENVIDO: return i18nService.t('actionBar.falta_envido');
        case ActionType.DECLARE_FLOR: return i18nService.t('actionBar.flor');
        case ActionType.CALL_TRUCO: return i18nService.t('actionBar.truco');
        case ActionType.CALL_RETRUCO: return i18nService.t('actionBar.retruco');
        case ActionType.CALL_VALE_CUATRO: return i18nService.t('actionBar.vale_cuatro');
        case ActionType.ACCEPT: return i18nService.t('actionBar.quiero');
        case ActionType.DECLINE: return i18nService.t('actionBar.no_quiero');
        case ActionType.RESPOND_TO_ENVIDO_WITH_FLOR: return i18nService.t('actionBar.flor');
        case ActionType.ACKNOWLEDGE_FLOR: return i18nService.t('actionBar.flor_ack');
        case ActionType.CALL_CONTRAFLOR: return i18nService.t('actionBar.contraflor');
        case ActionType.ACCEPT_CONTRAFLOR: return i18nService.t('actionBar.contraflor_quiero');
        case ActionType.DECLINE_CONTRAFLOR: return i18nService.t('actionBar.contraflor_no_quiero');
        default: return i18nService.t('suggestion.consider_move');
    }
};

// New helper function to describe envido strength
function getEnvidoStrengthText(points: number): string {
    if (points >= 30) return i18nService.t('suggestion.envido_strength_excellent');
    if (points >= 27) return i18nService.t('suggestion.envido_strength_good');
    if (points >= 24) return i18nService.t('suggestion.envido_strength_decent');
    return i18nService.t('suggestion.envido_strength_low');
}

// New helper to create a safe card play alternative text
function getSafeCardPlayAlternative(state: GameState): string {
    try {
        const mirroredStateForSafePlay = createMirroredState(state);
        const safePlay = findBestCardToPlay(mirroredStateForSafePlay);
        const cardToPlay = state.playerHand[safePlay.index];
        if (cardToPlay) {
            return i18nService.t('suggestion.safe_play_alternative', { cardName: getCardName(cardToPlay) });
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
    const { playerHand, gamePhase, initialPlayerHand } = state;

    const playerEnvidoPoints = getEnvidoValue(initialPlayerHand);
    const isResponding = gamePhase.includes('_called');
    
    const alternativePlayText = !isResponding ? getSafeCardPlayAlternative(state) : "";

    if (isResponding) {
        if (action.type === ActionType.ACCEPT) {
            if (gamePhase.includes('envido')) {
                if (reasoning.includes("Las probabilidades están a mi favor")) {
                    return i18nService.t('suggestion.respond_quiero_envido_good', { points: playerEnvidoPoints });
                }
                if (reasoning.includes("podría ser un farol")) {
                    return i18nService.t('suggestion.respond_quiero_envido_bluff', { points: playerEnvidoPoints });
                }
                return i18nService.t('suggestion.respond_quiero_envido_default', { points: playerEnvidoPoints });
            }
            if (gamePhase.includes('truco')) {
                 if (reasoning.includes("Mi mano es sólida") || reasoning.includes("La equidad es aceptable")) {
                    return i18nService.t('suggestion.respond_quiero_truco_solid');
                }
                if (reasoning.includes("oponente podría estar faroleando")) {
                    return i18nService.t('suggestion.respond_quiero_truco_bluff');
                }
                return i18nService.t('suggestion.respond_quiero_truco_default');
            }
        }

        if (action.type === ActionType.DECLINE) {
            if (gamePhase.includes('envido')) {
                if (reasoning.includes("El riesgo es muy alto") || reasoning.includes("Mi mano parece más débil")) {
                    return i18nService.t('suggestion.respond_no_quiero_envido_risk', { points: playerEnvidoPoints });
                }
                return i18nService.t('suggestion.respond_no_quiero_envido_default', { points: playerEnvidoPoints });
            }
            if (gamePhase.includes('truco')) {
                if (reasoning.includes("La equidad es muy baja") || reasoning.includes("Mi mano es débil") || reasoning.includes("casi nula")) {
                    return i18nService.t('suggestion.respond_no_quiero_truco_weak');
                }
                return i18nService.t('suggestion.respond_no_quiero_truco_default');
            }
        }

        if (action.type === ActionType.CALL_RETRUCO || action.type === ActionType.CALL_VALE_CUATRO) {
            const callType = action.type.replace('CALL_', '').replace('_', ' ');
            if (reasoning.includes("Mi mano es de élite") || reasoning.includes("La equidad es muy alta") || reasoning.includes("escalando agresivamente")) {
                return i18nService.t('suggestion.respond_escalate_truco_strong', { call: callType });
            }
             if (reasoning.includes("farol de desesperación") || reasoning.includes("farol agresivo")) {
                return i18nService.t('suggestion.respond_escalate_truco_bluff', { call: callType });
            }
            return i18nService.t('suggestion.respond_escalate_truco_default', { call: callType });
        }
        
        if (action.type === ActionType.CALL_REAL_ENVIDO || action.type === ActionType.CALL_FALTA_ENVIDO || (action.type === ActionType.CALL_ENVIDO && isResponding)) {
            const callType = action.type.replace('CALL_', '').replace('_', ' ');
            const strengthText = getEnvidoStrengthText(playerEnvidoPoints);

            if (gamePhase === 'truco_called' && (action.type === ActionType.CALL_ENVIDO || action.type === ActionType.CALL_REAL_ENVIDO || action.type === ActionType.CALL_FALTA_ENVIDO)) {
                const isBluff = /farol|mano.*débil/i.test(reasoning);
                if (isBluff) {
                    return i18nService.t('suggestion.respond_envido_primero_bluff', { call: callType, points: playerEnvidoPoints });
                }
                const opponentCardPlayed = state.aiTricks[0];
                const context = opponentCardPlayed ? i18nService.t('suggestion.respond_envido_primero_context', { cardName: getCardName(opponentCardPlayed) }) : "";
                return i18nService.t('suggestion.respond_envido_primero', { context, points: playerEnvidoPoints, strengthText, call: callType });
            }

            if (reasoning.includes("Mi mano es mucho más fuerte")) {
                return i18nService.t('suggestion.respond_escalate_envido', { points: playerEnvidoPoints, strengthText, call: callType });
            }
            
            return i18nService.t('suggestion.respond_escalate_envido_default', { points: playerEnvidoPoints, strengthText, call: callType });
        }
    }

    if (action.type === ActionType.CALL_TRUCO || action.type === ActionType.CALL_RETRUCO || action.type === ActionType.CALL_VALE_CUATRO) {
        if (reasoning.includes("Parda y Gano")) {
            return i18nService.t('suggestion.proactive_truco_parda');
        }

        let isBluff = false;
        if ('payload' in action && action.payload && 'trucoContext' in action.payload && action.payload.trucoContext) {
            isBluff = action.payload.trucoContext.isBluff;
        } else {
            isBluff = /farol|bluff|mano.*débil/i.test(reasoning);
        }

        const callType = action.type.replace('CALL_', '').replace('_',' ');

        if (isBluff) {
            return i18nService.t('suggestion.proactive_truco_bluff', { call: callType, alternative: alternativePlayText });
        } else {
            return i18nService.t('suggestion.proactive_truco_strong', { call: callType, alternative: alternativePlayText });
        }
    }

    if (action.type === ActionType.CALL_ENVIDO || action.type === ActionType.CALL_REAL_ENVIDO || action.type === ActionType.CALL_FALTA_ENVIDO) {
        const callType = action.type.replace('CALL_', '').replace('_', ' ');
        const isBluff = /farol|mano.*débil/i.test(reasoning);

        if (isBluff) {
             const foldRateMatch = reasoning.match(/tasa de abandono.* ([\d\.]+)%/);
             let opponentInfo = i18nService.t('suggestion.proactive_envido_bluff_opponent_info_default');
             if (foldRateMatch && foldRateMatch[1]) {
                 opponentInfo = i18nService.t('suggestion.proactive_envido_bluff_opponent_info', { rate: foldRateMatch[1] });
             }
             return i18nService.t('suggestion.proactive_envido_bluff', { points: playerEnvidoPoints, opponentInfo, call: callType, alternative: alternativePlayText });
        }
        const strengthText = getEnvidoStrengthText(playerEnvidoPoints);
        return i18nService.t('suggestion.proactive_envido_strong', { points: playerEnvidoPoints, strengthText, call: callType });
    }

    if (action.type === ActionType.PLAY_CARD) {
        const cardIndex = action.payload.cardIndex;
        const card = playerHand[cardIndex];
        if (!card) return getSimpleSuggestionText(move, playerHand);

        let reasonKey = "default";
        if (reasoning.includes("carta más alta")) {
            reasonKey = "secure_hand";
        } else if (reasoning.includes("carta más baja para ver qué tiene")) {
            reasonKey = "see_opponent";
        } else if (reasoning.includes("carta ganadora de ronda más débil")) {
            reasonKey = "win_round_cheap";
        } else if (reasoning.includes("Descartaré mi carta más baja")) {
            reasonKey = "discard_low";
        } else if (reasoning.includes("Parda y Canto")) {
            reasonKey = "parda_y_canto";
        }
        
        const strategicReason = i18nService.t(`suggestion.reason.${reasonKey}`);
        return i18nService.t('suggestion.play_card_reason', { cardName: getCardName(card), reason: strategicReason });
    }
    
    return getSimpleSuggestionText(move, playerHand);
};
