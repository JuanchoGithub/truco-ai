
import { AiMove, GameState, ActionType, Card } from '../types';
import { getCardName, getEnvidoValue, getEnvidoDetails, getCardHierarchy } from './trucoLogic';
import i18nService from './i18nService';

// This function provides a simple, direct text for a move.
export const getSimpleSuggestionText = (move: AiMove): string => {
    const { action } = move;
    switch (action.type) {
        case ActionType.PLAY_CARD:
            // This case should ideally not be hit if the summary is generated correctly
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
    if (hand.length === 0) return t('suggestion.truco_hand_weak');
    
    const sortedHand = [...hand].sort((a,b) => getCardHierarchy(b) - getCardHierarchy(a));
    const hierarchies = sortedHand.map(getCardHierarchy);

    if (hierarchies.length >= 2 && hierarchies[0] >= 13 && hierarchies[1] >= 11) return t('suggestion.truco_hand_monster', { card1Name: getCardName(sortedHand[0]), card2Name: getCardName(sortedHand[1]) });
    if (hierarchies[0] >= 12 && hierarchies[1] <= 8) return t('suggestion.truco_hand_top_heavy', { cardName: getCardName(sortedHand[0]) });
    if (hierarchies[0] >= 9 && hierarchies[1] >= 9) return t('suggestion.truco_hand_balanced');
    
    return t('suggestion.truco_hand_weak');
}

// This function generates a more conversational, strategic summary.
export const generateSuggestionSummary = (move: AiMove, state: GameState): string => {
    const { t } = i18nService;
    const { action, strategyCategory } = move;
    const { playerHand, gamePhase, initialPlayerHand } = state;

    const { points: playerEnvidoPoints, details: envidoDetails } = getEnvidoDescription(initialPlayerHand);
    const trucoHandDescription = getTrucoHandDescription(playerHand);

    let title = '';
    let description = '';

    switch (action.type) {
        case ActionType.PLAY_CARD: {
            const cardIndex = action.payload.cardIndex;
            const card = playerHand[cardIndex];
            if (!card) return getSimpleSuggestionText(move);
            
            title = t('suggestion.strategy.safe_play_card.title', { cardName: getCardName(card) });
            
            if (strategyCategory === 'deceptive') {
                 title = t('suggestion.strategy.deceptive_bait_card.title', { cardName: getCardName(card) });
                 description = t('suggestion.strategy.deceptive_bait_card.desc');
            } else {
                 description = t('suggestion.strategy.safe_play_card.desc');
            }
            return `${title} - ${description}`;
        }
        
        case ActionType.CALL_ENVIDO:
        case ActionType.CALL_REAL_ENVIDO:
        case ActionType.CALL_FALTA_ENVIDO: {
            const callType = t(`actionBar.${action.type.replace('CALL_', '').toLowerCase()}`);
            
            if (strategyCategory === 'deceptive') {
                title = t('suggestion.strategy.deceptive_bluff_envido.title', { call: callType });
                description = t('suggestion.strategy.deceptive_bluff_envido.desc', { points: playerEnvidoPoints });
            } else { // aggressive
                 title = t('suggestion.strategy.aggressive_call_envido.title', { call: callType });
                 description = t('suggestion.strategy.aggressive_call_envido.desc', { points: playerEnvidoPoints, details: envidoDetails });
            }
            return `${title} - ${description}`;
        }
        
        case ActionType.CALL_TRUCO: {
            const callType = t(`actionBar.${action.type.replace('CALL_', '').toLowerCase()}`);
            if (strategyCategory === 'deceptive') {
                title = t('suggestion.strategy.deceptive_bluff_truco.title');
                description = t('suggestion.strategy.deceptive_bluff_truco.desc', { description: trucoHandDescription });
            } else { // aggressive
                title = t('suggestion.strategy.aggressive_call_truco.title');
                description = t('suggestion.strategy.aggressive_call_truco.desc', { description: trucoHandDescription, call: callType });
            }
             return `${title} - ${description}`;
        }

        // --- Responses ---
        case ActionType.ACCEPT: {
            if (gamePhase.includes('envido')) return t('suggestion.respond_quiero_envido_good', { points: playerEnvidoPoints, details: envidoDetails });
            if (gamePhase.includes('truco')) return t('suggestion.respond_quiero_truco_solid', { description: trucoHandDescription });
            return getSimpleSuggestionText(move);
        }
        case ActionType.DECLINE: {
            if (gamePhase.includes('envido')) return t('suggestion.respond_no_quiero_envido_risk', { points: playerEnvidoPoints, details: envidoDetails });
            if (gamePhase.includes('truco')) return t('suggestion.respond_no_quiero_truco_weak', { description: trucoHandDescription });
            return getSimpleSuggestionText(move);
        }
        case ActionType.CALL_RETRUCO:
        case ActionType.CALL_VALE_CUATRO: {
            const callType = t(`actionBar.${action.type.replace('CALL_', '').toLowerCase()}`);
             if (strategyCategory === 'deceptive') {
                 return t('suggestion.respond_escalate_truco_bluff', { call: callType, description: trucoHandDescription });
            }
            return t('suggestion.respond_escalate_truco_strong', { call: callType, description: trucoHandDescription });
        }
        
        // Default fallback for any unhandled reasonKey or action type
        default:
            return getSimpleSuggestionText(move);
    }
};
