
import { GameState, AiMove, ActionType, MessageObject } from '../../types';
import { getEnvidoDetails, getFlorValue, hasFlor } from '../trucoLogic';
import { getRandomPhrase, PHRASE_KEYS } from './phrases';
import i18nService from '../i18nService';

// Helper for getEnvidoResponse: Estimates opponent's strength based on their call.
const estimateOpponentStrengthOnCall = (state: GameState): number => {
    const { opponentModel, hasFaltaEnvidoBeenCalledThisSequence, hasRealEnvidoBeenCalledThisSequence, envidoPointsOnOffer } = state;
    const playerContext = state.mano === 'player' ? 'mano' : 'pie';
    let estimate = opponentModel.envidoBehavior[playerContext].callThreshold || 27;

    // Falta Envido is the highest possible call, implies very high confidence.
    if (hasFaltaEnvidoBeenCalledThisSequence) {
        estimate = Math.max(estimate, 31); // Assume at least 31 for a Falta call.
    } 
    // Real Envido is a strong escalation.
    else if (hasRealEnvidoBeenCalledThisSequence) {
        estimate = Math.max(estimate, 29); // Assume at least 29 for a Real Envido.
    }
    // Envido-Envido (4 points) also implies strength.
    else if (envidoPointsOnOffer >= 4) {
        estimate = Math.max(estimate, 28);
    }
    
    return estimate;
};

export const getEnvidoResponse = (state: GameState, gamePressure: number, reasoning: (string | MessageObject)[]): AiMove | null => {
    const { t } = i18nService;
    const { initialAiHand, aiScore, mano, envidoPointsOnOffer, hasRealEnvidoBeenCalledThisSequence, hasFaltaEnvidoBeenCalledThisSequence, opponentModel } = state;
    
    const aiEnvidoDetails = getEnvidoDetails(initialAiHand);
    reasoning.push(...aiEnvidoDetails.reasoning);
    let myEnvido = aiEnvidoDetails.value;

    if (mano === 'ai') {
        myEnvido += 0.5; // Mano bonus for winning ties
        reasoning.push({ key: 'ai_logic.mano_bonus' });
    }

    const estimatedOpponentEnvido = estimateOpponentStrengthOnCall(state);
    reasoning.push({ key: 'ai_logic.opponent_model_envido_call', options: { pointsOnOffer: envidoPointsOnOffer, estimatedOpponentEnvido: estimatedOpponentEnvido.toFixed(1) } });
    
    const advantage = (myEnvido - estimatedOpponentEnvido) / 33;
    reasoning.push({ key: 'ai_logic.advantage_calculated', options: { advantage: (advantage * 100).toFixed(0) } });

    const randomFactor = Math.random();
    const aiPointsToWin = 15 - aiScore;

    // Decision thresholds are now adjusted by gamePressure
    const escalateAdvantageThreshold = 0.15 - (gamePressure * 0.1); // Escalate more easily when desperate
    const acceptAdvantageThreshold = -0.1 - (gamePressure * 0.15); // Accept more easily when desperate
    const heroCallChance = 0.15 + (gamePressure > 0 ? gamePressure * 0.2 : 0); // Hero call more when desperate

    // --- Escalation Logic ---
    // Only consider escalating if Falta Envido hasn't been called yet.
    if (!hasFaltaEnvidoBeenCalledThisSequence && advantage > escalateAdvantageThreshold) {
        
        // NEW: Slow-play tactic. Sometimes, just accept even with a monster hand to set a trap.
        const slowPlayChance = 0.25; // 25% chance to slow-play
        if (myEnvido >= 31 && randomFactor < slowPlayChance) {
            reasoning.push({ key: 'ai_logic.slow_play_tactic' });
            return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.QUIERO) } }, reasoning, reasonKey: 'accept_envido_slow_play' };
        }
        
        if (aiPointsToWin <= envidoPointsOnOffer + 3 && myEnvido >= 30) {
             reasoning.push({ key: 'ai_logic.decision_falta_huge_advantage' });
             const blurbText = getRandomPhrase(PHRASE_KEYS.FALTA_ENVIDO);
             return { action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText } }, reasoning, reasonKey: 'escalate_falta_win_game' };
        }
        if (envidoPointsOnOffer === 2 && myEnvido >= 28) { // Only escalate with Envido-Envido if hand is strong
            reasoning.push({ key: 'ai_logic.decision_envido_response_strong' });
            const blurbText = getRandomPhrase(PHRASE_KEYS.ENVIDO);
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning, reasonKey: 'escalate_envido_strong' };
        }
        if (!hasRealEnvidoBeenCalledThisSequence) {
             reasoning.push({ key: 'ai_logic.decision_real_envido_stronger' });
             const blurbText = getRandomPhrase(PHRASE_KEYS.REAL_ENVIDO);
             return { action: { type: ActionType.CALL_REAL_ENVIDO, payload: { blurbText } }, reasoning, reasonKey: 'escalate_real_stronger' };
        }
    } 
    
    // --- Accept/Decline Logic ---
    if (advantage > acceptAdvantageThreshold) {
        
        // --- MIXED STRATEGY FOR MEDIUM HANDS (25-29) TO AVOID PREDICTABILITY ---
        const isMediumHand = myEnvido >= 25 && myEnvido <= 29;
        if (isMediumHand) {
            const playerContext = mano === 'ai' ? 'pie' : 'mano';
            const opponentFoldRate = opponentModel.envidoBehavior[playerContext].foldRate;

            // Bluff-Escalate Tactic
            const baseBluffEscalateChance = 0.15;
            const pressureBonusEscalate = gamePressure > 0.3 ? gamePressure * 0.2 : 0; // More likely when desperate
            const bluffEscalateChance = baseBluffEscalateChance + pressureBonusEscalate;

            // Bluff-Fold Tactic
            const baseBluffFoldChance = 0.10;
            const pressureBonusFold = gamePressure < -0.3 ? Math.abs(gamePressure) * 0.15 : 0; // More likely when cautious
            const bluffFoldChance = baseBluffFoldChance + pressureBonusFold;

            if (randomFactor < bluffEscalateChance) {
                reasoning.push({ key: 'ai_logic.bluff_escalate_analysis', options: { myEnvido: myEnvido.toFixed(1) } });
                reasoning.push({ key: 'ai_logic.bluff_escalate_chance', options: { chance: (bluffEscalateChance * 100).toFixed(0) } });
                reasoning.push({ key: 'ai_logic.decision_bluff_escalate' });
                
                // Choose what to escalate with. Real Envido is a strong bluff.
                if (!hasRealEnvidoBeenCalledThisSequence && randomFactor < bluffEscalateChance / 2) { // 50% of the time, use a stronger bluff
                    const blurbText = getRandomPhrase(PHRASE_KEYS.REAL_ENVIDO);
                    return { action: { type: ActionType.CALL_REAL_ENVIDO, payload: { blurbText } }, reasoning, reasonKey: 'escalate_real_bluff' };
                } else if (envidoPointsOnOffer === 2) { // Only escalate with Envido-Envido if it's a simple envido
                    const blurbText = getRandomPhrase(PHRASE_KEYS.ENVIDO);
                    return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning, reasonKey: 'escalate_envido_bluff' };
                }
            } else if (randomFactor > (1 - bluffFoldChance)) {
                reasoning.push({ key: 'ai_logic.bluff_fold_tactic' });
                return { action: { type: ActionType.DECLINE, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.NO_QUIERO) } }, reasoning, reasonKey: 'decline_envido_bluff_fold' };
            }
        }
        // END MIXED STRATEGY

        reasoning.push({ key: 'ai_logic.decision_accept_envido' });
        return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.QUIERO) } }, reasoning, reasonKey: 'accept_envido_good_odds' };
    }

    // Low advantage -> Mostly Decline, with a chance for a hero call
    reasoning.push({ key: 'ai_logic.hand_seems_weaker' });
    
    // --- NEW: High-Value Hand Protection (User Request) ---
    // Never fold a very strong hand just because the opponent escalated aggressively.
    const highValueThreshold = 30;
    if (aiEnvidoDetails.value >= highValueThreshold) {
        reasoning.push({ key: 'ai_logic.high_value_hand_protection_accept', options: { myEnvido: aiEnvidoDetails.value, threshold: highValueThreshold } });
        return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.QUIERO) } }, reasoning, reasonKey: 'accept_envido_high_value_override' };
    }

    if (myEnvido >= 23 && randomFactor < heroCallChance) {
         reasoning.push({ key: 'ai_logic.decision_hero_call', options: { chance: (heroCallChance * 100).toFixed(0) } });
         return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.QUIERO) } }, reasoning, reasonKey: 'accept_envido_hero_call' };
    }
    
    reasoning.push({ key: 'ai_logic.decision_decline_envido' });
    return { action: { type: ActionType.DECLINE, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.NO_QUIERO) } }, reasoning, reasonKey: 'decline_envido_weak' };
};

export const getEnvidoCall = (state: GameState, gamePressure: number): AiMove | null => {
    const { t } = i18nService;
    const { initialAiHand, playerScore, aiScore, mano, opponentModel } = state;
    
    const aiEnvidoDetails = getEnvidoDetails(initialAiHand);
    let myEnvido = aiEnvidoDetails.value;
    let reasonPrefix: (string | MessageObject)[] = [{ key: 'ai_logic.envido_call_logic' }, ...aiEnvidoDetails.reasoning];

    if (mano === 'ai') {
        myEnvido += 0.5; // Mano bonus
        reasonPrefix.push({ key: 'ai_logic.mano_bonus' });
    }

    const randomFactor = Math.random();
    const playerPointsToWin = 15 - playerScore;
    const aiPointsToWin = 15 - aiScore;
    
    const playerContext = state.mano === 'player' ? 'mano' : 'pie';
    const opponentContextualBehavior = opponentModel.envidoBehavior[playerContext];
    
    // AI's calling threshold is now dynamic based on game pressure
    const dynamicCallThreshold = opponentContextualBehavior.callThreshold - (gamePressure * 3); // More desperate -> lower threshold
    reasonPrefix.push({ key: 'ai_logic.opponent_model_context', options: { context: playerContext.toUpperCase(), threshold: opponentContextualBehavior.callThreshold.toFixed(1), dynamicThreshold: dynamicCallThreshold.toFixed(1) } });

    const isObjectivelyStrong = myEnvido >= 28;
    reasonPrefix.push({ key: 'ai_logic.objectively_strong_hand', options: { isStrong: isObjectivelyStrong ? t('ai_logic.is_strong.yes') : t('ai_logic.is_strong.no') } });

    // High strength hand -> Escalate
    if (myEnvido >= 30) {
        if (aiPointsToWin <= 5 && randomFactor < 0.75) {
            const blurbText = getRandomPhrase(PHRASE_KEYS.FALTA_ENVIDO);
            const reasoning = { key: 'ai_logic.decision_falta_win', options: { envidoPoints: myEnvido.toFixed(1) } };
            return { action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning], reasonKey: 'call_falta_win_game' };
        } else {
            const blurbText = getRandomPhrase(PHRASE_KEYS.REAL_ENVIDO);
            const reasoning = { key: 'ai_logic.decision_real_envido_dominant', options: { envidoPoints: myEnvido.toFixed(1) } };
            return { action: { type: ActionType.CALL_REAL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning], reasonKey: 'call_real_dominant' };
        }
    } 
    // Strong hand -> Standard call
    else if (isObjectivelyStrong || myEnvido >= dynamicCallThreshold) {
        if (playerPointsToWin <= 3 && myEnvido >= 28) {
             const blurbText = getRandomPhrase(PHRASE_KEYS.FALTA_ENVIDO);
             const reasoning = { key: 'ai_logic.decision_falta_defensive', options: { envidoPoints: myEnvido.toFixed(1) } };
             return { action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning], reasonKey: 'call_falta_defensive' };
        } else {
            const blurbText = getRandomPhrase(PHRASE_KEYS.ENVIDO);
            const reason = isObjectivelyStrong ? t('ai_logic.reasons.objectively_good') : t('ai_logic.reasons.above_threshold');
            const reasoning = { key: 'ai_logic.decision_envido_strong', options: { envidoPoints: myEnvido.toFixed(1), reason } };
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning], reasonKey: 'call_envido_strong' };
        }
    }
    // Marginal hand -> Occasional call
    else if (myEnvido >= 23) {
        const marginalCallChance = 0.15;
        if (randomFactor < marginalCallChance) {
            const blurbText = getRandomPhrase(PHRASE_KEYS.ENVIDO);
            const reasoning = { key: 'ai_logic.decision_envido_marginal', options: { envidoPoints: myEnvido.toFixed(1) } };
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning], reasonKey: 'call_envido_marginal' };
        }
    }
    // Low strength hand -> Bluffing
    else {
        const baseBluffChance = 0.08;
        // More desperate -> higher bluff chance. Cautious -> lower bluff chance.
        const adjustedBluffChance = Math.min(0.4, baseBluffChance + (opponentContextualBehavior.foldRate * 0.3) + (gamePressure > 0 ? gamePressure * 0.15 : 0));
        
        if (randomFactor < adjustedBluffChance) {
            const blurbText = getRandomPhrase(PHRASE_KEYS.ENVIDO);
            reasonPrefix.push({ key: 'ai_logic.adjusted_bluff_chance', options: { chance: (adjustedBluffChance * 100).toFixed(0) } });
            const reasoning = { key: 'ai_logic.decision_envido_bluff', options: { envidoPoints: myEnvido.toFixed(1) } };
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning], reasonKey: 'call_envido_bluff' };
        }
    }
    
    return null; // No action
};

export const getFlorResponse = (state: GameState, reasoning: (string | MessageObject)[]): AiMove | null => {
    const { t } = i18nService;
    const { gamePhase, initialAiHand, aiHasFlor, playerHasFlor, aiScore } = state;

    if (gamePhase === 'flor_called') {
        reasoning.push({ key: 'ai_logic.flor_response_logic' });
        if (aiHasFlor) {
            const myFlor = getFlorValue(initialAiHand);
            reasoning.push({ key: 'ai_logic.flor_response_i_have_flor', options: { florPoints: myFlor } });
            // Simple strategy: if my Flor is very good, I escalate.
            if (myFlor >= 30) {
                 const decisionReason = { key: 'ai_logic.decision_contraflor_strong' };
                 return { action: { type: ActionType.CALL_CONTRAFLOR, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.CONTRAFLOR) } }, reasoning: [...reasoning, decisionReason], reasonKey: 'call_contraflor_strong' };
            } else {
                 const decisionReason = { key: 'ai_logic.decision_ack_flor_weak' };
                 return { action: { type: ActionType.ACKNOWLEDGE_FLOR, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.FLOR_ACK_MINE_WORSE) } }, reasoning: [...reasoning, decisionReason], reasonKey: 'ack_flor_weak' };
            }
        } else {
            const decisionReason = { key: 'ai_logic.decision_ack_flor_no_flor' };
            return { action: { type: ActionType.ACKNOWLEDGE_FLOR, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.FLOR_ACK_GOOD) } }, reasoning: [...reasoning, decisionReason], reasonKey: 'ack_flor_no_flor' };
        }
    }

    if (gamePhase === 'contraflor_called') {
        reasoning.push({ key: 'ai_logic.contraflor_response_logic' });
        const myFlor = getFlorValue(initialAiHand);
        reasoning.push({ key: 'ai_logic.contraflor_response_my_flor', options: { florPoints: myFlor } });
        
        // --- NEW: Score-aware logic ---
        const pointsFromContraflor = 6;
        const canWinGame = (aiScore + pointsFromContraflor) >= 15;
        let acceptanceThreshold = 32; // Default conservative threshold

        if (canWinGame) {
            acceptanceThreshold = 30; // Lower threshold for a game-winning gamble
            reasoning.push({ key: 'ai_logic.score_analysis', options: { points: pointsFromContraflor, totalScore: aiScore + pointsFromContraflor } });
            reasoning.push({ key: 'ai_logic.strategy_risk', options: { threshold: acceptanceThreshold } });
        } else {
             reasoning.push({ key: 'ai_logic.strategy_conservative', options: { threshold: acceptanceThreshold } });
        }
        // --- END NEW LOGIC ---

        if (myFlor >= acceptanceThreshold) {
            const decisionReason = { key: 'ai_logic.decision_accept_contraflor', options: { florPoints: myFlor, threshold: acceptanceThreshold } };
            return { action: { type: ActionType.ACCEPT_CONTRAFLOR, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.CONTRAFLOR_QUIERO) } }, reasoning: [...reasoning, decisionReason], reasonKey: 'accept_contraflor_strong' };
        } else {
            const decisionReason = { key: 'ai_logic.decision_decline_contraflor', options: { florPoints: myFlor } };
            return { action: { type: ActionType.DECLINE_CONTRAFLOR, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.CONTRAFLOR_NO_QUIERO) } }, reasoning: [...reasoning, decisionReason], reasonKey: 'decline_contraflor_weak' };
        }
    }

    return null;
};


export const getFlorCallOrEnvidoCall = (state: GameState, gamePressure: number): AiMove | null => {
    const { t } = i18nService;
    if (state.isFlorEnabled && state.aiHasFlor) {
        const myFlor = getFlorValue(state.initialAiHand);
        let reasonPrefix: (string | MessageObject)[] = [{ key: 'ai_logic.flor_or_envido_logic' }, { key: 'ai_logic.flor_or_envido_i_have_flor', options: { florPoints: myFlor } }];
        
        // Strategic decision: call Flor or bluff Envido
        if (myFlor < 26 && Math.random() < 0.4) { // 40% chance to bluff with a weak Flor
            reasonPrefix.push({ key: 'ai_logic.flor_or_envido_bluff_consider' });
            const envidoMove = getEnvidoCall(state, gamePressure);
            if (envidoMove) {
                const updatedReasoning = [...reasonPrefix, { key: 'ai_logic.bluffing_with_envido' }, ...envidoMove.reasoning];
                return { ...envidoMove, reasoning: updatedReasoning };
            }
        }
        
        // Default to calling Flor
        const reasoning = { key: 'ai_logic.decision_call_flor', options: { florPoints: myFlor } };
        const blurbText = getRandomPhrase(PHRASE_KEYS.FLOR);
        return { action: { type: ActionType.DECLARE_FLOR, payload: { blurbText, player: 'ai' } }, reasoning: [...reasonPrefix, reasoning], reasonKey: 'call_flor_strong' };
    } else {
        // No Flor, proceed with normal Envido logic
        return getEnvidoCall(state, gamePressure);
    }
}
