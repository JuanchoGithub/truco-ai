
import { GameState, ActionType, AiMove, Action, MessageObject, Card, AiArchetype } from '../../types';
import { findBestCardToPlay, findBaitCard } from './playCardStrategy';
import { getEnvidoResponseOptions, getFlorResponse } from './envidoStrategy';
import { getTrucoResponseOptions, getTrucoCall, calculateTrucoStrength, calculateTrucoMoveEV } from './trucoStrategy';
import { getCardName, getEnvidoDetails, calculateHandStrength, getCardHierarchy } from '../trucoLogic';
import { getRandomPhrase, PHRASE_KEYS } from './phrases';

interface EvaluatedMove extends AiMove {
    baseEv: number;
    modifiedEv: number;
}

const archetypeModifiers: Record<AiArchetype, Partial<Record<string, number>>> = {
    Aggressive: {
        CALL_ENVIDO: 1.4,
        CALL_REAL_ENVIDO: 4.0,
        CALL_FALTA_ENVIDO: 1.2,
        call_truco_parda_y_gano: 2.0,
        call_truco_certain_win: 2.0,
        CALL_RETRUCO: 1.7,
        CALL_VALE_CUATRO: 2.0,
        escalate_truco_bluff: 1.5,
        call_truco_bluff: 1.4,
        DECLINE: 0.6,
        discard_low: 0.8,
    },
    Cautious: {
        CALL_ENVIDO: 2.0,
        play_card_parda_y_gano: 1.5,
        play_card_certain_win: 1.5,
        DECLINE: 1.6, 
        CALL_REAL_ENVIDO: 0.4,
        CALL_FALTA_ENVIDO: 0.1,
        call_truco_parda_y_gano: 0.4,
        call_truco_certain_win: 0.4,
        CALL_RETRUCO: 0.5,
        call_truco_bluff: 0.1,
        accept_truco_bluff_call: 0.3, 
    },
    Deceptive: {
        call_envido_bluff: 2.2,
        call_truco_bluff: 2.0,
        play_card_parda_y_gano: 1.8, // slow-play bonus
        play_card_certain_win: 1.8,   // slow-play bonus
        call_truco_parda_y_gano: 0.6, // penalty for obvious move
        call_truco_certain_win: 0.6,  // penalty for obvious move
        bait_lopsided_hand: 2.5,
        parda_y_canto: 1.8,
        probe_low_value: 1.5,
        secure_hand: 0.8,
        accept_truco_trap: 5.0, // Huge bonus for smooth calling with the nuts
        escalate_truco_dominant_card: 0.2, // Reduce aggressive escalation to favor trap
    },
    Balanced: {
        CALL_ENVIDO: 1.8,
        CALL_REAL_ENVIDO: 1.2,
    },
};


const cardPlayEvMap: Record<string, number> = {
    play_card_parda_y_gano: 2.5,
    play_card_certain_win: 2.5,
    win_round_cheap: 1.5,
    secure_hand: 1.2,
    parda_y_canto: 0.8,
    probe_low_value: 0.2,
    probe_mid_value: 0.3,
    probe_sacrificial: 0.5,
    discard_low: -1.0,
    play_last_card: 0.1,
    default: 0,
};

function calculateBaseEV(move: AiMove, state: GameState, reasoningLog: MessageObject[], archetype: AiArchetype): number {
    const { action, reasonKey } = move;
    
    switch (action.type) {
        case ActionType.PLAY_CARD: {
            const { initialAiHand, mano, currentTrick } = state;
            const myEnvido = getEnvidoDetails(initialAiHand).value;
            const trucoStrength = calculateHandStrength(initialAiHand);
            const isLopsidedHand = myEnvido >= 30 && trucoStrength < 12;
            const isBaitOpportunity = isLopsidedHand && mano === 'ai' && currentTrick === 0;

            let strategicBaitBonus = 0;
            if (isBaitOpportunity && (reasonKey === 'probe_low_value' || reasonKey === 'probe_mid_value' || reasonKey === 'bait_lopsided_hand')) {
                strategicBaitBonus = 1.5;
                reasoningLog.push({ key: 'ai_logic.strategic_bait_bonus_check' });
                reasoningLog.push({ key: 'ai_logic.strategic_bait_bonus_applied', options: { bonus: strategicBaitBonus.toFixed(2) } });
            }
            
            return (cardPlayEvMap[reasonKey || 'default'] || 0) + strategicBaitBonus;
        }
        
        case ActionType.CALL_TRUCO:
        case ActionType.CALL_RETRUCO:
        case ActionType.CALL_VALE_CUATRO:
             if (reasonKey === 'call_truco_parda_y_gano' || reasonKey === 'call_truco_certain_win') {
                return 2.8; // High base value for a guaranteed win call
            }
            return calculateTrucoMoveEV(move, state);

        case ActionType.CALL_ENVIDO:
        case ActionType.CALL_REAL_ENVIDO:
        case ActionType.CALL_FALTA_ENVIDO: {
            const { value: myEnvido } = getEnvidoDetails(state.initialAiHand);
            const context = state.mano === 'ai' ? 'pie' : 'mano';
            const oppFoldRate = state.opponentModel.envidoBehavior[context].foldRate;
            const pointsOnDecline = state.envidoPointsOnOffer > 0 ? state.envidoPointsOnOffer : 1;
            
            let ev_if_accepted;
            const acceptanceChance = 1 - oppFoldRate;
            let pointsOnWin;
            let penaltyMultiplier = 0;

            switch (action.type) {
                case ActionType.CALL_REAL_ENVIDO:
                    pointsOnWin = (state.envidoPointsOnOffer > 0 ? state.envidoPointsOnOffer : 0) + 3;
                    penaltyMultiplier = 1.0;
                    break;
                case ActionType.CALL_FALTA_ENVIDO:
                    pointsOnWin = 15 - Math.max(state.aiScore, state.playerScore);
                    penaltyMultiplier = 2.0;

                    // --- SAFETY CHECK FOR FALTA ENVIDO ---
                    // Prevent suicide calls in early game with mediocre hands
                    const isEarlyGame = state.aiScore < 10 && state.playerScore < 10;
                    const opponentCanWinWithEnvido = state.playerScore + pointsOnWin >= 15;
                    
                    // If it's early game, or the opponent isn't threatening to win, we should be very strict.
                    // Only call Falta if we have the "nuts" (32+) or if we are desperate.
                    if (!opponentCanWinWithEnvido || isEarlyGame) {
                        if (myEnvido < 32) {
                            // Severe penalty for calling Falta with < 32 points unless defensive necessity
                            reasoningLog.push({ key: 'ai_logic.falta_suicide_prevention', options: { points: myEnvido } });
                            return -10.0; // Effectively bans the move
                        }
                    }
                    break;
                default: // CALL_ENVIDO
                    pointsOnWin = (state.envidoPointsOnOffer > 0 ? state.envidoPointsOnOffer : 0) + 2;
                    penaltyMultiplier = 0;
                    break;
            }

            if (reasonKey?.includes('bluff')) {
                ev_if_accepted = -pointsOnWin;
            } else {
                const estimatedOpponentPoints = state.opponentModel.envidoBehavior[context].callThreshold;
                const winProb = (myEnvido > estimatedOpponentPoints) ? 0.8 : 0.3;
                ev_if_accepted = (winProb * pointsOnWin) - ((1 - winProb) * pointsOnWin);
            }

            let trucoRiskPenalty = 0;
            const trucoStrength = calculateHandStrength(state.initialAiHand);
            if (trucoStrength < 12 && penaltyMultiplier > 0) {
                reasoningLog.push({ key: 'ai_logic.truco_risk_penalty_check', options: { trucoStrength } });
                const penaltyScale = (12 - trucoStrength) / 10;
                trucoRiskPenalty = 1.8 * penaltyScale * penaltyMultiplier;
                
                if (archetype === 'Aggressive') {
                    trucoRiskPenalty *= 0.1;
                }

                if (trucoRiskPenalty > 0) {
                     reasoningLog.push({ key: 'ai_logic.truco_risk_penalty_applied', options: { penalty: trucoRiskPenalty.toFixed(2) } });
                }
            }
            
            let weightedEv = (acceptanceChance * ev_if_accepted) + ((1 - acceptanceChance) * pointsOnDecline);
            
             // Boost for round 1 aggressive/deceptive opening (Loose Table Image)
            if (state.round === 1 && (archetype === 'Aggressive' || archetype === 'Deceptive') && action.type === ActionType.CALL_ENVIDO) {
                 const bonus = 0.6;
                 weightedEv += bonus;
                 reasoningLog.push({ key: 'ai_logic.table_image_bonus', options: { bonus: bonus.toFixed(1) } });
            }

            return weightedEv - trucoRiskPenalty;
        }

        case ActionType.ACCEPT: {
            if (state.gamePhase.includes('truco')) {
                if (reasonKey === 'accept_truco_trap') {
                    return 3.0; // Very high EV for trapping with the nuts
                }
                const { strength } = calculateTrucoStrength(state);
                const pointsOnLine = state.trucoLevel === 0 ? 1 : state.trucoLevel;
                const pointsOnWin = pointsOnLine + 1;
                return (strength * pointsOnWin) - ((1 - strength) * pointsOnWin);
            }
            if (state.gamePhase.includes('envido')) {
                const { value: myEnvido } = getEnvidoDetails(state.initialAiHand);
                const context = state.mano === 'ai' ? 'pie' : 'mano';
                const estimatedOpponentPoints = state.opponentModel.envidoBehavior[context].callThreshold;
                
                let winProb = 0.5; 
                
                if (myEnvido > estimatedOpponentPoints) {
                    // We are above their average call threshold -> Good chance
                    winProb = 0.7 + Math.min(0.25, (myEnvido - estimatedOpponentPoints) * 0.05);
                } else {
                    // We are below. How much below?
                    const diff = estimatedOpponentPoints - myEnvido;
                    // If we have very few points, chance is abysmal.
                    if (myEnvido < 20) winProb = 0.05;
                    else if (myEnvido < 24) winProb = 0.15;
                    else winProb = Math.max(0.1, 0.4 - (diff * 0.05));
                }

                return (winProb * state.envidoPointsOnOffer) - ((1 - winProb) * state.envidoPointsOnOffer);
            }
            return 0.1;
        }

        case ActionType.DECLINE: {
             if (state.gamePhase.includes('truco')) {
                return -(state.trucoLevel);
            }
            if (state.gamePhase.includes('envido')) {
                return -(state.previousEnvidoPoints > 0 ? state.previousEnvidoPoints : 1);
            }
            return -0.1;
        }
        
        default:
            return 0;
    }
}

function evaluateMoves(moves: AiMove[], state: GameState): AiMove {
    const { aiArchetype } = state;
    const modifiers = archetypeModifiers[aiArchetype];
    
    const evaluationReasoning: MessageObject[] = [];

    const evaluatedMoves: EvaluatedMove[] = moves.map(move => {
        const moveReasoningLog: MessageObject[] = [];
        const baseEv = calculateBaseEV(move, state, moveReasoningLog, aiArchetype);
        const modifierKey = move.reasonKey || move.action.type;
        let modifier = modifiers[modifierKey] || 1.0;

        if (move.action.type === ActionType.DECLINE && baseEv >= 0) {
            modifier = 1.0;
        }

        const modifiedEv = baseEv * modifier;
        
        move.reasoning.push(...moveReasoningLog);
        
        return { ...move, baseEv, modifiedEv };
    });

    evaluatedMoves.sort((a, b) => b.modifiedEv - a.modifiedEv);
    const bestMove = evaluatedMoves[0];

    evaluationReasoning.push({ key: 'ai_logic.archetype_selection', options: { archetype: aiArchetype } });
    evaluationReasoning.push({ key: 'ai_logic.best_move_selection' });
    evaluationReasoning.push({ key: 'ai_logic.considering_options', options: { count: evaluatedMoves.length } });
    
    evaluatedMoves.forEach(m => {
        const modifierKey = m.reasonKey || m.action.type;
        const modifier = modifiers[modifierKey] || 1.0;
        evaluationReasoning.push({ key: 'ai_logic.option_ev_detailed', options: { 
            moveName: m.reasonKey || m.action.type, 
            baseEv: m.baseEv.toFixed(2),
            modifier: modifier.toFixed(2),
            finalEv: m.modifiedEv.toFixed(2) 
        }});
    });
    
    evaluationReasoning.push({ key: 'ai_logic.final_decision', options: { moveName: bestMove.reasonKey || bestMove.action.type } });

    bestMove.reasoning.push(...evaluationReasoning);

    return bestMove;
}


export const getLocalAIMove = (state: GameState): AiMove => {
    const { gamePhase, currentTurn, lastCaller, currentTrick, hasEnvidoBeenCalledThisRound, aiHasFlor, playerHasFlor, hasFlorBeenCalledThisRound, playerTricks, aiTricks, trickWinners, aiScore, playerScore, opponentModel, trucoLevel, mano, isFlorEnabled } = state;
    let reasoning: (string | MessageObject)[] = [];
    let moves: AiMove[] = [];

    const maxScore = Math.max(aiScore, playerScore);
    const scoreDiff = aiScore - playerScore;
    const isEndGame = maxScore >= 12;
    let gamePressure = 0;

    if (isEndGame) {
        if (scoreDiff === 0) gamePressure = 1.0;
        else gamePressure = -scoreDiff / 3.0; 
    } else {
        gamePressure = -scoreDiff / 15.0;
    }
    gamePressure = Math.max(-1.0, Math.min(1.0, gamePressure));
    reasoning.push({ key: 'ai_logic.strategic_analysis' });
    const pressureStatusKey = gamePressure > 0.5 ? 'desperate' : gamePressure < -0.5 ? 'cautious' : 'neutral';
    reasoning.push({ key: 'ai_logic.game_pressure', options: { pressure: gamePressure.toFixed(2), statusKey: pressureStatusKey } });
    reasoning.push({ key: 'ai_logic.separator' });

    if (gamePhase.includes('_called') && currentTurn === 'ai' && lastCaller === 'player') {
        reasoning.push({ key: 'ai_logic.response_logic' });
        reasoning.push({ key: 'ai_logic.player_called', options: { call: gamePhase.replace('_called', '').toUpperCase() } });

        if (gamePhase === 'flor_called' || gamePhase === 'contraflor_called') {
            const florMove = getFlorResponse(state, reasoning);
            if (florMove) return florMove; 
        }
        
        if (gamePhase === 'truco_called' && currentTrick === 0 && !hasEnvidoBeenCalledThisRound) {
            if (aiHasFlor && isFlorEnabled) {
                const florReasoning: MessageObject[] = [{ key: 'ai_logic.flor_priority_on_truco' }];
                const blurbText = getRandomPhrase(PHRASE_KEYS.FLOR);
                return { action: { type: ActionType.DECLARE_FLOR, payload: { blurbText } }, reasoning: florReasoning, reasonKey: 'call_flor' };
            }
             if (!(playerHasFlor && isFlorEnabled) && !(aiHasFlor && isFlorEnabled)) {
                moves.push({ action: { type: ActionType.CALL_ENVIDO, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.ENVIDO) }}, reasoning: [], reasonKey: 'CALL_ENVIDO' });
                moves.push({ action: { type: ActionType.CALL_REAL_ENVIDO, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.REAL_ENVIDO) }}, reasoning: [], reasonKey: 'CALL_REAL_ENVIDO' });
                moves.push({ action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.FALTA_ENVIDO) }}, reasoning: [], reasonKey: 'CALL_FALTA_ENVIDO' });
            }
        }
        
        if (gamePhase === 'envido_called') {
            if (aiHasFlor && isFlorEnabled) {
                const florReasoning: MessageObject[] = [{ key: 'ai_logic.flor_priority_on_envido' }];
                const blurbText = getRandomPhrase(PHRASE_KEYS.FLOR);
                return { action: { type: ActionType.RESPOND_TO_ENVIDO_WITH_FLOR, payload: { blurbText } }, reasoning: florReasoning, reasonKey: 'respond_with_flor' };
            }
            moves.push(...getEnvidoResponseOptions(state, gamePressure, reasoning));
        }

        if (gamePhase.includes('truco') || gamePhase.includes('vale_cuatro')) {
            moves.push(...getTrucoResponseOptions(state, gamePressure, reasoning));
        }
        
        if (moves.length > 0) return evaluateMoves(moves, state);
    }

    let candidateMoves: AiMove[] = [];
    
    const cardPlayMove = findBestCardToPlay(state);
    // FIX: Add a guard to handle the 'NO_OP' action returned when the AI has no cards.
    if ((cardPlayMove.action as any).type === 'NO_OP') {
        // This should not happen in a real game as the reducer would have ended the round.
        // But as a safeguard in simulation, we return it.
        return cardPlayMove;
    }
    candidateMoves.push(cardPlayMove);

    const isPardaYGano = cardPlayMove.reasonKey === 'play_card_parda_y_gano';
    const isCertainWin = cardPlayMove.reasonKey === 'play_card_certain_win';

    if ((isPardaYGano || isCertainWin) && trucoLevel < 3 && lastCaller !== 'ai') {
        let actionType: ActionType;
        let phrases: string;
        if (trucoLevel === 0) { actionType = ActionType.CALL_TRUCO; phrases = PHRASE_KEYS.TRUCO; } 
        else if (trucoLevel === 1) { actionType = ActionType.CALL_RETRUCO; phrases = PHRASE_KEYS.RETRUCO; } 
        else { actionType = ActionType.CALL_VALE_CUATRO; phrases = PHRASE_KEYS.VALE_CUATRO; }
        
        const trucoContext = { strength: 1.0, isBluff: false };
        const reasonKey = isPardaYGano ? 'call_truco_parda_y_gano' : 'call_truco_certain_win';

        const trucoCallMove: AiMove = {
            action: { type: actionType, payload: { blurbText: getRandomPhrase(phrases), trucoContext } },
            reasoning: cardPlayMove.reasoning, // Use the same base reasoning
            reasonKey,
            strategyCategory: 'aggressive'
        };
        candidateMoves.push(trucoCallMove);
    }

    const canSing = !hasEnvidoBeenCalledThisRound && currentTrick === 0 && state.aiTricks[0] === null;
    if (canSing) {
        if (aiHasFlor && isFlorEnabled) {
             const blurbText = getRandomPhrase(PHRASE_KEYS.FLOR);
             candidateMoves.push({ action: { type: ActionType.DECLARE_FLOR, payload: { blurbText } }, reasoning: [{ key: 'ai_logic.flor_call_mandatory' }], reasonKey: 'call_flor' });
        } else if (!(playerHasFlor && isFlorEnabled) && !(aiHasFlor && isFlorEnabled)) {
             candidateMoves.push({ action: { type: ActionType.CALL_ENVIDO, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.ENVIDO) }}, reasoning: [], reasonKey: 'CALL_ENVIDO' });
             candidateMoves.push({ action: { type: ActionType.CALL_REAL_ENVIDO, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.REAL_ENVIDO) }}, reasoning: [], reasonKey: 'CALL_REAL_ENVIDO' });
             candidateMoves.push({ action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.FALTA_ENVIDO) }}, reasoning: [], reasonKey: 'CALL_FALTA_ENVIDO' });
        }
    }
    
    if (!gamePhase.includes('envido') && !gamePhase.includes('flor')) {
        const trucoMove = getTrucoCall(state, gamePressure);
        if (trucoMove) candidateMoves.push(trucoMove);
    }
    
    candidateMoves = candidateMoves.filter((move, index, self) => 
        index === self.findIndex((m) => JSON.stringify(m.action) === JSON.stringify(move.action))
    );
    
    return evaluateMoves(candidateMoves, state);
};
