import { GameState, ActionType, AiMove, Action, MessageObject, Card } from '../types';
import { findBestCardToPlay, findBaitCard } from './ai/playCardStrategy';
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
        if (state.isFlorEnabled && (gamePhase === 'flor_called' || gamePhase === 'contraflor_called')) {
            move = getFlorResponse(state, reasoning);
            if (move) return move;
        }
        
        // FIX: Broaden the condition for "Envido Primero". It can be called as long as the first trick isn't over.
        const canCallEnvidoPrimero = gamePhase === 'truco_called' && currentTrick === 0 && !hasEnvidoBeenCalledThisRound;
        if (canCallEnvidoPrimero) {
            // If AI has flor, it must respond with flor.
            if (state.isFlorEnabled && aiHasFlor) {
                const blurbText = getRandomPhrase(PHRASE_KEYS.FLOR);
                return {
                    action: { type: ActionType.DECLARE_FLOR, payload: { blurbText } },
                    reasoning: [{ key: 'ai_logic.flor_priority_on_truco' }],
                    reasonKey: 'respond_truco_with_flor'
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
            if (state.isFlorEnabled && aiHasFlor) {
                const blurbText = getRandomPhrase(PHRASE_KEYS.FLOR);
                return {
                    action: { type: ActionType.RESPOND_TO_ENVIDO_WITH_FLOR, payload: { blurbText } },
                    reasoning: [{ key: 'ai_logic.flor_priority_on_envido' }],
                    reasonKey: 'respond_with_flor'
                };
            }
            move = getEnvidoResponse(state, gamePressure, reasoning);
        }

        if (gamePhase.includes('truco') || gamePhase.includes('vale_cuatro')) {
            move = getTrucoResponse(state, gamePressure, reasoning);
        }
        if (move) return move;
    }

    // 2. DECIDE TO MAKE A CALL (Proactive Turn)
    // This is where we build the decision spectrum
    if (!gamePhase.includes('_called')) {
        let primaryMove: AiMove | null = null;
        let alternatives: AiMove[] = [];

        // Determine all possible strategic moves
        const singingMove = getFlorCallOrEnvidoCall(state, gamePressure);
        const trucoMove = getTrucoCall(state, gamePressure);
        const safeCardPlay = findBestCardToPlay(state);
        const baitCardPlay = findBaitCard(state.aiHand);
        
        // --- Determine the Primary (High-Percentage) Move ---
        // The original logic prioritizes singing, then truco, then playing a card.
        if (singingMove) {
            primaryMove = singingMove;
        } else if (trucoMove) {
            primaryMove = trucoMove;
        } else {
            primaryMove = {
                action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: safeCardPlay.index } },
                ...safeCardPlay,
                strategyCategory: 'safe'
            };
        }

        // --- Generate Alternatives based on the primary move ---
        if (primaryMove.action.type === ActionType.PLAY_CARD) {
            // If primary is safe play, alternatives are aggressive/deceptive calls
            if (trucoMove) alternatives.push(trucoMove);
            if (singingMove) alternatives.push(singingMove);

        } else if (primaryMove.action.type.includes('TRUCO')) {
            // If primary is Truco, alternative is safe play
            alternatives.push({
                action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: safeCardPlay.index } },
                ...safeCardPlay,
                strategyCategory: 'safe'
            });
            // And maybe a deceptive bait play if it's different
            if (baitCardPlay.index !== safeCardPlay.index) {
                 alternatives.push({
                    action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: baitCardPlay.index } },
                    reasoning: [baitCardPlay.reason],
                    reasonKey: baitCardPlay.reasonKey,
                    strategyCategory: 'deceptive'
                });
            }
        } else if (primaryMove.action.type.includes('ENVIDO') || primaryMove.action.type.includes('FLOR')) {
            // If primary is singing, alternative is safe play
             alternatives.push({
                action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: safeCardPlay.index } },
                ...safeCardPlay,
                strategyCategory: 'safe'
            });
        }
        
        // Clean up alternatives (remove duplicates and the primary move itself)
        const primaryActionString = JSON.stringify(primaryMove.action);
        const uniqueAlternatives = alternatives.filter(alt => JSON.stringify(alt.action) !== primaryActionString);
        
        primaryMove.alternatives = uniqueAlternatives;
        return primaryMove;
    }


    // 3. Just PLAY A CARD (This part is now mostly handled above, but acts as a fallback)
    const cardToPlayResult = findBestCardToPlay(state);
    const finalReasoning = [...reasoning, ...cardToPlayResult.reasoning];
    
    return { 
        action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: cardToPlayResult.index } },
        reasoning: finalReasoning,
        reasonKey: cardToPlayResult.reasonKey,
        strategyCategory: 'safe'
    };
};