import { GameState, AiMove, ActionType, Card, Rank } from '../../types';
import { getCardHierarchy, getCardName } from '../trucoLogic';

const BRAVAS: Record<string, number> = {
    '1espadas': 4, '1bastos': 3, '7espadas': 2, '7oros': 1,
};

const LOW_RANKS: { [key: number]: number } = {
    3: 0.5, 2: 0.4, 1: 0.3, 12: 0.1, 11: 0.1, 10: 0.1, 7: 0.2, 6: 0.1, 5: 0.1, 4: 0.05,
};

const calculateTrucoStrength = (hand: Card[], position: 'lead' | 'follow' = 'lead'): number => {
    let strength = 0;
    // Sort hand descending for play order sim
    const sorted = hand.sort((a, b) => getCardHierarchy(b) - getCardHierarchy(a));
    for (let i = 0; i < sorted.length; i++) {
        const card = sorted[i];
        const key = `${card.rank}${card.suit}`;
        let weight = BRAVAS[key] || (LOW_RANKS[card.rank] || 0) * 0.1;
        if (position === 'follow' && i > 0) weight *= 1.2; // Boost for responses
        strength += weight;
    }
    return Math.min(1.0, strength / 4.0);
};

export const getTrucoResponse = (state: GameState, reasoning: string[]): AiMove | null => {
    const { aiHand, trucoLevel, aiScore, playerCalledHighEnvido } = state;

    const myStrength = calculateTrucoStrength(aiHand, 'follow');
    const envidoLeakFactor = playerCalledHighEnvido ? 0.2 : 0;
    const exploration = 0.15;
    const rand = Math.random();

    reasoning.push(`My Truco hand strength is ${myStrength.toFixed(2)}.`);
    if(envidoLeakFactor > 0) {
        reasoning.push(`[Envido Leak]: Player showed a high Envido. I suspect they have bravas. Adjusting my confidence down by ${envidoLeakFactor}.`);
    }
    const equity = myStrength - 0.5 - envidoLeakFactor;

    if (rand < exploration * 1.2) {
        reasoning.push(`\nDecision: Applying a mixed strategy for unpredictability.`);
        const acceptOrEscalate = equity > 0.1;
        if (acceptOrEscalate && trucoLevel === 1) return { action: { type: ActionType.CALL_RETRUCO }, reasoning: reasoning.join('\n') + ` I'll escalate.` };
        if (acceptOrEscalate && trucoLevel === 2) return { action: { type: ActionType.CALL_VALE_CUATRO }, reasoning: reasoning.join('\n') + ` I'll escalate.` };
        return { action: acceptOrEscalate ? {type: ActionType.ACCEPT} : {type: ActionType.DECLINE}, reasoning: reasoning.join('\n') + ` I'll ${acceptOrEscalate ? 'accept' : 'decline'}.` };
    }

    if (equity > 0.2) {
        reasoning.push(`\nDecision: My hand is strong (equity ${equity.toFixed(2)}). I will escalate.`);
        if (trucoLevel === 1) return { action: { type: ActionType.CALL_RETRUCO }, reasoning: reasoning.join('\n') };
        if (trucoLevel === 2) return { action: { type: ActionType.CALL_VALE_CUATRO }, reasoning: reasoning.join('\n') };
        return { action: { type: ActionType.ACCEPT }, reasoning: reasoning.join('\n') };
    } else if (equity > -0.1 && aiScore < 10) { // Marginal, not late game
        reasoning.push(`\nDecision: My hand is marginal (equity ${equity.toFixed(2)}), but it's not late game. I will accept.`);
        return { action: { type: ActionType.ACCEPT }, reasoning: reasoning.join('\n') };
    } else {
        reasoning.push(`\nDecision: My hand is too weak (equity ${equity.toFixed(2)}) or it's too risky. I will decline.`);
        return { action: { type: ActionType.DECLINE }, reasoning: reasoning.join('\n') };
    }
}

export const getTrucoCall = (state: GameState): AiMove | null => {
    const { aiHand, trucoLevel, gamePhase, aiScore, playerCalledHighEnvido, opponentModel, trickWinners, currentTrick, aiTricks } = state;
    
    // Do not make a call if AI has already played in the current trick.
    if (aiTricks[currentTrick] !== null) {
        return null;
    }

    // Escalation logic
    if (trucoLevel > 0 && trucoLevel < 3 && !gamePhase.includes('envido')) {
        const myStrength = calculateTrucoStrength(aiHand, 'lead');
        if (myStrength > 0.85) { // Only escalate with very strong hands
            let reasoning = [`[Truco Escalation Logic]`, `My hand strength is ${myStrength.toFixed(2)}, which is very high.`];
            if (trucoLevel === 1) {
                reasoning.push(`\nDecision: I will escalate to RETRUCO.`);
                return { action: { type: ActionType.CALL_RETRUCO }, reasoning: reasoning.join('\n') };
            }
            if (trucoLevel === 2) {
                reasoning.push(`\nDecision: I will escalate to VALE CUATRO.`);
                return { action: { type: ActionType.CALL_VALE_CUATRO }, reasoning: reasoning.join('\n') };
            }
        }
    }
    
    // Initiation logic
    if (trucoLevel === 0 && !gamePhase.includes('envido')) {
        // --- NEW STRATEGY: Secure Victory Call ---
        // If I won the first trick and I have a strong card for the second trick, call truco before playing.
        if (currentTrick === 1 && trickWinners[0] === 'ai') {
            const highestCard = [...aiHand].sort((a, b) => getCardHierarchy(b) - getCardHierarchy(a))[0];
            // Threshold for a "strong" card is a 3 or better (hierarchy >= 10)
            if (highestCard && getCardHierarchy(highestCard) >= 10) { 
                const reasoning = [
                    `[Truco Call Logic]`,
                    `I have already won the first trick.`,
                    `My remaining hand is ${aiHand.map(getCardName).join(' and ')}.`,
                    `My ${getCardName(highestCard)} virtually guarantees winning this trick and the round.`,
                    `\nDecision: Instead of just playing to win 1 point, I will call TRUCO to secure 2 points.`
                ].join('\n');

                return {
                    action: { type: ActionType.CALL_TRUCO },
                    reasoning: reasoning,
                    trucoContext: { strength: 0.95, isBluff: false } // Assign very high confidence
                };
            }
        }
        // --- END NEW STRATEGY ---

        const myStrength = calculateTrucoStrength(aiHand, 'lead');
        const myNeed = 15 - aiScore;
        const rand = Math.random();
        const envidoLeakFactor = playerCalledHighEnvido ? 0.2 : 0;
        
        const playerTrucoFoldRate = opponentModel.trucoFoldRate;
        const baseTrucoBluffChance = 0.10;
        const adjustedTrucoBluffChance = Math.min(0.40, baseTrucoBluffChance + (playerTrucoFoldRate * 0.35));

        const isBluffCondition = myStrength < 0.4 - envidoLeakFactor;
        let trucoAction: AiMove | null = null;
        let reasonPrefix = [`[Truco Call Logic]`, `My hand strength is ${myStrength.toFixed(2)}.`];

        if(envidoLeakFactor > 0) {
            reasonPrefix.push(`[Envido Leak]: Player showed a high Envido. I will be more cautious.`);
        }

        reasonPrefix.push(`[Opponent Model]: Player's Truco fold rate is ${(playerTrucoFoldRate * 100).toFixed(0)}%. My adjusted bluff chance is ${(adjustedTrucoBluffChance * 100).toFixed(0)}%.`);
        let decisionReasoning = '';
        
        if (rand < adjustedTrucoBluffChance && isBluffCondition) {
            decisionReasoning = `\nDecision: My hand is weak, but the player folds often. I am bluffing TRUCO.`;
            trucoAction = { 
                action: { type: ActionType.CALL_TRUCO }, 
                reasoning: '', // will be composed later
                trucoContext: { strength: myStrength, isBluff: true }
            };
        } 
        else if (myStrength >= 0.7 - envidoLeakFactor || myNeed <= 4) {
            decisionReasoning = `\nDecision: My hand is very strong (or it's the endgame). Calling TRUCO.`;
            trucoAction = {
                action: { type: ActionType.CALL_TRUCO },
                reasoning: '',
                trucoContext: { strength: myStrength, isBluff: false }
            };
        }
        else if (myStrength >= 0.5 - envidoLeakFactor) {
            decisionReasoning = `\nDecision: My hand is reasonably strong. Calling TRUCO.`;
            trucoAction = {
                action: { type: ActionType.CALL_TRUCO },
                reasoning: '',
                trucoContext: { strength: myStrength, isBluff: false }
            };
        }

        if (trucoAction) {
            trucoAction.reasoning = [...reasonPrefix, decisionReasoning].join('\n');
            return trucoAction;
        }
    }
    
    return null;
}