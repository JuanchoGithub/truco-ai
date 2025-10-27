import { GameState, AiMove, ActionType, MessageObject } from '../../types';
import { getEnvidoDetails, getFlorValue } from '../trucoLogic';
import { getRandomPhrase, PHRASE_KEYS } from './phrases';
import i18nService from '../i18nService';

export const getEnvidoResponseOptions = (state: GameState, gamePressure: number, reasoning: (string | MessageObject)[]): AiMove[] => {
    const { initialAiHand, envidoPointsOnOffer, opponentModel, mano, aiScore, playerScore, hasRealEnvidoBeenCalledThisSequence, hasFaltaEnvidoBeenCalledThisSequence } = state;
    const { t } = i18nService;
    const { value: myEnvido } = getEnvidoDetails(initialAiHand);
    
    const context = mano === 'ai' ? 'pie' : 'mano';
    const estimatedOpponentPoints = opponentModel.envidoBehavior[context].callThreshold;

    reasoning.push({ key: 'ai_logic.my_envido_points', options: { points: myEnvido } });
    reasoning.push({ key: 'ai_logic.opponent_estimated_envido', options: { points: estimatedOpponentPoints.toFixed(0) } });

    const moves: AiMove[] = [];
    
    // Always possible to accept or decline
    moves.push({ action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.QUIERO) } }, reasoning: [{key: 'ai_logic.accept_envido_good_odds'}], reasonKey: 'accept_envido_good_odds' });
    moves.push({ action: { type: ActionType.DECLINE, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.NO_QUIERO) } }, reasoning: [{key: 'ai_logic.decline_envido_weak'}], reasonKey: 'decline_envido_weak' });

    // Escalation options
    const faltaPoints = 15 - Math.max(aiScore, playerScore);
    
    if (!hasFaltaEnvidoBeenCalledThisSequence) {
        moves.push({ action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.FALTA_ENVIDO) } }, reasoning: [{key: 'ai_logic.decision_falta_win'}], reasonKey: 'CALL_FALTA_ENVIDO' });
    }
    
    if (!hasRealEnvidoBeenCalledThisSequence) {
        moves.push({ action: { type: ActionType.CALL_REAL_ENVIDO, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.REAL_ENVIDO) } }, reasoning: [{key: 'ai_logic.escalate_envido_advantage'}], reasonKey: 'CALL_REAL_ENVIDO' });
    }
    
    if (envidoPointsOnOffer === 2 && !hasRealEnvidoBeenCalledThisSequence) {
        moves.push({ action: { type: ActionType.CALL_ENVIDO, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.ENVIDO) } }, reasoning: [{key: 'ai_logic.escalate_envido_strong'}], reasonKey: 'CALL_ENVIDO' });
    }
    
    return moves;
}

export const getFlorResponse = (state: GameState, reasoning: (string | MessageObject)[]): AiMove | null => {
    const { aiHasFlor } = state;
    const { t } = i18nService;
    if (aiHasFlor) {
        reasoning.push({ key: 'ai_logic.flor_response_contraflor' });
        const blurbText = getRandomPhrase(PHRASE_KEYS.CONTRAFLOR);
        return { action: { type: ActionType.CALL_CONTRAFLOR, payload: { blurbText } }, reasoning, reasonKey: 'call_contraflor' };
    } else {
        reasoning.push({ key: 'ai_logic.flor_response_acknowledge' });
        const blurbText = getRandomPhrase(PHRASE_KEYS.FLOR_ACK_GOOD);
        return { action: { type: ActionType.ACKNOWLEDGE_FLOR, payload: { blurbText } }, reasoning, reasonKey: 'acknowledge_flor' };
    }
}
