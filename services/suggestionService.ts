import { AiMove, GameState, ActionType, Card } from '../types';
import { getCardName, getEnvidoValue, getEnvidoDetails, getCardHierarchy } from './trucoLogic';
import { findBestCardToPlay } from './ai/playCardStrategy';
import i18nService from './i18nService';

// Helper to determine the descriptive strength of envido points
function getEnvidoStrengthText(points: number, t: (key: string) => string): string {
    if (points >= 31) return t('suggestion.envido_strength_excellent');
    if (points >= 28) return t('suggestion.envido_strength_good');
    if (points >= 25) return t('suggestion.envido_strength_decent');
    return t('suggestion.envido_strength_low');
}

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

// New helper function to describe envido strength with details
function getEnvidoDescription(hand: Card[]): { points: number; details: string } {
    const { t } = i18nService;
    if (hand.length < 2) return { points: 0, details: '' };

    const details = getEnvidoDetails(hand);
    const points = details.value;
    const cardLine = details.reasoning.find(r => typeof r === 'object' && r.key === 'ai_logic.envido_calc.multiple_cards');
    
    if (cardLine && typeof cardLine === 'object' && cardLine.options) {
        const { card1, card2 } = cardLine.options;
        return { points, details: t('suggestion.envido_from_cards', { card1Name: getCardName(card1), card2Name: getCardName(card2) }) };
    }
    
    const singleCardLine = details.reasoning.find(r => typeof r === 'object' && r.key === 'ai_logic.envido_calc.single_card');
    if (singleCardLine && typeof singleCardLine === 'object' && singleCardLine.options) {
        const { card } = singleCardLine.options;
        return { points, details: t('suggestion.envido_from_card', { cardName: getCardName(card) }) };
    }
    
    return { points, details: '' };
}


// New helper function to describe truco hand composition
function getTrucoHandDescription(hand: Card[]): string {
    const { t } = i18nService;
    if (hand.length < 2) return t('suggestion.truco_hand_weak');
    
    const sortedHand = [...hand].sort((a,b) => getCardHierarchy(b) - getCardHierarchy(a));
    const hierarchies = sortedHand.map(getCardHierarchy);

    if (hierarchies.length >= 2 && hierarchies[0] >= 13 && hierarchies[1] >= 11) return t('suggestion.truco_hand_monster', { card1Name: getCardName(sortedHand[0]), card2Name: getCardName(sortedHand[1]) });
    if (hierarchies[0] >= 12 && hierarchies[1] <= 8) return t('suggestion.truco_hand_top_heavy', { cardName: getCardName(sortedHand[0]) });
    if (hierarchies[0] >= 9 && hierarchies[1] >= 9) return t('suggestion.truco_hand_balanced');
    
    return t('suggestion.truco_hand_weak');
}

// NEW: Generates a more detailed, educational reason for playing a specific card.
function getDetailedPlayCardReason(reasonKey: string | undefined, card: Card, hand: Card[], t: (key: string, options?: any) => string): string {
    const cardName = getCardName(card);

    switch (reasonKey) {
        case 'probe_low_value':
            return t('suggestion.detail_reason.probe_low', { cardName });
        case 'probe_mid_value':
            return t('suggestion.detail_reason.probe_mid', { cardName });
        case 'secure_hand':
            return t('suggestion.detail_reason.secure_hand', { cardName });
        case 'win_round_cheap':
             return t('suggestion.detail_reason.win_cheap', { cardName });
        case 'parda_y_canto':
            return t('suggestion.detail_reason.parda_y_canto', { cardName });
        default:
            // Fallback for other reason keys like 'play_last_card', 'discard_low' etc.
            const genericReasonKey = `suggestion.reason.${reasonKey || 'default'}`;
            const genericReason = t(genericReasonKey, { defaultValue: t('suggestion.reason.default') });
            return t('suggestion.play_card_reason', { cardName, reason: genericReason });
    }
}


// This function generates a more conversational, strategic summary.
export const generateSuggestionSummary = (move: AiMove, state: GameState): string => {
    const { t } = i18nService;
    const { action, reasonKey } = move;
    const { playerHand, gamePhase, initialPlayerHand, mano, opponentModel } = state;

    const { points: playerEnvidoPoints, details: envidoDetails } = getEnvidoDescription(initialPlayerHand);
    const trucoHandDescription = getTrucoHandDescription(playerHand);

    switch (action.type) {
        case ActionType.PLAY_CARD: {
            const cardIndex = action.payload.cardIndex;
            const card = playerHand[cardIndex];
            if (!card) return getSimpleSuggestionText(move, playerHand);
            
            return getDetailedPlayCardReason(reasonKey, card, playerHand, t);
        }
        
        // --- Proactive Envido Calls ---
        case ActionType.CALL_ENVIDO:
        case ActionType.CALL_REAL_ENVIDO:
        case ActionType.CALL_FALTA_ENVIDO: {
            const callType = t(`actionBar.${action.type.replace('CALL_', '').toLowerCase()}`);
            const strengthText = getEnvidoStrengthText(playerEnvidoPoints, (key) => t(key));

            if (reasonKey?.includes('bluff')) {
                const playerContext = mano === 'player' ? 'mano' : 'pie';
                const foldRate = opponentModel.envidoBehavior[playerContext].foldRate;
                const opponentInfo = foldRate > 0.1 
                    ? t('suggestion.proactive_envido_bluff_opponent_info', { rate: (foldRate * 100).toFixed(0) })
                    : t('suggestion.proactive_envido_bluff_opponent_info_default');
                
                const mirroredStateForSafePlay = createMirroredState(state);
                const safePlayMove = findBestCardToPlay(mirroredStateForSafePlay);
                const safeCard = playerHand[safePlayMove.index];
                const alternative = safeCard 
                    ? t('suggestion.safe_play_alternative', { cardName: getCardName(safeCard) })
                    : '';

                return t('suggestion.proactive_envido_bluff', { points: playerEnvidoPoints, opponentInfo, call: callType, alternative, details: envidoDetails });
            }
            return t('suggestion.proactive_envido_strong', { points: playerEnvidoPoints, strengthText, call: callType, details: envidoDetails });
        }
        
        // --- Proactive Truco Calls ---
        case ActionType.CALL_TRUCO: {
            const callType = t(`actionBar.${action.type.replace('CALL_', '').toLowerCase()}`);
            const mirroredStateForSafePlay = createMirroredState(state);
            const safePlayMove = findBestCardToPlay(mirroredStateForSafePlay);
            const safeCard = playerHand[safePlayMove.index];
            const alternative = safeCard 
                ? t('suggestion.safe_play_alternative', { cardName: getCardName(safeCard) })
                : '';

            if (reasonKey === 'call_truco_parda_y_gano') return t('suggestion.proactive_truco_parda');
            if (reasonKey?.includes('bluff')) {
                 return t('suggestion.proactive_truco_bluff', { description: trucoHandDescription, call: callType, alternative });
            }
            return t('suggestion.proactive_truco_strong', { description: trucoHandDescription, call: callType, alternative });
        }

        // --- Responses ---
        case ActionType.ACCEPT: {
            if (gamePhase.includes('envido')) return t('suggestion.respond_quiero_envido_good', { points: playerEnvidoPoints, details: envidoDetails });
            if (gamePhase.includes('truco')) return t('suggestion.respond_quiero_truco_solid', { description: trucoHandDescription });
            return getSimpleSuggestionText(move, playerHand);
        }
        case ActionType.DECLINE: {
            if (gamePhase.includes('envido')) return t('suggestion.respond_no_quiero_envido_risk', { points: playerEnvidoPoints, details: envidoDetails });
            if (gamePhase.includes('truco')) return t('suggestion.respond_no_quiero_truco_weak', { description: trucoHandDescription });
            return getSimpleSuggestionText(move, playerHand);
        }
        case ActionType.CALL_RETRUCO:
        case ActionType.CALL_VALE_CUATRO: {
            const callType = t(`actionBar.${action.type.replace('CALL_', '').toLowerCase()}`);
             if (reasonKey?.includes('bluff')) {
                 return t('suggestion.respond_escalate_truco_bluff', { call: callType, description: trucoHandDescription });
            }
            return t('suggestion.respond_escalate_truco_strong', { call: callType, description: trucoHandDescription });
        }
        
        // Default fallback for any unhandled reasonKey or action type
        default:
            return getSimpleSuggestionText(move, playerHand);
    }
};