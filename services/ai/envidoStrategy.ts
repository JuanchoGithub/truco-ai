
import { GameState, AiMove, ActionType } from '../../types';
import { getEnvidoDetails, getFlorValue, hasFlor } from '../trucoLogic';
import { getRandomPhrase, PHRASE_KEYS } from './phrases';
import i18nService from '../i18nService';

// Helper for getEnvidoResponse: Estimates opponent's strength based on their call.
const estimateOpponentStrengthOnCall = (state: GameState): number => {
    const { envidoPointsOnOffer, opponentModel } = state;
    const playerContext = state.mano === 'player' ? 'mano' : 'pie';
    // Base the estimate on the player's learned calling threshold for the current context.
    let estimate = opponentModel.envidoBehavior[playerContext].callThreshold || 27;

    // Adjust based on the current situation. A higher stake implies a stronger hand.
    if (envidoPointsOnOffer >= 5) estimate = Math.max(estimate, 29); // Real Envido or more
    else if (envidoPointsOnOffer >= 3) estimate = Math.max(estimate, 28); // Real Envido
    
    return estimate;
}

export const getEnvidoResponse = (state: GameState, gamePressure: number, reasoning: string[]): AiMove | null => {
    const { t } = i18nService;
    const { initialAiHand, aiScore, mano, envidoPointsOnOffer, hasRealEnvidoBeenCalledThisSequence } = state;
    
    const aiEnvidoDetails = getEnvidoDetails(initialAiHand);
    reasoning.push(aiEnvidoDetails.reasoning);
    let myEnvido = aiEnvidoDetails.value;

    if (mano === 'ai') {
        myEnvido += 0.5; // Mano bonus for winning ties
        reasoning.push(t('ai_logic.mano_bonus'));
    }

    const estimatedOpponentEnvido = estimateOpponentStrengthOnCall(state);
    reasoning.push(t('ai_logic.opponent_model_envido_call', { pointsOnOffer: envidoPointsOnOffer, estimatedOpponentEnvido: estimatedOpponentEnvido.toFixed(1) }));
    
    const advantage = (myEnvido - estimatedOpponentEnvido) / 33;
    reasoning.push(t('ai_logic.advantage_calculated', { advantage: (advantage * 100).toFixed(0) }));

    const randomFactor = Math.random();
    const aiPointsToWin = 15 - aiScore;

    // Decision thresholds are now adjusted by gamePressure
    const escalateAdvantageThreshold = 0.15 - (gamePressure * 0.1); // Escalate more easily when desperate
    const acceptAdvantageThreshold = -0.1 - (gamePressure * 0.15); // Accept more easily when desperate
    const heroCallChance = 0.15 + (gamePressure > 0 ? gamePressure * 0.2 : 0); // Hero call more when desperate

    // High advantage -> Escalate
    if (advantage > escalateAdvantageThreshold) {
        if (aiPointsToWin <= envidoPointsOnOffer + 3 && myEnvido >= 30) {
             reasoning.push(t('ai_logic.decision_falta_huge_advantage'));
             const blurbText = getRandomPhrase(PHRASE_KEYS.FALTA_ENVIDO);
             return { action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText } }, reasoning: reasoning.join('\n') };
        }
        if (!hasRealEnvidoBeenCalledThisSequence) {
             reasoning.push(t('ai_logic.decision_real_envido_stronger'));
             const blurbText = getRandomPhrase(PHRASE_KEYS.REAL_ENVIDO);
             return { action: { type: ActionType.CALL_REAL_ENVIDO, payload: { blurbText } }, reasoning: reasoning.join('\n') };
        }
        if (envidoPointsOnOffer === 2 && myEnvido >= 28) { // Only escalate with Envido-Envido if hand is strong
            reasoning.push(t('ai_logic.decision_envido_response_strong'));
            const blurbText = getRandomPhrase(PHRASE_KEYS.ENVIDO);
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: reasoning.join('\n') };
        }
    } 
    
    // Positive or slightly negative advantage -> Accept
    if (advantage > acceptAdvantageThreshold) {
        reasoning.push(t('ai_logic.decision_accept_envido'));
        return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.QUIERO) } }, reasoning: reasoning.join('\n') };
    }

    // Low advantage -> Mostly Decline
    reasoning.push(t('ai_logic.hand_seems_weaker'));
    if (myEnvido >= 23 && randomFactor < heroCallChance) {
         reasoning.push(t('ai_logic.decision_hero_call', { chance: (heroCallChance * 100).toFixed(0) }));
         return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.QUIERO) } }, reasoning: reasoning.join('\n') };
    }
    
    reasoning.push(t('ai_logic.decision_decline_envido'));
    return { action: { type: ActionType.DECLINE, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.NO_QUIERO) } }, reasoning: reasoning.join('\n') };
}

export const getEnvidoCall = (state: GameState, gamePressure: number): AiMove | null => {
    const { t } = i18nService;
    const { initialAiHand, playerScore, aiScore, mano, opponentModel } = state;
    
    const aiEnvidoDetails = getEnvidoDetails(initialAiHand);
    let myEnvido = aiEnvidoDetails.value;
    let reasonPrefix: string[] = [t('ai_logic.envido_call_logic'), aiEnvidoDetails.reasoning];

    if (mano === 'ai') {
        myEnvido += 0.5; // Mano bonus
        reasonPrefix.push(t('ai_logic.mano_bonus'));
    }

    const randomFactor = Math.random();
    const playerPointsToWin = 15 - playerScore;
    const aiPointsToWin = 15 - aiScore;
    
    const playerContext = state.mano === 'player' ? 'mano' : 'pie';
    const opponentContextualBehavior = opponentModel.envidoBehavior[playerContext];
    
    // AI's calling threshold is now dynamic based on game pressure
    const dynamicCallThreshold = opponentContextualBehavior.callThreshold - (gamePressure * 3); // More desperate -> lower threshold
    reasonPrefix.push(t('ai_logic.opponent_model_context', { context: playerContext.toUpperCase(), threshold: opponentContextualBehavior.callThreshold.toFixed(1), dynamicThreshold: dynamicCallThreshold.toFixed(1) }));

    const isObjectivelyStrong = myEnvido >= 28;
    reasonPrefix.push(t('ai_logic.objectively_strong_hand', { isStrong: isObjectivelyStrong ? t('ai_logic.is_strong.yes') : t('ai_logic.is_strong.no') }));

    // High strength hand -> Escalate
    if (myEnvido >= 30) {
        if (aiPointsToWin <= 5 && randomFactor < 0.75) {
            const blurbText = getRandomPhrase(PHRASE_KEYS.FALTA_ENVIDO);
            const reasoning = t('ai_logic.decision_falta_win', { envidoPoints: myEnvido.toFixed(1) });
            return { action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        } else {
            const blurbText = getRandomPhrase(PHRASE_KEYS.REAL_ENVIDO);
            const reasoning = t('ai_logic.decision_real_envido_dominant', { envidoPoints: myEnvido.toFixed(1) });
            return { action: { type: ActionType.CALL_REAL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    } 
    // Strong hand -> Standard call
    else if (isObjectivelyStrong || myEnvido >= dynamicCallThreshold) {
        if (playerPointsToWin <= 3 && myEnvido >= 28) {
             const blurbText = getRandomPhrase(PHRASE_KEYS.FALTA_ENVIDO);
             const reasoning = t('ai_logic.decision_falta_defensive', { envidoPoints: myEnvido.toFixed(1) });
             return { action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        } else {
            const blurbText = getRandomPhrase(PHRASE_KEYS.ENVIDO);
            const reason = isObjectivelyStrong ? t('ai_logic.reasons.objectively_good') : t('ai_logic.reasons.above_threshold');
            const reasoning = t('ai_logic.decision_envido_strong', { envidoPoints: myEnvido.toFixed(1), reason });
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    }
    // Marginal hand -> Occasional call
    else if (myEnvido >= 23) {
        const marginalCallChance = 0.15;
        if (randomFactor < marginalCallChance) {
            const blurbText = getRandomPhrase(PHRASE_KEYS.ENVIDO);
            const reasoning = t('ai_logic.decision_envido_marginal', { envidoPoints: myEnvido.toFixed(1) });
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    }
    // Low strength hand -> Bluffing
    else {
        const baseBluffChance = 0.08;
        // More desperate -> higher bluff chance. Cautious -> lower bluff chance.
        const adjustedBluffChance = Math.min(0.4, baseBluffChance + (opponentContextualBehavior.foldRate * 0.3) + (gamePressure > 0 ? gamePressure * 0.15 : 0));
        
        if (randomFactor < adjustedBluffChance) {
            const blurbText = getRandomPhrase(PHRASE_KEYS.ENVIDO);
            reasonPrefix.push(t('ai_logic.adjusted_bluff_chance', { chance: (adjustedBluffChance * 100).toFixed(0) }));
            const reasoning = t('ai_logic.decision_envido_bluff', { envidoPoints: myEnvido.toFixed(1) });
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    }
    
    return null; // No action
}

export const getFlorResponse = (state: GameState, reasoning: string[]): AiMove | null => {
    const { t } = i18nService;
    const { gamePhase, initialAiHand, aiHasFlor, playerHasFlor, aiScore } = state;

    if (gamePhase === 'flor_called') {
        reasoning.push(t('ai_logic.flor_response_logic'));
        if (aiHasFlor) {
            const myFlor = getFlorValue(initialAiHand);
            reasoning.push(t('ai_logic.flor_response_i_have_flor', { florPoints: myFlor }));
            // Simple strategy: if my Flor is very good, I escalate.
            if (myFlor >= 30) {
                 const decisionReason = t('ai_logic.decision_contraflor_strong');
                 return { action: { type: ActionType.CALL_CONTRAFLOR, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.CONTRAFLOR) } }, reasoning: [...reasoning, decisionReason].join('\n') };
            } else {
                 const decisionReason = t('ai_logic.decision_ack_flor_weak');
                 return { action: { type: ActionType.ACKNOWLEDGE_FLOR, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.FLOR_ACK_MINE_WORSE) } }, reasoning: [...reasoning, decisionReason].join('\n') };
            }
        } else {
            const decisionReason = t('ai_logic.decision_ack_flor_no_flor');
            return { action: { type: ActionType.ACKNOWLEDGE_FLOR, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.FLOR_ACK_GOOD) } }, reasoning: [...reasoning, decisionReason].join('\n') };
        }
    }

    if (gamePhase === 'contraflor_called') {
        reasoning.push(t('ai_logic.contraflor_response_logic'));
        const myFlor = getFlorValue(initialAiHand);
        reasoning.push(t('ai_logic.contraflor_response_my_flor', { florPoints: myFlor }));
        
        // --- NEW: Score-aware logic ---
        const pointsFromContraflor = 6;
        const canWinGame = (aiScore + pointsFromContraflor) >= 15;
        let acceptanceThreshold = 32; // Default conservative threshold

        if (canWinGame) {
            acceptanceThreshold = 30; // Lower threshold for a game-winning gamble
            reasoning.push(t('ai_logic.score_analysis', { points: pointsFromContraflor, totalScore: aiScore + pointsFromContraflor }));
            reasoning.push(t('ai_logic.strategy_risk', { threshold: acceptanceThreshold }));
        } else {
             reasoning.push(t('ai_logic.strategy_conservative', { threshold: acceptanceThreshold }));
        }
        // --- END NEW LOGIC ---

        if (myFlor >= acceptanceThreshold) {
            const decisionReason = t('ai_logic.decision_accept_contraflor', { florPoints: myFlor, threshold: acceptanceThreshold });
            return { action: { type: ActionType.ACCEPT_CONTRAFLOR, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.CONTRAFLOR_QUIERO) } }, reasoning: [...reasoning, decisionReason].join('\n') };
        } else {
            const decisionReason = t('ai_logic.decision_decline_contraflor', { florPoints: myFlor });
            return { action: { type: ActionType.DECLINE_CONTRAFLOR, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.CONTRAFLOR_NO_QUIERO) } }, reasoning: [...reasoning, decisionReason].join('\n') };
        }
    }

    return null;
};


export const getFlorCallOrEnvidoCall = (state: GameState, gamePressure: number): AiMove | null => {
    const { t } = i18nService;
    if (state.aiHasFlor) {
        const myFlor = getFlorValue(state.initialAiHand);
        let reasonPrefix: string[] = [t('ai_logic.flor_or_envido_logic'), t('ai_logic.flor_or_envido_i_have_flor', { florPoints: myFlor })];
        
        // Strategic decision: call Flor or bluff Envido
        if (myFlor < 26 && Math.random() < 0.4) { // 40% chance to bluff with a weak Flor
            reasonPrefix.push(t('ai_logic.flor_or_envido_bluff_consider'));
            const envidoMove = getEnvidoCall(state, gamePressure);
            if (envidoMove) {
                const updatedReasoning = [...reasonPrefix, t('ai_logic.bluffing_with_envido'), envidoMove.reasoning].join('\n');
                return { ...envidoMove, reasoning: updatedReasoning };
            }
        }
        
        // Default to calling Flor
        const reasoning = t('ai_logic.decision_call_flor', { florPoints: myFlor });
        const blurbText = getRandomPhrase(PHRASE_KEYS.FLOR);
        return { action: { type: ActionType.DECLARE_FLOR, payload: { blurbText, player: 'ai' } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
    } else {
        // No Flor, proceed with normal Envido logic
        return getEnvidoCall(state, gamePressure);
    }
}