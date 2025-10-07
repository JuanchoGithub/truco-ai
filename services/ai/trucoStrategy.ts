import { GameState, AiMove, ActionType, Card, Rank, Player } from '../../types';
import { getCardHierarchy, getCardName } from '../trucoLogic';

// New: Weighted sampling to generate a plausible opponent hand from probabilities
const generateOpponentHand = (state: GameState): Card[] => {
  const { opponentHandProbabilities } = state;
  if (!opponentHandProbabilities || opponentHandProbabilities.unseenCards.length < 3) {
    // Fallback to simple random generation if model is not available
    return Array.from({ length: 3 }, () => ({
      rank: [4, 5, 6, 7, 10, 11, 12][Math.floor(Math.random() * 7)] as Rank,
      suit: ['espadas', 'oros', 'bastos', 'copas'][Math.floor(Math.random() * 4)] as 'espadas' | 'oros' | 'bastos' | 'copas'
    }));
  }

  const { unseenCards, rankProbs } = opponentHandProbabilities;
  const hand: Card[] = [];
  const pool = [...unseenCards];

  // Create a weighted list of cards for sampling
  const weightedPool = pool.map(card => ({
    card,
    weight: rankProbs[card.rank] || 0.01 // Use rank probability as weight
  }));
  
  // Normalize weights
  const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return generateOpponentHand({ ...state, opponentHandProbabilities: null }); // fallback
  
  for (let i = 0; i < 3 && weightedPool.length > 0; i++) {
    const rand = Math.random() * totalWeight;
    let weightSum = 0;
    for (let j = 0; j < weightedPool.length; j++) {
      weightSum += weightedPool[j].weight;
      if (rand <= weightSum) {
        const selectedCard = weightedPool[j].card;
        hand.push(selectedCard);
        // Remove selected card from pool for next draws
        const removedWeight = weightedPool[j].weight;
        weightedPool.splice(j, 1);
        // totalWeight -= removedWeight; // No need to re-adjust total for this sampling method
        break;
      }
    }
  }
  return hand;
};

// NEW: State-aware round simulation
const simulateRoundWin = (
  myHand: Card[], 
  oppHand: Card[], 
  options: { iterations?: number; currentTrick?: number; initialMyTricks?: number; initialOppTricks?: number; amILeading?: boolean; mano?: Player } = {}
): number => {
  const { iterations = 100, currentTrick = 0, initialMyTricks = 0, initialOppTricks = 0, amILeading = true, mano = 'player' } = options;
  let wins = 0;

  for (let i = 0; i < iterations; i++) {
    let myTricks = initialMyTricks;
    let oppTricks = initialOppTricks;
    let remainingMy = [...myHand];
    let remainingOpp = [...oppHand];
    let leading = amILeading;

    for (let trick = currentTrick; trick < 3; trick++) {
      if (remainingMy.length === 0 || remainingOpp.length === 0 || myTricks >= 2 || oppTricks >= 2) break;

      remainingMy.sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
      remainingOpp.sort((a, b) => getCardHierarchy(a) - getCardHierarchy(b));
      
      let myCard: Card, oppCard: Card;

      if (leading) {
        myCard = remainingMy.pop()!; // Lead highest card
        const oppWinningCard = remainingOpp.find(c => getCardHierarchy(c) > getCardHierarchy(myCard));
        oppCard = oppWinningCard ? remainingOpp.splice(remainingOpp.findIndex(c => c === oppWinningCard), 1)[0] : remainingOpp.shift()!;
      } else {
        oppCard = remainingOpp.pop()!;
        const myWinningCard = remainingMy.find(c => getCardHierarchy(c) > getCardHierarchy(oppCard));
        myCard = myWinningCard ? remainingMy.splice(remainingMy.findIndex(c => c === myWinningCard), 1)[0] : remainingMy.shift()!;
      }

      const myVal = getCardHierarchy(myCard);
      const oppVal = getCardHierarchy(oppCard);

      if (myVal > oppVal) {
        myTricks++;
        leading = true;
      } else if (oppVal > myVal) {
        oppTricks++;
        leading = false;
      } else {
        if (mano === 'ai') myTricks++; else oppTricks++;
        leading = mano === 'ai';
      }
    }

    if (myTricks >= 2 || (myTricks === 1 && oppTricks < 1)) {
        wins++;
    } else if (myTricks === 1 && oppTricks === 1 && mano === 'ai') {
        wins++;
    }
  }
  return wins / iterations;
};

const LOW_RANKS: { [key: number]: number } = {
  3: 0.5, 2: 0.4, 1: 0.3, 12: 0.1, 11: 0.1, 10: 0.1, 7: 0.2, 6: 0.1, 5: 0.1, 4: 0.05,
};


interface TrucoStrengthResult {
    strength: number;
    reasoning: string[];
}

const calculateTrucoStrength = (state: GameState): TrucoStrengthResult => {
  const { aiHand, mano, currentTurn, currentTrick, trickWinners, opponentHandProbabilities } = state;
  const reasoning: string[] = [];

  if (aiHand.length === 0) {
    return { strength: 0, reasoning: ["No cards left to play."] };
  }

  let heuristic = 0;
  const sorted = [...aiHand].sort((a, b) => getCardHierarchy(b) - getCardHierarchy(a));
  const BRAVAS: Record<string, number> = { '1espadas': 4, '1bastos': 3, '7espadas': 2, '7oros': 1 };
  for (const card of sorted) {
    const key = `${card.rank}${card.suit}`;
    heuristic += BRAVAS[key] || (LOW_RANKS[card.rank] || 0) * 0.1;
  }
  const heuristicNormalized = heuristic / 4.0;
  reasoning.push(`- Heuristic Strength: ${heuristicNormalized.toFixed(2)} (based on high-value 'bravas').`);
  
  const simOptions = {
    iterations: 150,
    currentTrick: currentTrick,
    initialMyTricks: trickWinners.filter(w => w === 'ai').length,
    initialOppTricks: trickWinners.filter(w => w === 'player').length,
    amILeading: currentTurn === 'ai',
    mano: mano,
  };

  const oppSample = generateOpponentHand(state);
  const simWinProb = simulateRoundWin([...aiHand], oppSample, simOptions);
  reasoning.push(`- Simulation Win %: ${(simWinProb * 100).toFixed(0)}% (from 150 simulated rounds against a probable opponent hand).`);
  
  const hasStrongInferredCards = state.opponentHandProbabilities?.rankProbs[7]! < 0.1;
  const bravaBoost = hasStrongInferredCards ? 0.1 : 0;
   if (bravaBoost > 0) {
      reasoning.push(`- Inference Boost: +${bravaBoost.toFixed(2)} (player is unlikely to hold key cards like 7s).`);
  }

  const blended = heuristicNormalized * 0.6 + simWinProb * 0.4 + bravaBoost;
  const finalStrength = Math.min(1.0, blended);
  reasoning.push(`-> Sim-Adjusted Strength: ${finalStrength.toFixed(2)} (a blend of heuristic and simulation).`);

  return { strength: finalStrength, reasoning };
};

export const getTrucoResponse = (state: GameState, reasoning: string[] = []): AiMove | null => {
  const { trucoLevel, aiScore, playerScore, playerCalledHighEnvido, opponentModel, currentTrick, trickWinners } = state;
  if (trucoLevel === 0) return null;

  const strengthResult = calculateTrucoStrength(state);
  const myStrength = strengthResult.strength;
  reasoning.push(`[Strength Assessment]`);
  reasoning.push(...strengthResult.reasoning);

  const envidoLeak = playerCalledHighEnvido ? 0.2 : 0;
  const scoreDiff = aiScore - playerScore;
  const rand = Math.random();

  let positionalBonus = 0;
  if (currentTrick > 0 && trickWinners.filter(w => w === 'ai').length > trickWinners.filter(w => w === 'player').length) {
      positionalBonus = 0.20;
  }
  
  const equity = myStrength - 0.5 - envidoLeak + positionalBonus;
  
  reasoning.push(`\n[Decision Factors]`);
  reasoning.push(`- Score: AI ${aiScore} - Player ${playerScore} (Diff: ${scoreDiff}).`);
  if (envidoLeak > 0) reasoning.push(`- Envido Leak Penalty: -${envidoLeak.toFixed(2)} (opponent revealed a strong envido hand).`);
  if (positionalBonus > 0) reasoning.push(`- Positional Bonus: +${positionalBonus.toFixed(2)} (for winning a previous trick).`);
  reasoning.push(`-> Final Equity: ${equity.toFixed(2)} (My Strength - 0.5 + bonuses). Positive equity suggests accepting/escalating is profitable.`);


  if (rand < 0.1) {
    reasoning.push('\nDecision: Applying mixed strategy (random deviation) for unpredictability.');
    const aggressive = rand < 0.05;
    if (aggressive && trucoLevel < 3) {
      const escalateType = trucoLevel === 1 ? ActionType.CALL_RETRUCO : ActionType.CALL_VALE_CUATRO;
      return { action: { type: escalateType }, reasoning: [...reasoning, 'Result: Escalating as a bluff.'].join('\n') };
    }
    return { action: { type: aggressive ? ActionType.ACCEPT : ActionType.DECLINE }, 
             reasoning: [...reasoning, `Result: ${aggressive ? 'Accepting.' : 'Declining.'}`].join('\n') };
  }

  if (equity > 0.25 && trucoLevel < 3) {
    const escalateType = trucoLevel === 1 ? ActionType.CALL_RETRUCO : ActionType.CALL_VALE_CUATRO;
    const decisionReason = `\nDecision: Equity is very high (${equity.toFixed(2)} > 0.25), indicating a strong advantage. Escalating to ${escalateType.replace('CALL_', '')}.`;
    return { action: { type: escalateType }, reasoning: [...reasoning, decisionReason].join('\n') };
  } else if (equity > -0.15) {
     const decisionReason = `\nDecision: Equity is acceptable (${equity.toFixed(2)} > -0.15). The potential reward outweighs the risk. Accepting.`;
    return { action: { type: ActionType.ACCEPT }, reasoning: [...reasoning, decisionReason].join('\n') };
  } else {
    const decisionReason = `\nDecision: Equity is too low (${equity.toFixed(2)}). The opponent likely has a stronger hand. Declining.`;
    return { action: { type: ActionType.DECLINE }, reasoning: [...reasoning, decisionReason].join('\n') };
  }
};

export const getTrucoCall = (state: GameState): AiMove | null => {
  const { trucoLevel, gamePhase, aiScore, playerScore, playerCalledHighEnvido, opponentModel, 
          trickWinners, currentTrick, aiTricks } = state;
  
  if (aiTricks?.[currentTrick] !== null || gamePhase.includes('envido')) return null;

  const scoreDiff = aiScore - playerScore;
  const myNeed = 15 - aiScore;
  const envidoLeak = playerCalledHighEnvido ? 0.15 : 0;
  const rand = Math.random();
  const foldRate = opponentModel.trucoFoldRate || 0.3;
  const bluffSuccess = opponentModel.bluffSuccessRate || 0.5;
  const adjustedBluffChance = Math.min(0.45, 0.10 + (foldRate * 0.4) - (bluffSuccess * 0.2));

  const strengthResult = calculateTrucoStrength(state);
  const myStrength = strengthResult.strength;

  let reasonPrefix = [
    `[Truco Call Logic]`, 
    `My adjusted bluff chance is ${(adjustedBluffChance*100).toFixed(0)}% (based on opponent's fold rate).`,
    `\n[Strength Assessment]`,
    ...strengthResult.reasoning
  ];
  if (envidoLeak > 0) reasonPrefix.push(`- Envido Leak Penalty: Playing more cautiously (-${envidoLeak}).`);

  if (trucoLevel > 0) return null; // Only for initiation

  if (currentTrick === 1 && trickWinners[0] === 'ai') {
    if (myStrength >= 0.6) {
      return {
        action: { type: ActionType.CALL_TRUCO },
        reasoning: [...reasonPrefix, `\nDecision: I won trick 1 and my hand strength is high. Calling TRUCO.`].join('\n'),
        trucoContext: { strength: myStrength, isBluff: false }
      };
    }
  }

  // Post-Parda Bluff Opportunity
  if (currentTrick === 1 && trickWinners[0] === 'tie' && myStrength < 0.5 && rand < 0.2) {
      const ev = (foldRate * 1) + (1 - foldRate) * (myStrength * 2 - (1 - myStrength) * 2);
      if (ev > 0) {
        return {
            action: { type: ActionType.CALL_TRUCO },
            reasoning: [...reasonPrefix, `\nDecision: Parda in trick 1 and a weak hand. The EV of a bluff (${ev.toFixed(2)}) is positive. I will bluff TRUCO.`].join('\n'),
            trucoContext: { strength: myStrength, isBluff: true }
        };
      }
  }

  let decision = '';
  let trucoContext = null;
  if (rand < adjustedBluffChance && myStrength < 0.45 - envidoLeak) {
    decision = 'Decision: Hand is weak, but opponent may fold. Bluffing TRUCO.';
    trucoContext = { strength: myStrength, isBluff: true };
  } else if (myStrength >= 0.65 - envidoLeak) {
    decision = 'Decision: My hand is strong. Value calling TRUCO.';
    trucoContext = { strength: myStrength, isBluff: false };
  }

  if (decision) {
    return { action: { type: ActionType.CALL_TRUCO }, 
             reasoning: [...reasonPrefix, `\n${decision}`].join('\n'),
             trucoContext };
  }

  return null;
};