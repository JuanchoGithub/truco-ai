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
    const { t } = i18nService;
    const { action, reasonKey } = move;
    const { playerHand, gamePhase, initialPlayerHand } = state;

    const playerEnvidoPoints = getEnvidoValue(initialPlayerHand);
    const isResponding = gamePhase.includes('_called');
    
    const alternativePlayText = !isResponding ? getSafeCardPlayAlternative(state) : "";
    const callType = action.type.replace('CALL_', '').replace('_', ' ');

    switch (reasonKey) {
        // --- RESPONSES ---
        case 'accept_envido_good_odds':
            return t('suggestion.respond_quiero_envido_good', { points: playerEnvidoPoints });
        case 'accept_envido_hero_call':
            return t('suggestion.respond_quiero_envido_bluff', { points: playerEnvidoPoints });
        case 'decline_envido_weak':
            return t('suggestion.respond_no_quiero_envido_risk', { points: playerEnvidoPoints });
        
        case 'accept_truco_solid':
        case 'accept_truco_decent_equity':
            return t('suggestion.respond_quiero_truco_solid');
        case 'accept_truco_bluff_call':
            return t('suggestion.respond_quiero_truco_bluff');
        
        case 'decline_truco_weak':
        case 'decline_truco_low_equity':
        case 'decline_truco_certain_loss':
            return t('suggestion.respond_no_quiero_truco_weak');

        case 'escalate_truco_elite':
        case 'escalate_truco_strong':
        case 'escalate_truco_high_equity':
        case 'escalate_truco_dominant_card':
            return t('suggestion.respond_escalate_truco_strong', { call: callType });
        case 'escalate_truco_desperation_bluff':
        case 'escalate_truco_weak_bluff':
        case 'escalate_truco_mixed_bluff':
             return t('suggestion.respond_escalate_truco_bluff', { call: callType });
        
        case 'escalate_real_stronger':
        case 'escalate_envido_strong':
        case 'escalate_falta_win_game':
            return t('suggestion.respond_escalate_envido', { points: playerEnvidoPoints, strengthText: getEnvidoStrengthText(playerEnvidoPoints), call: callType });

        // --- PROACTIVE CALLS ---
        case 'call_truco_parda_y_gano':
            return t('suggestion.proactive_truco_parda');
        case 'call_truco_bluff':
            return t('suggestion.proactive_truco_bluff', { call: callType, alternative: alternativePlayText });
        case 'call_truco_value':
        case 'call_truco_won_trick1':
        case 'call_truco_certain_win':
            return t('suggestion.proactive_truco_strong', { call: callType, alternative: alternativePlayText });

        case 'call_envido_bluff':
             // The reasoning for bluffing is complex, so we just provide a simpler text
             return t('suggestion.proactive_envido_bluff', { points: playerEnvidoPoints, opponentInfo: '', call: callType, alternative: alternativePlayText });
        case 'call_envido_strong':
        case 'call_real_dominant':
        case 'call_falta_defensive':
        case 'call_falta_win_game':
            return t('suggestion.proactive_envido_strong', { points: playerEnvidoPoints, strengthText: getEnvidoStrengthText(playerEnvidoPoints), call: callType });
        
        // --- CARD PLAYS ---
        case 'secure_hand':
        case 'see_opponent':
        case 'win_round_cheap':
        case 'discard_low':
        case 'parda_y_canto': {
            // FIX: Add type guard to ensure action is PLAY_CARD before accessing payload.
            if (action.type !== ActionType.PLAY_CARD) {
                // This case should not be reached if reasonKeys are correctly assigned, but it acts as a type guard.
                return getSimpleSuggestionText(move, playerHand);
            }
            const cardIndex = action.payload.cardIndex;
            const card = playerHand[cardIndex];
            if (!card) return getSimpleSuggestionText(move, playerHand);
            
            const strategicReason = t(`suggestion.reason.${reasonKey}`);
            return t('suggestion.play_card_reason', { cardName: getCardName(card), reason: strategicReason });
        }
        
        // Default fallback for any unhandled reasonKey
        default:
            return getSimpleSuggestionText(move, playerHand);
    }
};
