
import { GameState, AiMove, ActionType, Card, Rank, Player, Action, AiTrucoContext, MessageObject } from '../../types';
import { getCardHierarchy, getCardName, determineTrickWinner, determineRoundWinner, calculateHandStrength, getHandPercentile } from '../trucoLogic';
import { getRandomPhrase, PHRASE_KEYS } from './phrases';
import { generateConstrainedOpponentHand } from './inferenceService';
import i18nService from '../i18nService';
import { findBestCardToPlay, findBaitCard } from './playCardStrategy';

/**
 * FIX: Rewritten round simulation to be accurate.
 * The previous version had a critical flaw where simulated players used their highest winning card instead of their lowest,
 * leading to inaccurate strength assessments. This version simulates optimal card play (using the lowest card necessary to win a trick),
 * providing a much more realistic evaluation of the AI's chances and preventing illogical folds from positions of strength.
 * ENHANCEMENT: The simulation now uses the player's specific opponent model to simulate their tendencies.
 * FIX V2: Now accounts for cards already played on the table for the current trick.
 */
const simulateRoundWin = (
  myHand: Card[], 
  oppHand: Card[], 
  options: { state: GameState, iterations?: number; amILeading: boolean; }
): number => {
  const { state, iterations = 100, amILeading } = options;
  const { currentTrick, trickWinners, mano, opponentModel, aiTricks, playerTricks } = state;
  let wins = 0;

  for (let i = 0; i < iterations; i++) {
    let simTrickWinners = [...trickWinners];
    // Sort high to low. shift() gets highest, pop() gets lowest.
    let remainingMy = [...myHand].sort((a, b) => getCardHierarchy(b) - getCardHierarchy(a));
    let remainingOpp = [...oppHand].sort((a, b) => getCardHierarchy(b) - getCardHierarchy(a));

    for (let trick = currentTrick; trick < 3; trick++) {
      // FIX: Check if cards are already played for this trick (e.g., AI played As de Bastos and is waiting for response)
      // We cast to Card | undefined to handle the 'null' in the array from GameState
      let myCard: Card | undefined = (aiTricks[trick]) || undefined;
      let oppCard: Card | undefined = (playerTricks[trick]) || undefined;

      // Determine who has the lead/initiative for this simulation step
      let aiHasInitiative = false;

      if (trick === currentTrick) {
          // If cards are on table, the 'lead' logic is about who resolves their play next in the sim.
          // If AI played, AI 'led'. If Opp played, Opp 'led'.
          if (myCard && !oppCard) aiHasInitiative = true;
          else if (!myCard && oppCard) aiHasInitiative = false;
          else if (myCard && oppCard) aiHasInitiative = true; // Order irrelevant if both played
          else aiHasInitiative = amILeading; // Neither played, use game state
      } else {
          // Future tricks: determine based on previous winner
          const prevWinner = simTrickWinners[trick - 1];
          if (prevWinner === 'ai') aiHasInitiative = true;
          else if (prevWinner === 'player') aiHasInitiative = false;
          else aiHasInitiative = mano === 'ai'; // Tie: mano leads
      }

      if (aiHasInitiative) { 
        // AI Plays First (or already played)
        if (!myCard) {
             if (remainingMy.length === 0) break;
             // Strategy: Lead with highest card to exert pressure (simplified for sim)
             myCard = remainingMy.shift()!; 
        }
        
        // Opponent Responds
        if (!oppCard) {
             if (remainingOpp.length === 0) break;
             // Opponent responds optimally: play lowest winning card, else throw lowest card
             const winningCards = remainingOpp.filter(c => getCardHierarchy(c) > getCardHierarchy(myCard!));
             if (winningCards.length > 0) {
                 oppCard = winningCards[winningCards.length - 1]; // Lowest winning card
                 remainingOpp.splice(remainingOpp.indexOf(oppCard), 1);
             } else {
                 oppCard = remainingOpp.pop()!; // Throw lowest card
             }
        }
      } else { 
          // Opponent Plays First (or already played)
          if (!oppCard) {
             if (remainingOpp.length === 0) break;
              // --- ENHANCED CONTEXTUAL LOGIC FOR SIMULATED OPPONENT ---
              if (trick === 0) {
                  const leadRoll = Math.random();
                  if (mano === 'player' && leadRoll < opponentModel.playStyle.leadWithHighestRate) {
                      oppCard = remainingOpp.shift()!; // Lead high
                  } else {
                      oppCard = remainingOpp.pop()!; // Lead low
                  }
              } else { 
                  // Trick 1 or 2
                    const oppLostFirstTrick = simTrickWinners[0] === 'ai';
                    const baitRoll = Math.random();
                    // If opponent lost first trick but has a monster, maybe bait?
                    if (oppLostFirstTrick && remainingOpp.length === 2 && getCardHierarchy(remainingOpp[0]) >= 13 && baitRoll < opponentModel.playStyle.baitRate) {
                        oppCard = remainingOpp.pop()!;
                    } else {
                        oppCard = remainingOpp.shift()!;
                    }
              }
          }

          // AI Responds
          if (!myCard) {
              if (remainingMy.length === 0) break;
              // I respond optimally: play lowest winning card, else throw lowest card
              const myWinningCards = remainingMy.filter(c => getCardHierarchy(c) > getCardHierarchy(oppCard!));
              if (myWinningCards.length > 0) {
                  myCard = myWinningCards[myWinningCards.length - 1]; // Lowest winning card
                  remainingMy.splice(remainingMy.indexOf(myCard), 1);
              } else {
                  myCard = remainingMy.pop()!; // throw lowest card
              }
          }
      }
      
      if (!myCard || !oppCard) {
          break;
      }

      // Determine winner. `oppCard` is the 'player', `myCard` is the 'ai'.
      const winner = determineTrickWinner(oppCard, myCard);
      simTrickWinners[trick] = winner;
      
      const roundIsOver = determineRoundWinner(simTrickWinners, mano);
      if (roundIsOver) break;
    }

    const finalWinner = determineRoundWinner(simTrickWinners, mano);
    if (finalWinner === 'ai') {
        wins++;
    }
  }
  return wins / iterations;
};

const LOW_RANKS: { [key: number]: number } = {
  3: 0.5, 2: 0.4, 1: 0.3, 12: 0.1, 11: 0.1, 10: 0.1, 7: 0.2, 6: 0.1, 5: 0.1, 4: 0.05,
};


// Fix: Exported interface to be used in BatchAnalyzer.
export interface TrucoStrengthResult {
    strength: number;
    // Fix: Changed type to allow MessageObjects.
    reasoning: (string | MessageObject)[];
}

export const calculateTrucoMoveEV = (move: AiMove, state: GameState): number => {
    const { opponentModel, trucoLevel } = state;
    
    // Fix: Corrected type guard for trucoContext access.
    // Type guard for action type to ensure payload has trucoContext
    if (
        move.action.type !== ActionType.CALL_TRUCO &&
        move.action.type !== ActionType.CALL_RETRUCO &&
        move.action.type !== ActionType.CALL_VALE_CUATRO
    ) {
        return -Infinity;
    }
    
    // After the guard, TS knows move.action has a payload that can contain trucoContext.
    // The payload itself can be optional, and trucoContext is optional on the payload.
    const trucoContext = move.action.payload?.trucoContext;

    if (!trucoContext) {
        return -Infinity; // Should not happen if getTrucoCall always provides it
    }

    const strength = trucoContext.strength;

    const currentPointsOnLine = trucoLevel === 0 ? 1 : (trucoLevel === 1 ? 2 : 3);
    const pointsOnFold = currentPointsOnLine;
    const pointsOnWin = currentPointsOnLine + 1;
    const pointsOnLose = pointsOnWin;

    const foldRate = opponentModel.trucoFoldRate;

    // EV = (Prob Fold * Gain on Fold) + (Prob Accept * ( (Prob Win * Gain on Win) - (Prob Lose * Loss on Lose) ))
    const ev = (foldRate * pointsOnFold) + 
             ((1 - foldRate) * ( (strength * pointsOnWin) - ((1 - strength) * pointsOnLose) ));

    return ev;
}

// Fix: Exported function to be used in BatchAnalyzer.
export const calculateTrucoStrength = (state: GameState): TrucoStrengthResult => {
  const { t } = i18nService;
  const { aiHand, mano, currentTrick, trickWinners, playerTricks } = state;
  // Fix: Changed type to allow MessageObjects.
  let reasoning: (string | MessageObject)[] = [];

  if (aiHand.length === 0) {
    reasoning.push({ key: 'ai_logic.strength_evaluation' });
    reasoning.push({ key: 'ai_logic.my_current_hand', options: { hand: '[]' } });
    
    // Outcome is deterministic, run a single simulation on the current board state
    const amILeading = playerTricks[currentTrick] === null;
    const simOptions = { state, iterations: 1, amILeading };
    // Pass empty hands as cards are already on board and accounted for in `state.trickWinners`
    const winProb = simulateRoundWin([], [], simOptions);
    
    reasoning.push({ key: 'ai_logic.win_prob_avg', options: { avgProb: (winProb * 100).toFixed(0) } });
    return { strength: winProb, reasoning };
  }
  
  // Start with a base heuristic of raw card power
  let heuristic = 0;
  const sorted = [...aiHand].sort((a, b) => getCardHierarchy(b) - getCardHierarchy(a));
  const BRAVAS: Record<string, number> = { '1espadas': 4, '1bastos': 3, '7espadas': 2, '7oros': 1 };
  for (const card of sorted) {
    const key = `${card.rank}${card.suit}`;
    heuristic += BRAVAS[key] || (LOW_RANKS[card.rank] || 0) * 0.1;
  }
  const heuristicNormalized = heuristic / 4.0;
  reasoning.push(t('ai_logic.my_current_hand', { hand: aiHand.map(getCardName).join(', ') }));
  reasoning.push(t('ai_logic.heuristic_strength', { strength: heuristicNormalized.toFixed(2) }));

  // Generate a plausible opponent hand based on all available information
  const oppSamples = generateConstrainedOpponentHand(state, reasoning, { strong: 3, medium: 5, weak: 2 });

  // Simulate the rest of the round against these plausible hand
  const amILeading = playerTricks[currentTrick] === null;
  const simOptions = {
    state: state,
    iterations: 150,
    amILeading: amILeading,
  };
  
  const runSimsForStratum = (samples: Card[][]): number => {
      if (samples.length === 0) return 0;
      let totalWinProb = 0;
      for (const sampleHand of samples) {
          // It's possible for a sample to be an empty array if something went wrong, guard against that.
          if (sampleHand.length > 0) {
              totalWinProb += simulateRoundWin([...aiHand], sampleHand, simOptions);
          }
      }
      return totalWinProb / samples.length;
  };

  const avgWinProbStrong = runSimsForStratum(oppSamples.strong);
  const avgWinProbMedium = runSimsForStratum(oppSamples.medium);
  const avgWinProbWeak = runSimsForStratum(oppSamples.weak);

  const simWinProb = (avgWinProbStrong + avgWinProbMedium + avgWinProbWeak) / 3;

  reasoning.push(t('ai_logic.win_prob_simulation', {
      strongCount: oppSamples.strong.length,
      strongProb: (avgWinProbStrong * 100).toFixed(0),
      mediumCount: oppSamples.medium.length,
      mediumProb: (avgWinProbMedium * 100).toFixed(0),
      weakCount: oppSamples.weak.length,
      weakProb: (avgWinProbWeak * 100).toFixed(0)
  }));
  reasoning.push(t('ai_logic.win_prob_avg', { avgProb: (simWinProb * 100).toFixed(0) }));
  
  // Final strength is a blend of raw power and simulation result
  const blended = heuristicNormalized * 0.2 + simWinProb * 0.8; // Give more weight to simulation
  const finalStrength = Math.min(1.0, blended);
  reasoning.push(t('ai_logic.blended_strength', { strength: finalStrength.toFixed(2) }));

  return { strength: finalStrength, reasoning };
};

// Fix: Updated function signature to accept (string | MessageObject)[].
export const getTrucoResponse = (state: GameState, gamePressure: number, reasoning: (string | MessageObject)[] = []): AiMove | null => {
  const { t } = i18nService;
  const { trucoLevel, aiScore, playerScore, playerCalledHighEnvido, opponentModel, currentTrick, trickWinners, aiHand, playerHand, playerTricks, aiTricks, mano } = state;
  if (trucoLevel === 0) return null;

  // --- NEW: Do-or-Die Endgame Logic ---
  const pointsIfDecline = state.trucoLevel;
  const trucoPointMapping = [1, 2, 3, 4];
  const pointsIfLose = trucoPointMapping[state.trucoLevel];
  
  const playerWinsOnDecline = (state.playerScore + pointsIfDecline) >= 15;
  const playerWinsOnAcceptedLoss = (state.playerScore + pointsIfLose) >= 15;

  if (playerWinsOnDecline && playerWinsOnAcceptedLoss) {
      reasoning.push(t('ai_logic.do_or_die_title'));
      reasoning.push(t('ai_logic.do_or_die_body', {
          declinePoints: pointsIfDecline,
          losePoints: pointsIfLose
      }));
      const decisionReason = t('ai_logic.decision_do_or_die_accept');
      return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.QUIERO) } }, reasoning: [...reasoning, decisionReason], reasonKey: 'accept_truco_do_or_die', strategyCategory: 'aggressive' };
  }
  // --- END NEW LOGIC ---

  let myStrength: number;
  let strengthReasoning: (string | MessageObject)[];

  // --- NEW: Special case for end-of-round bluff analysis ---
  if (aiHand.length === 0 && playerHand.length > 0 && playerTricks[currentTrick] === null) {
      reasoning.push({ key: 'ai_logic.bluff_analysis.title' });
      const myLastCard = aiTricks[currentTrick];
      
      if (!myLastCard) {
          // This should not happen, but as a fallback, assume no chance.
          myStrength = 0;
          strengthReasoning = [{ key: 'ai_logic.bluff_analysis.error_no_card' }];
      } else {
          const myLastCardValue = getCardHierarchy(myLastCard);
          const possibleOpponentCards = state.opponentHandProbabilities?.unseenCards || [];
          
          if (possibleOpponentCards.length > 0) {
              const weakerCards = possibleOpponentCards.filter(c => getCardHierarchy(c) < myLastCardValue);
              const bluffProbability = weakerCards.length / possibleOpponentCards.length;
              
              strengthReasoning = [
                  { key: 'ai_logic.bluff_analysis.body', options: { cardName: getCardName(myLastCard) } },
                  { key: 'ai_logic.bluff_analysis.stats', options: {
                      weakerCount: weakerCards.length,
                      totalCount: possibleOpponentCards.length,
                      probability: (bluffProbability * 100).toFixed(0)
                  }}
              ];
              myStrength = bluffProbability;
          } else {
              // No unseen cards? Fallback to 0.
              myStrength = 0;
              strengthReasoning = [{ key: 'ai_logic.bluff_analysis.error_no_unseen' }];
          }
      }
      reasoning.push(...strengthReasoning);
  } else {
      const strengthResult = calculateTrucoStrength(state);
      myStrength = strengthResult.strength;
      strengthReasoning = strengthResult.reasoning;
      reasoning.push({ key: 'ai_logic.strength_evaluation' });
      reasoning.push(...strengthReasoning);
  }
  
  // --- NEW: Certain Loss Logic ---
  if (myStrength < 0.05) { // Threshold for "almost certain loss"
      reasoning.push(t('ai_logic.defeat_analysis', { winProb: (myStrength * 100).toFixed(0) }));

      // If winning is mathematically impossible (strength is 0), never bluff.
      if (myStrength === 0) {
          reasoning.push(t('ai_logic.impossibility_analysis'));
          const decisionReason = t('ai_logic.decision_fold_impossible');
          return { action: { type: ActionType.DECLINE, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.NO_QUIERO) } }, reasoning: [...reasoning, decisionReason], reasonKey: 'decline_truco_impossible', strategyCategory: 'safe' };
      }
      
      // Consider a desperation bluff, scaled by how low the win chance is.
      const baseBluffChance = (myStrength / 0.05) * 0.10; // Scales from 0% to 10%
      const opponentFoldBonus = opponentModel.trucoFoldRate * 0.2;
      const pressureBonus = (gamePressure > 0.5 ? gamePressure * 0.3 : 0);
      const desperationBluffChance = baseBluffChance + opponentFoldBonus + pressureBonus;

      reasoning.push({ key: 'ai_logic.scaled_desperation_bluff_chance', options: { 
          winProb: (myStrength * 100).toFixed(0),
          baseChance: (baseBluffChance * 100).toFixed(0)
      }});
      if (opponentFoldBonus > 0) {
          reasoning.push({ key: 'ai_logic.opponent_fold_bonus', options: { bonus: (opponentFoldBonus * 100).toFixed(0) }});
      }
      if (pressureBonus > 0) {
          reasoning.push({ key: 'ai_logic.pressure_bonus', options: { bonus: (pressureBonus * 100).toFixed(0) }});
      }
      reasoning.push({ key: 'ai_logic.total_desperation_bluff_chance', options: { chance: (desperationBluffChance * 100).toFixed(0) } });

      if (trucoLevel < 3 && Math.random() < desperationBluffChance) {
          const escalateType = trucoLevel === 1 ? ActionType.CALL_RETRUCO : ActionType.CALL_VALE_CUATRO;
          const phrases = trucoLevel === 1 ? PHRASE_KEYS.RETRUCO : PHRASE_KEYS.VALE_CUATRO;
          const blurbText = getRandomPhrase(phrases);
          const trucoContext: AiTrucoContext = { strength: myStrength, isBluff: true };
          const decisionReason = t('ai_logic.decision_desperation_bluff', { call: escalateType.replace('CALL_', '') });
          // Fix: Changed reasoning from a joined string to an array.
          return { action: { type: escalateType, payload: { blurbText, trucoContext } }, reasoning: [...reasoning, decisionReason], reasonKey: 'escalate_truco_desperation_bluff', strategyCategory: 'deceptive' };
      } else {
          // Otherwise, fold.
          const decisionReason = t('ai_logic.decision_fold_overwhelming_odds');
          // Fix: Changed reasoning from a joined string to an array.
          return { action: { type: ActionType.DECLINE, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.NO_QUIERO) } }, reasoning: [...reasoning, decisionReason], reasonKey: 'decline_truco_certain_loss', strategyCategory: 'safe' };
      }
  }
  
  const isEarlyTruco = currentTrick === 0 && !playerTricks[0] && trucoLevel === 1;
  if (isEarlyTruco) {
      const myPercentile = getHandPercentile(aiHand);
      reasoning.push(t('ai_logic.early_truco_logic'));
      reasoning.push(t('ai_logic.my_hand_percentile', { percentile: myPercentile }));

      // 1. Elite Hands (>= 90th percentile) -> High chance to escalate
      if (myPercentile >= 90) {
          if (Math.random() < 0.85 && trucoLevel < 3) { // 85% chance to escalate
            const escalateType = trucoLevel === 1 ? ActionType.CALL_RETRUCO : ActionType.CALL_VALE_CUATRO;
            const phrases = trucoLevel === 1 ? PHRASE_KEYS.RETRUCO : PHRASE_KEYS.VALE_CUATRO;
            const blurbText = getRandomPhrase(phrases);
            const trucoContext: AiTrucoContext = { strength: myStrength, isBluff: false };
            const decisionReason = t('ai_logic.decision_escalate_elite_hand', { percentile: myPercentile, call: escalateType.replace('CALL_', '') });
            // Fix: Changed reasoning from a joined string to an array.
            return { action: { type: escalateType, payload: { blurbText, trucoContext } }, reasoning: [...reasoning, decisionReason], reasonKey: 'escalate_truco_elite', strategyCategory: 'aggressive' };
          }
      }

      // 2. Strong Hands (>= 50th percentile) -> Accept, with a chance to escalate
      if (myPercentile >= 50) {
          if (myPercentile >= 75 && Math.random() < 0.3 && trucoLevel < 3) { // 30% escalate chance for 75th+
             const escalateType = trucoLevel === 1 ? ActionType.CALL_RETRUCO : ActionType.CALL_VALE_CUATRO;
             const phrases = trucoLevel === 1 ? PHRASE_KEYS.RETRUCO : PHRASE_KEYS.VALE_CUATRO;
             const blurbText = getRandomPhrase(phrases);
             const trucoContext: AiTrucoContext = { strength: myStrength, isBluff: false };
             const decisionReason = t('ai_logic.decision_escalate_strong_hand', { percentile: myPercentile });
             // Fix: Changed reasoning from a joined string to an array.
             return { action: { type: escalateType, payload: { blurbText, trucoContext } }, reasoning: [...reasoning, decisionReason], reasonKey: 'escalate_truco_strong', strategyCategory: 'aggressive' };
          }
          const decisionReason = t('ai_logic.decision_accept_solid_hand', { percentile: myPercentile });
          // Fix: Changed reasoning from a joined string to an array.
          return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.QUIERO) } }, reasoning: [...reasoning, decisionReason], reasonKey: 'accept_truco_solid', strategyCategory: 'safe' };
      }

      // 3. Weaker Hands (< 50th percentile) -> Mostly fold, but with bluffing chances
      if (myPercentile < 50) {
          const foldChance = 0.65 - (gamePressure * 0.3); // More desperate -> less likely to fold
          if (Math.random() < foldChance) {
              const decisionReason = t('ai_logic.decision_fold_weak_hand', { percentile: myPercentile });
              // Fix: Changed reasoning from a joined string to an array.
              return { action: { type: ActionType.DECLINE, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.NO_QUIERO) } }, reasoning: [...reasoning, decisionReason], reasonKey: 'decline_truco_weak', strategyCategory: 'safe' };
          } else {
              // Remaining chance to do something else
              if (Math.random() < 0.15 && trucoLevel < 3) { // Small chance to bluff-escalate
                const escalateType = trucoLevel === 1 ? ActionType.CALL_RETRUCO : ActionType.CALL_VALE_CUATRO;
                const phrases = trucoLevel === 1 ? PHRASE_KEYS.RETRUCO : PHRASE_KEYS.VALE_CUATRO;
                const blurbText = getRandomPhrase(phrases);
                const trucoContext: AiTrucoContext = { strength: myStrength, isBluff: true };
                const decisionReason = t('ai_logic.decision_escalate_bluff_weak_hand');
                // Fix: Changed reasoning from a joined string to an array.
                return { action: { type: escalateType, payload: { blurbText, trucoContext } }, reasoning: [...reasoning, decisionReason], reasonKey: 'escalate_truco_weak_bluff', strategyCategory: 'deceptive' };
              }
              const decisionReason = t('ai_logic.decision_accept_weak_hand_bluff_call');
              // Fix: Changed reasoning from a joined string to an array.
              return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.QUIERO) } }, reasoning: [...reasoning, decisionReason], reasonKey: 'accept_truco_bluff_call', strategyCategory: 'aggressive' };
          }
      }
  }

  // NEW: Strategic escalation on a strong last card
  if (aiHand.length === 1 && playerHand.length === 1 && trucoLevel < 3) {
      const myLastCard = aiHand[0];
      const myCardHierarchy = getCardHierarchy(myLastCard);
      
      if (myCardHierarchy >= 11) { // 7 de oros or higher
          reasoning.push(t('ai_logic.final_escalation_logic', { cardName: getCardName(myLastCard) }));

          // Counter-inference: Does the player likely have a better card?
          const inferenceReasoning: (string | MessageObject)[] = []; // Temporary reasoning log for this check
          const opponentSamples = generateConstrainedOpponentHand(state, inferenceReasoning, { strong: 1, medium: 1, weak: 1 });
          let playerHasHigherCard = false;
          if (opponentSamples.strong.length > 0 && opponentSamples.strong[0].length > 0) {
              const playerStrongestCard = opponentSamples.strong[0][0];
              if (getCardHierarchy(playerStrongestCard) > myCardHierarchy) {
                  playerHasHigherCard = true;
                  reasoning.push(t('ai_logic.opponent_inference') + t('ai_logic.opponent_inference_could_have_better', { cardName: getCardName(playerStrongestCard) }));
              } else {
                   reasoning.push(t('ai_logic.opponent_inference') + t('ai_logic.opponent_inference_no_better'));
              }
          }

          if (!playerHasHigherCard) {
              let escalationChance = 0;
              switch (myCardHierarchy) {
                  case 14: escalationChance = 1.0; break;  // As de Espadas
                  case 13: escalationChance = 0.95; break; // As de Bastos
                  case 12: escalationChance = 0.90; break; // 7 de Espadas
                  case 11: escalationChance = 0.85; break; // 7 de Oros
              }

              reasoning.push(t('ai_logic.forced_escalation_chance', { chance: escalationChance * 100 }));

              if (Math.random() < escalationChance) {
                  const escalateType = trucoLevel === 1 ? ActionType.CALL_RETRUCO : ActionType.CALL_VALE_CUATRO;
                  const phrases = trucoLevel === 1 ? PHRASE_KEYS.RETRUCO : PHRASE_KEYS.VALE_CUATRO;
                  const blurbText = getRandomPhrase(phrases);
                  const trucoContext: AiTrucoContext = { strength: myStrength, isBluff: false };
                  const decisionReason = t('ai_logic.decision_escalate_dominant_card', { call: escalateType.replace('CALL_', '') });
                  // Fix: Changed reasoning from a joined string to an array.
                  return { action: { type: escalateType, payload: { blurbText, trucoContext } }, reasoning: [...reasoning, decisionReason], reasonKey: 'escalate_truco_dominant_card', strategyCategory: 'aggressive' };
              }
          }
      }
  }


  const envidoLeak = playerCalledHighEnvido ? 0.2 : 0;
  
  const playerContext = mano === 'player' ? 'mano' : 'pie';
  const bluffStats = opponentModel.trucoBluffs[playerContext];
  const bluffRate = bluffStats.attempts > 2 ? bluffStats.successes / bluffStats.attempts : 0.5; // Default to 0.5 if not enough data
  const bluffAdjust = (bluffRate - 0.4) * 0.4; 

  let positionalBonus = 0;
  if (currentTrick > 0 && trickWinners.filter(w => w === 'ai').length > trickWinners.filter(w => w === 'player').length) {
      positionalBonus = 0.20;
  }
  
  const equity = myStrength - 0.5 - envidoLeak + positionalBonus + bluffAdjust + (gamePressure * 0.15);
  
  reasoning.push(t('ai_logic.decision_factors'));
  if (envidoLeak > 0) reasoning.push(t('ai_logic.envido_penalty', { penalty: envidoLeak.toFixed(2) }));
  if (positionalBonus > 0) reasoning.push(t('ai_logic.positional_bonus', { bonus: positionalBonus.toFixed(2) }));
  const bluffAdjustFormatted = `${bluffAdjust > 0 ? '+' : ''}${bluffAdjust.toFixed(2)}`;
  reasoning.push(t('ai_logic.bluff_inference', { context: playerContext.toUpperCase(), rate: (bluffRate * 100).toFixed(0), adjust: bluffAdjustFormatted }));
  const pressureAdjustFormatted = `${gamePressure > 0 ? '+' : ''}${(gamePressure * 0.15).toFixed(2)}`;
  reasoning.push(t('ai_logic.game_pressure_adjustment', { adjust: pressureAdjustFormatted }));
  const threshold = -0.15;
  reasoning.push(t('ai_logic.final_equity', { equity: equity.toFixed(2), threshold }));

  const maxRandomChance = 0.10; 
  const randomMoveChance = maxRandomChance * Math.max(0, 1 - Math.abs(equity) * 2.5);

  if (Math.random() < randomMoveChance) {
    reasoning.push(t('ai_logic.mixed_strategy_decision', { chance: (randomMoveChance * 100).toFixed(0) }));
    const aggressive = Math.random() < 0.5;
    if (aggressive && trucoLevel < 3) {
      const escalateType = trucoLevel === 1 ? ActionType.CALL_RETRUCO : ActionType.CALL_VALE_CUATRO;
      const phrases = trucoLevel === 1 ? PHRASE_KEYS.RETRUCO : PHRASE_KEYS.VALE_CUATRO;
      const blurbText = getRandomPhrase(phrases);
      const trucoContext: AiTrucoContext = { strength: myStrength, isBluff: true };
      // Fix: Changed reasoning from a joined string to an array.
      return { action: { type: escalateType, payload: { blurbText, trucoContext } }, reasoning: [...reasoning, t('ai_logic.mixed_strategy_bluff')], reasonKey: 'escalate_truco_mixed_bluff', strategyCategory: 'deceptive' };
    }
    const actionType = aggressive ? ActionType.ACCEPT : ActionType.DECLINE;
    const blurbText = getRandomPhrase(aggressive ? PHRASE_KEYS.QUIERO : PHRASE_KEYS.NO_QUIERO);
    const resultText = aggressive ? t('ai_logic.results.accepting') : t('ai_logic.results.declining');
    return { action: { type: actionType, payload: { blurbText } }, 
             // Fix: Changed reasoning from a joined string to an array.
             reasoning: [...reasoning, t('ai_logic.mixed_strategy_result', { result: resultText })], reasonKey: aggressive ? 'accept_truco_mixed' : 'decline_truco_mixed', strategyCategory: aggressive ? 'aggressive' : 'safe' };
  }


  if (equity > 0.25 && trucoLevel < 3) {
    const escalateType = trucoLevel === 1 ? ActionType.CALL_RETRUCO : ActionType.CALL_VALE_CUATRO;
    const phrases = trucoLevel === 1 ? PHRASE_KEYS.RETRUCO : PHRASE_KEYS.VALE_CUATRO;
    const blurbText = getRandomPhrase(phrases);
    const trucoContext: AiTrucoContext = { strength: myStrength, isBluff: equity < 0 };

    // --- NEW: Lookahead Pre-Commitment Logic (only for Retruco) ---
    if (trucoLevel === 1) {
        reasoning.push(t('ai_logic.pre_commitment_title'));
        reasoning.push(t('ai_logic.pre_commitment_simulate_q', {
            myCall: 'RETRUCO',
            playerCall: 'VALE CUATRO'
        }));
        
        const simulatedState: GameState = { ...state, trucoLevel: 3, gamePhase: 'vale_cuatro_called', currentTurn: 'ai', lastCaller: 'player' };

        const simReasoning: (string | MessageObject)[] = [];
        const futureMove = getTrucoResponse(simulatedState, gamePressure, simReasoning);

        if (futureMove?.action.type === ActionType.DECLINE) {
            reasoning.push(t('ai_logic.pre_commitment_result_fold'));
            const decisionReason = t('ai_logic.decision_pre_commitment_accept_instead');
            return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.QUIERO) } }, reasoning: [...reasoning, decisionReason], reasonKey: 'accept_truco_lookahead_fold', strategyCategory: 'safe' };
        } else {
            reasoning.push(t('ai_logic.pre_commitment_result_accept'));
        }
    }
    // --- END NEW LOGIC ---

    const decisionReason = t('ai_logic.decision_escalate_high_equity', { equity: equity.toFixed(2), call: escalateType.replace('CALL_', '') });
    // Fix: Changed reasoning from a joined string to an array.
    return { action: { type: escalateType, payload: { blurbText, trucoContext } }, reasoning: [...reasoning, decisionReason], reasonKey: 'escalate_truco_high_equity', strategyCategory: 'aggressive' };
  } else if (equity > threshold) {
     const decisionReason = t('ai_logic.decision_accept_equity', { equity: equity.toFixed(2) });
    // Fix: Changed reasoning from a joined string to an array.
    return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.QUIERO) } }, reasoning: [...reasoning, decisionReason], reasonKey: 'accept_truco_decent_equity', strategyCategory: 'safe' };
  } else {
    const decisionReason = t('ai_logic.decision_decline_equity', { equity: equity.toFixed(2), threshold });
    // Fix: Changed reasoning from a joined string to an array.
    return { action: { type: ActionType.DECLINE, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.NO_QUIERO) } }, reasoning: [...reasoning, decisionReason], reasonKey: 'decline_truco_low_equity', strategyCategory: 'safe' };
  }
};

// Fix: Add getTrucoResponseOptions to fix import error in localAiService.ts
export const getTrucoResponseOptions = (state: GameState, gamePressure: number, reasoning: (string | MessageObject)[]): AiMove[] => {
    const { trucoLevel } = state;
    const moves: AiMove[] = [];

    // All responses get a strength calculation for context
    const strengthResult = calculateTrucoStrength(state);
    const myStrength = strengthResult.strength;
    // A bluff is more nuanced, but let's use a simple threshold for generating options.
    const isBluff = myStrength < 0.45; 

    // Base options: Accept and Decline
    moves.push({
        action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.QUIERO) } },
        reasoning: [],
        reasonKey: 'accept_truco_solid',
        strategyCategory: 'safe'
    });
    moves.push({
        action: { type: ActionType.DECLINE, payload: { blurbText: getRandomPhrase(PHRASE_KEYS.NO_QUIERO) } },
        reasoning: [],
        reasonKey: 'decline_truco_weak',
        strategyCategory: 'safe'
    });

    // Escalation options
    if (trucoLevel < 3) {
        const escalateType = trucoLevel === 1 ? ActionType.CALL_RETRUCO : ActionType.CALL_VALE_CUATRO;
        const phrases = trucoLevel === 1 ? PHRASE_KEYS.RETRUCO : PHRASE_KEYS.VALE_CUATRO;
        const trucoContext: AiTrucoContext = { strength: myStrength, isBluff };
        
        moves.push({
            action: { type: escalateType, payload: { blurbText: getRandomPhrase(phrases), trucoContext } },
            reasoning: [],
            reasonKey: isBluff ? 'escalate_truco_bluff' : 'escalate_truco_strong',
            strategyCategory: isBluff ? 'deceptive' : 'aggressive'
        });
    }
    
    return moves;
};

export const getTrucoCall = (state: GameState, gamePressure: number, precalculatedStrength?: TrucoStrengthResult): AiMove | null => {
  const { t } = i18nService;
  const { trucoLevel, gamePhase, aiScore, playerScore, playerCalledHighEnvido, opponentModel, 
          trickWinners, currentTrick, aiTricks, aiHand, playerHand, lastCaller, playerTricks, mano } = state;
  
  if (aiTricks?.[currentTrick] !== null || gamePhase.includes('envido') || trucoLevel > 0) return null;

  const envidoLeak = playerCalledHighEnvido ? 0.15 : 0;
  
  const playerContext = mano === 'player' ? 'mano' : 'pie';
  const foldRate = opponentModel.trucoFoldRate || 0.3; // Fallback
  const bluffSuccess = opponentModel.bluffSuccessRate || 0.5; // Fallback
  const { envidoPrimeroRate } = opponentModel.playStyle;
  const envidoPrimeroBonus = envidoPrimeroRate > 0.4 ? envidoPrimeroRate * 0.3 : 0;
  const adjustedBluffChance = Math.min(0.55, 0.10 + (foldRate * 0.4) - (bluffSuccess * 0.2) + (opponentModel.playStyle.baitRate * 0.5) + envidoPrimeroBonus + (gamePressure > 0 ? gamePressure * 0.1 : 0));

  const strengthResult = precalculatedStrength || calculateTrucoStrength(state);
  const myStrength = strengthResult.strength;

  // Fix: Changed reasonPrefix type to allow MessageObjects.
  let reasonPrefix: (string | MessageObject)[] = [ t('ai_logic.truco_call_logic'), t('ai_logic.adjusted_bluff_chance_truco', { chance: (adjustedBluffChance * 100).toFixed(0) })];
  if (envidoPrimeroRate > 0.2) {
      reasonPrefix.push(t('ai_logic.envido_primero_bonus', { rate: (envidoPrimeroRate * 100).toFixed(0) }));
  }
  if (!precalculatedStrength) { // Only add strength eval if it wasn't pre-calculated
      reasonPrefix.push(`\n${t('ai_logic.strength_evaluation')}`, ...strengthResult.reasoning);
  }

  if (envidoLeak > 0) reasonPrefix.push(t('ai_logic.envido_penalty', { penalty: envidoLeak.toFixed(2) }));

  if (currentTrick === 1 && trickWinners[0] === 'ai') {
    if (myStrength >= 0.6) {
      const blurbText = getRandomPhrase(PHRASE_KEYS.TRUCO);
      const trucoContext: AiTrucoContext = { strength: myStrength, isBluff: false };
      // Fix: Changed reasoning from a joined string to an array.
      return { action: { type: ActionType.CALL_TRUCO, payload: { blurbText, trucoContext } }, reasoning: [...reasonPrefix, t('ai_logic.decision_truco_won_trick1')], reasonKey: 'call_truco_won_trick1', strategyCategory: 'aggressive' };
    }
  }

  // Post-Parda Bluff Opportunity
  if (currentTrick === 1 && trickWinners[0] === 'tie' && myStrength < 0.5 && Math.random() < 0.2) {
      const ev = (foldRate * 1) + (1 - foldRate) * (myStrength * 2 - (1 - myStrength) * 2);
      if (ev > 0) {
        const blurbText = getRandomPhrase(PHRASE_KEYS.TRUCO);
        const trucoContext: AiTrucoContext = { strength: myStrength, isBluff: true };
        // Fix: Changed reasoning from a joined string to an array.
        return { action: { type: ActionType.CALL_TRUCO, payload: { blurbText, trucoContext } }, reasoning: [...reasonPrefix, t('ai_logic.decision_truco_bluff_parda', { ev: ev.toFixed(2) })], reasonKey: 'call_truco_post_parda_bluff', strategyCategory: 'deceptive' };
      }
  }

  let decision = '';
  let trucoContext: AiTrucoContext | null = null;
  const strengthThreshold = 0.65 - envidoLeak - (gamePressure * 0.15); // More desperate -> lower threshold to call for value
  let reasonKey: string | null = null;
  let strategyCategory: AiMove['strategyCategory'] = 'aggressive';

  if (Math.random() < adjustedBluffChance && myStrength < 0.45 - envidoLeak) {
    decision = t('ai_logic.decision_bluff_truco_weak_hand');
    trucoContext = { strength: myStrength, isBluff: true };
    reasonKey = 'call_truco_bluff';
    strategyCategory = 'deceptive';
  } else if (myStrength >= strengthThreshold) {
    decision = t('ai_logic.decision_value_truco_strong_hand', { strength: myStrength.toFixed(2), threshold: strengthThreshold.toFixed(2) });
    trucoContext = { strength: myStrength, isBluff: false };
    reasonKey = 'call_truco_value';
    strategyCategory = 'aggressive';
  }

  if (decision && trucoContext && reasonKey) {
    const blurbText = getRandomPhrase(PHRASE_KEYS.TRUCO);
    const action: Action = { type: ActionType.CALL_TRUCO, payload: { blurbText, trucoContext } };
    const confidence = reasonKey === 'call_truco_bluff' ? adjustedBluffChance : myStrength;
    // Fix: Changed reasoning from a joined string to an array.
    return { action, reasoning: [...reasonPrefix, `\n${decision}`], reasonKey, confidence, strategyCategory };
  }

  return null;
};
