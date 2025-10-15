import { GameState, ActionType, AiMove, Action, MessageObject } from '../types';
import { findBestCardToPlay } from './ai/playCardStrategy';
import { getEnvidoResponse, getEnvidoCall, getFlorResponse, getFlorCallOrEnvidoCall } from './ai/envidoStrategy';
// Fix: Imported `calculateTrucoStrength` to resolve a "Cannot find name" error.
import { getTrucoResponse, getTrucoCall, calculateTrucoStrength } from './ai/trucoStrategy';
import { getCardName, getEnvidoDetails, calculateHandStrength, getCardHierarchy } from './trucoLogic';
import { getRandomPhrase, PHRASE_KEYS } from './ai/phrases';

export const getLocalAIMove = (state: GameState): AiMove => {
    const { gamePhase, currentTurn, lastCaller, currentTrick, hasEnvidoBeenCalledThisRound, aiHasFlor, playerHasFlor, hasFlorBeenCalledThisRound, playerTricks, aiTricks, trickWinners, aiScore, playerScore, opponentModel, trucoLevel, mano } = state;
    let reasoning: (string | MessageObject)[] = [];
    let move: AiMove | null = null;

    // --- NEW: Game Pressure Calculation ---
    const maxScore = Math.max(aiScore, playerScore);
    const scoreDiff = aiScore - playerScore;
    const isEndGame = maxScore >= 12;
    let gamePressure = 0; // -1.0 (Cautious) to 1.0 (Desperate)

    if (isEndGame) {
        if (scoreDiff === 0) {
            gamePressure = 1.0; // Max desperation in a tied endgame
        } else {
            // More sensitive scaling in endgame
            gamePressure = -scoreDiff / 3.0; 
        }
    } else {
        // Standard scaling in early/mid game
        gamePressure = -scoreDiff / 15.0;
    }
    gamePressure = Math.max(-1.0, Math.min(1.0, gamePressure));
    reasoning.push({ key: 'ai_logic.strategic_analysis' });
    const pressureStatusKey = gamePressure > 0.5 ? 'desperate' : gamePressure < -0.5 ? 'cautious' : 'neutral';
    reasoning.push({ key: 'ai_logic.game_pressure', options: { pressure: gamePressure.toFixed(2), statusKey: pressureStatusKey } });
    reasoning.push({ key: 'ai_logic.separator' });


    // Recap the previous trick if it's not the first trick
    if (currentTrick > 0) {
        const lastTrickIndex = currentTrick - 1;
        const playerCard = playerTricks[lastTrickIndex];
        const aiCard = aiTricks[lastTrickIndex];
        const winner = trickWinners[lastTrickIndex];

        if (playerCard && aiCard && winner) {
            reasoning.push({ key: 'ai_logic.trick_summary', options: { trickNumber: lastTrickIndex + 1 } });
            reasoning.push({ key: 'ai_logic.player_played', options: { cardName: getCardName(playerCard) } });
            reasoning.push({ key: 'ai_logic.ai_played', options: { cardName: getCardName(aiCard) } });
            reasoning.push({ key: 'ai_logic.result', options: { outcome: winner } });
            reasoning.push({ key: 'ai_logic.separator' });
        }
    }

    // 1. MUST RESPOND to a player's call
    if (gamePhase.includes('_called') && currentTurn === 'ai' && lastCaller === 'player') {
        reasoning.push({ key: 'ai_logic.response_logic' });
        reasoning.push({ key: 'ai_logic.player_called', options: { call: gamePhase.replace('_called', '').toUpperCase() } });

        // Flor response logic
        if (gamePhase === 'flor_called' || gamePhase === 'contraflor_called') {
            move = getFlorResponse(state, reasoning);
            if (move) return move;
        }
        
        // FIX: Broaden the condition for "Envido Primero". It can be called as long as the first trick isn't over.
        const canCallEnvidoPrimero = gamePhase === 'truco_called' && currentTrick === 0 && !hasEnvidoBeenCalledThisRound;
        if (canCallEnvidoPrimero) {
            // If AI has flor, it must respond with flor.
            if (aiHasFlor) {
                const blurbText = getRandomPhrase(PHRASE_KEYS.FLOR);
                return {
                    action: { type: ActionType.DECLARE_FLOR, payload: { blurbText } },
                    reasoning: [{ key: 'ai_logic.flor_priority_on_truco' }]
                };
            }
            const envidoCallDecision = getEnvidoCall(state, gamePressure);
            if (envidoCallDecision) {
                 const blurbText = getRandomPhrase(PHRASE_KEYS.ENVIDO_PRIMERO);
                 const updatedReasoning: (string | MessageObject)[] = [{ key: 'ai_logic.envido_primero_logic' }, ...envidoCallDecision.reasoning];
                 // FIX: Preserve the original envido action type (Envido, Real Envido, Falta Envido)
                 // instead of hardcoding it to a simple Envido.
                 const originalAction = envidoCallDecision.action;
                 let newAction: AiMove['action'];

                 switch (originalAction.type) {
                     case ActionType.CALL_ENVIDO:
                         newAction = { type: ActionType.CALL_ENVIDO, payload: { blurbText } };
                         break;
                     case ActionType.CALL_REAL_ENVIDO:
                         newAction = { type: ActionType.CALL_REAL_ENVIDO, payload: { blurbText } };
                         break;
                     case ActionType.CALL_FALTA_ENVIDO:
                         newAction = { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText } };
                         break;
                     default:
                         newAction = { type: ActionType.CALL_ENVIDO, payload: { blurbText } };
                         break;
                 }
                 return { ...envidoCallDecision, reasoning: updatedReasoning, action: newAction };
            }
        }
        
        if (gamePhase === 'envido_called') {
            // Check for Flor response to Envido
            if (aiHasFlor) {
                const blurbText = getRandomPhrase(PHRASE_KEYS.FLOR);
                return {
                    action: { type: ActionType.RESPOND_TO_ENVIDO_WITH_FLOR, payload: { blurbText } },
                    reasoning: [{ key: 'ai_logic.flor_priority_on_envido' }]
                };
            }
            move = getEnvidoResponse(state, gamePressure, reasoning);
        }

        if (gamePhase.includes('truco') || gamePhase.includes('vale_cuatro')) {
            move = getTrucoResponse(state, gamePressure, reasoning);
        }
        if (move) return move;
    }

    // 2. DECIDE TO MAKE A CALL
    if (!gamePhase.includes('_called')) {
        let singingMove: AiMove | null = null;
        let trucoMove: AiMove | null = null;
        
        const canSing = !hasEnvidoBeenCalledThisRound && currentTrick === 0 && state.aiTricks[0] === null;
        if (canSing) {
            singingMove = getFlorCallOrEnvidoCall(state, gamePressure);
        }
        
        if (!gamePhase.includes('envido') && !gamePhase.includes('flor')) {
            trucoMove = getTrucoCall(state, gamePressure);
        }

        // --- NEW: Post-Envido Bait Tactic ---
        // Overrides an immediate Truco call with a baiting card play if conditions are right.
        if (trucoMove?.action.type === ActionType.CALL_TRUCO && hasEnvidoBeenCalledThisRound && currentTrick === 0 && mano === 'ai') {
            const handStrength = calculateHandStrength(state.initialAiHand);
            
            // Condition: Strong hand and has a significantly weaker card to lead with.
            if (handStrength > 20) {
                const sortedHand = [...state.aiHand].sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
                const weakestCard = sortedHand[0];
                const strongestCard = sortedHand[sortedHand.length - 1];

                // Ensure there's a power gap to make the bait worthwhile
                if (getCardHierarchy(strongestCard) - getCardHierarchy(weakestCard) > 5) {
                    let baitProbability = 0.70; // High chance to try this tactic
                    const baitReasoning: MessageObject[] = [
                        { key: 'ai_logic.post_envido_bait_title' },
                        { key: 'ai_logic.post_envido_bait_body', options: { strength: handStrength } },
                    ];
                    
                    if (state.opponentModel.trucoFoldRate < 0.4) {
                        baitProbability += 0.20;
                        baitReasoning.push({ key: 'ai_logic.post_envido_bait_opponent_aggro' });
                    }

                    baitReasoning.push({ key: 'ai_logic.post_envido_bait_chance', options: { probability: (baitProbability * 100).toFixed(0) } });

                    if (Math.random() < baitProbability) {
                        const weakestCardIndex = state.aiHand.findIndex(c => c.rank === weakestCard.rank && c.suit === weakestCard.suit);
                        baitReasoning.push({ key: 'ai_logic.post_envido_bait_decision', options: { cardName: getCardName(weakestCard) } });
                        
                        // Override the Truco call with a baiting card play
                        return {
                            action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: weakestCardIndex } },
                            reasoning: baitReasoning,
                            reasonKey: 'see_opponent',
                        };
                    } else {
                         trucoMove.reasoning.unshift({ key: 'ai_logic.post_envido_bait_skipped' });
                    }
                }
            }
        }
        
        // --- Corrected Priority: Strong Truco value bets should be considered over weak Envido bluffs ---
        if (trucoMove && singingMove) {
            let trucoStrength = 0;
            // Fix: Added a type guard to ensure the action is a truco call with a payload before accessing it.
            if (
                trucoMove.action.type === ActionType.CALL_TRUCO ||
                trucoMove.action.type === ActionType.CALL_RETRUCO ||
                trucoMove.action.type === ActionType.CALL_VALE_CUATRO
            ) {
                 trucoStrength = trucoMove.action.payload?.trucoContext?.strength || 0;
            }
            const isEnvidoBluff = singingMove.reasonKey?.includes('bluff');
            
            if (trucoStrength > 0.7 && isEnvidoBluff) {
                singingMove = null; // Discard the weak envido bluff in favor of the strong truco call.
            }
        }

        // --- Advanced Strategic Baiting Logic ---
        if (singingMove) {
            const aiEnvidoDetails = getEnvidoDetails(state.initialAiHand);
            const handStrength = calculateHandStrength(state.initialAiHand);
            const { opponentModel } = state;

            // SCENARIO 1: MONSTER HAND BAIT (Strong Envido + Strong Truco)
            // Goal: Set a Truco trap by hiding the high Envido/Flor score.
            if (aiEnvidoDetails.value >= 31 && handStrength >= 20) {
                const baseChance = 0.60;
                const adjustedChance = baseChance + (opponentModel.trucoFoldRate * 0.1); 

                if (Math.random() < adjustedChance && trucoMove) {
                    const reasoningBait: (string | MessageObject)[] = [
                        { key: 'ai_logic.monster_trap_title' },
                        { key: 'ai_logic.monster_trap_body', options: { envidoPoints: aiEnvidoDetails.value, trucoStrength: handStrength } },
                        { key: 'ai_logic.proceeding_with_truco' },
                        ...trucoMove.reasoning
                    ];
                    return { ...trucoMove, reasoning: reasoningBait };
                }
            }
            
            // SCENARIO 2: LOPSIDED HAND BAIT (Strong Envido + Weak Truco)
            // Goal: Bait the player into calling Envido to win more points there, offsetting a likely Truco loss.
            else if (aiEnvidoDetails.value >= 29 && handStrength <= 11) {
                let baitChance = 0.15; // Base 15% chance
                let baitReasoning: (string | MessageObject)[] = [{ key: 'ai_logic.lopsided_bait_analysis', options: { envidoPoints: aiEnvidoDetails.value, trucoStrength: handStrength } }];
                
                if (opponentModel.envidoBehavior.pie.callThreshold < 27) { // Using 'pie' as a general proxy for player's aggression
                    baitChance += 0.20;
                    baitReasoning.push({ key: 'ai_logic.lopsided_bait_aggro' });
                }
                
                if (opponentModel.envidoBehavior.pie.foldRate < 0.35) {
                    baitChance += 0.15;
                    baitReasoning.push({ key: 'ai_logic.lopsided_bait_low_fold' });
                }

                baitChance = Math.min(0.5, baitChance); // Cap at 50%
                baitReasoning.push({ key: 'ai_logic.lopsided_bait_chance', options: { chance: (baitChance * 100).toFixed(0) } });

                if (Math.random() < baitChance) {
                    // If baiting, we DO NOT sing. We play a card instead and wait.
                    const cardToPlayResult = findBestCardToPlay(state);
                    const reasoningLopsided: (string | MessageObject)[] = [
                        { key: 'ai_logic.envido_bait_title' },
                        { key: 'ai_logic.envido_bait_body', options: { envidoPoints: aiEnvidoDetails.value, trucoStrength: handStrength } },
                        { key: 'ai_logic.bait_probability_analysis', options: { baitReasoning: baitReasoning.map(r => typeof r === 'string' ? r : r.key).join(' ') } }, // Simplified for options
                        { key: 'ai_logic.proceeding_silent_play' },
                        ...cardToPlayResult.reasoning
                    ];
                    
                    return { 
                        action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: cardToPlayResult.index } },
                        reasoning: reasoningLopsided,
                        reasonKey: cardToPlayResult.reasonKey,
                    };
                }
            }

            // DEFAULT: If no baiting strategy is triggered, the Envido/Flor call takes precedence.
            return singingMove;
        }
        
        // --- NEW: Pre-Truco "Feint" Tactic for Monster Hands ---
        if (trucoMove?.action.type === ActionType.CALL_TRUCO && !hasEnvidoBeenCalledThisRound) {
            const handStrength = trucoMove.action.payload?.trucoContext?.strength || 0;
            const isBluff = trucoMove.action.payload?.trucoContext?.isBluff || false;

            // Condition: Very strong, non-bluff hand, and has a much weaker card to lead with as bait.
            if (handStrength > 0.85 && !isBluff) {
                const sortedHand = [...state.aiHand].sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
                const weakestCard = sortedHand[0];
                const strongestCard = sortedHand[sortedHand.length - 1];

                // Ensure there's a significant power gap to make the feint worthwhile
                if (getCardHierarchy(strongestCard) - getCardHierarchy(weakestCard) > 5) {
                    let feintProbability = 0.70; // Base 70% chance to try this tactic
                    const feintReasoning: MessageObject[] = [
                        { key: 'ai_logic.feint_tactic_title' },
                        { key: 'ai_logic.feint_tactic_body', options: { strength: (handStrength * 100).toFixed(0) } },
                    ];
                    
                    if (state.opponentModel.trucoFoldRate < 0.35) {
                        feintProbability += 0.15; // More likely to bait aggressive players
                         feintReasoning.push({ key: 'ai_logic.feint_tactic_opponent_aggro', options: { rate: (state.opponentModel.trucoFoldRate * 100).toFixed(0) } });
                    }
                    
                    feintProbability = Math.min(0.9, feintProbability);
                    feintReasoning.push({ key: 'ai_logic.feint_tactic_probability', options: { probability: (feintProbability * 100).toFixed(0) } });

                    if (Math.random() < feintProbability) {
                        const weakestCardIndex = state.aiHand.findIndex(c => c.rank === weakestCard.rank && c.suit === weakestCard.suit);
                        feintReasoning.push({ key: 'ai_logic.feint_tactic_decision', options: { cardName: getCardName(weakestCard) } });
                        
                        // Override the Truco call with a baiting card play
                        return {
                            action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: weakestCardIndex } },
                            reasoning: feintReasoning,
                            reasonKey: 'see_opponent',
                        };
                    } else {
                         trucoMove.reasoning.unshift({ key: 'ai_logic.feint_tactic_skipped' });
                    }
                }
            }
        }

        if (trucoMove) return trucoMove;
    }

    // --- NEW: Active Truco Feint Tactic ---
    // Overrides default card play when a truco is already active and the AI has a monster hand.
    if (trucoLevel > 0 && currentTrick === 0 && state.aiTricks[0] === null && state.currentTurn === 'ai' && mano === 'ai') {
        // This is an expensive calculation, so only run it in this specific, high-stakes baiting scenario.
        const strengthResult = calculateTrucoStrength(state);
    
        // Condition: Very strong, non-bluff hand, and has a much weaker card to lead with as bait.
        if (strengthResult.strength > 0.80) {
            const sortedHand = [...state.aiHand].sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
            const weakestCard = sortedHand[0];
            const strongestCard = sortedHand[sortedHand.length - 1];
    
            // Ensure there's a significant power gap to make the feint worthwhile
            if (getCardHierarchy(strongestCard) - getCardHierarchy(weakestCard) >= 5) {
                let feintProbability = 0.85; // High probability to try this tactic in this situation
                const feintReasoning: MessageObject[] = [
                    { key: 'ai_logic.feint_tactic_title' },
                    { key: 'ai_logic.feint_tactic_active_truco', options: { strength: (strengthResult.strength * 100).toFixed(0), trucoLevel } },
                ];
                
                if (state.opponentModel.trucoFoldRate < 0.35) {
                    feintProbability += 0.10; // More likely to bait aggressive players
                     feintReasoning.push({ key: 'ai_logic.feint_tactic_opponent_aggro', options: { rate: (state.opponentModel.trucoFoldRate * 100).toFixed(0) } });
                }
                
                feintProbability = Math.min(0.95, feintProbability);
                feintReasoning.push({ key: 'ai_logic.feint_tactic_probability', options: { probability: (feintProbability * 100).toFixed(0) } });
    
                if (Math.random() < feintProbability) {
                    const weakestCardIndex = state.aiHand.findIndex(c => c.rank === weakestCard.rank && c.suit === weakestCard.suit);
                    feintReasoning.push({ key: 'ai_logic.feint_tactic_decision', options: { cardName: getCardName(weakestCard) } });
                    
                    // Override the default play with a baiting card play
                    return {
                        action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: weakestCardIndex } },
                        reasoning: [...reasoning, ...feintReasoning, ...strengthResult.reasoning],
                        reasonKey: 'see_opponent', // This key implies a probing/baiting play
                    };
                }
            }
        }
    }

    // 3. Just PLAY A CARD
    const cardToPlayResult = findBestCardToPlay(state);
    const finalReasoning = [...reasoning, ...cardToPlayResult.reasoning];
    
    return { 
        action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: cardToPlayResult.index } },
        reasoning: finalReasoning,
        reasonKey: cardToPlayResult.reasonKey,
    };
};