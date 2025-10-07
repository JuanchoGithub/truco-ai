import { GameState, AiMove, ActionType } from '../../types';
import { getEnvidoDetails } from '../trucoLogic';

// Helper for getEnvidoResponse: Estimates opponent's strength based on their call.
const estimateOpponentStrengthOnCall = (state: GameState): number => {
    const { envidoPointsOnOffer } = state;
    // A simple model: the more points are on the line, the stronger the opponent's hand is likely to be.
    if (envidoPointsOnOffer >= 5) return 28; // They've escalated to or past Real Envido
    if (envidoPointsOnOffer >= 3) return 26; // They've called Real Envido
    return 23; // They've called a standard Envido
}

export const getEnvidoResponse = (state: GameState, reasoning: string[]): AiMove | null => {
    const { initialAiHand, aiScore, mano, envidoPointsOnOffer } = state;
    
    const aiEnvidoDetails = getEnvidoDetails(initialAiHand);
    reasoning.push(aiEnvidoDetails.reasoning);
    let myEnvido = aiEnvidoDetails.value;

    if (mano === 'ai') {
        myEnvido += 0.5; // Mano bonus for winning ties
        reasoning.push(`I am mano, giving me an edge in ties.`);
    }

    const estimatedOpponentEnvido = estimateOpponentStrengthOnCall(state);
    reasoning.push(`[Opponent Model]: Player called for ${envidoPointsOnOffer} points. I estimate their envido is around ${estimatedOpponentEnvido}.`);
    
    const advantage = (myEnvido - estimatedOpponentEnvido) / 33;
    reasoning.push(`My calculated advantage is ${(advantage * 100).toFixed(0)}%.`);

    const randomFactor = Math.random();
    const aiPointsToWin = 15 - aiScore;
    const isPlayerInitialCall = envidoPointsOnOffer <= 3;

    // High advantage -> Escalate
    if (advantage > 0.2 && isPlayerInitialCall) { // ~7+ point difference
        if (aiPointsToWin <= envidoPointsOnOffer + 3 && myEnvido >= 30) {
             reasoning.push(`\nDecision: I have a massive advantage and I'm close to winning. I'm going all in with FALTA ENVIDO.`);
             return { action: { type: ActionType.CALL_FALTA_ENVIDO }, reasoning: reasoning.join('\n') };
        }
        reasoning.push(`\nDecision: My hand is significantly stronger. I will escalate with REAL ENVIDO.`);
        return { action: { type: ActionType.CALL_REAL_ENVIDO }, reasoning: reasoning.join('\n') };
    } 
    
    // Positive or slightly negative advantage -> Accept
    if (advantage > -0.15) { // My hand is close to or better than my estimate of theirs
        reasoning.push(`\nDecision: The odds are in my favor, or close enough. I will ACCEPT.`);
        return { action: { type: ActionType.ACCEPT }, reasoning: reasoning.join('\n') };
    }

    // Low advantage -> Mostly Decline
    reasoning.push(`My hand seems weaker than what the player is representing.`);
    if (randomFactor < 0.15) { // 15% chance to "hero call"
         reasoning.push(`\nDecision: This might be a bluff. I'll take the risk and ACCEPT.`);
         return { action: { type: ActionType.ACCEPT }, reasoning: reasoning.join('\n') };
    }
    
    reasoning.push(`\nDecision: The risk is too high. I will DECLINE.`);
    return { action: { type: ActionType.DECLINE }, reasoning: reasoning.join('\n') };
}

export const getEnvidoCall = (state: GameState): AiMove | null => {
    const { initialAiHand, playerScore, aiScore, playerEnvidoFoldHistory, mano } = state;
    
    const aiEnvidoDetails = getEnvidoDetails(initialAiHand);
    let myEnvido = aiEnvidoDetails.value;
    let reasonPrefix: string[] = [`[Envido Call Logic]`, aiEnvidoDetails.reasoning];

    if (mano === 'ai') {
        myEnvido += 0.5; // Mano bonus
        reasonPrefix.push(`I am mano, which gives me an edge in ties.`);
    }

    const randomFactor = Math.random();
    const playerPointsToWin = 15 - playerScore;
    const aiPointsToWin = 15 - aiScore;
    
    const recentHistory = playerEnvidoFoldHistory.slice(-5);
    const foldCount = recentHistory.filter(f => f).length;
    const playerFoldRate = recentHistory.length > 0 ? foldCount / recentHistory.length : 0.3; // Default 30%
    reasonPrefix.push(`\n[Opponent Model]: Player's recent Envido fold rate is ${(playerFoldRate * 100).toFixed(0)}%.`);

    // High strength hand -> Escalate
    if (myEnvido >= 30) {
        if (aiPointsToWin <= 5 && randomFactor < 0.75) {
            const reasoning = `\nDecision: With a powerful hand (${myEnvido.toFixed(1)}) and victory in sight, I call FALTA ENVIDO!`;
            return { action: { type: ActionType.CALL_FALTA_ENVIDO }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        } else {
            const reasoning = `\nDecision: With ${myEnvido.toFixed(1)} points, I have a dominant hand. I will call REAL ENVIDO to maximize value.`;
            return { action: { type: ActionType.CALL_REAL_ENVIDO }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    } 
    // Strong hand -> Standard call
    else if (myEnvido >= 27) {
        if (playerPointsToWin <= 3 && myEnvido >= 28) {
             const reasoning = `\nDecision: Player is close to winning. A Falta Envido call is a strong defensive move with my hand (${myEnvido.toFixed(1)}).`;
             return { action: { type: ActionType.CALL_FALTA_ENVIDO }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        } else {
            const reasoning = `\nDecision: My envido of ${myEnvido.toFixed(1)} is strong. I will initiate with ENVIDO.`;
            return { action: { type: ActionType.CALL_ENVIDO }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    }
    // Marginal hand -> Occasional call
    else if (myEnvido >= 23) { // New tier: 23-26
        const marginalCallChance = 0.20; // 20% chance to call with a marginal hand
        if (randomFactor < marginalCallChance) {
            const reasoning = `\nDecision: My hand is marginal (${myEnvido.toFixed(1)}), but worth a shot. Calling ENVIDO.`;
            return { action: { type: ActionType.CALL_ENVIDO }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    }
    // Low strength hand -> Bluffing
    else {
        const baseBluffChance = 0.10;
        const adjustedBluffChance = Math.min(0.4, baseBluffChance + (playerFoldRate * 0.25));
        
        if (randomFactor < adjustedBluffChance) {
            reasonPrefix.push(`My adjusted bluff chance is ${(adjustedBluffChance * 100).toFixed(0)}%.`);
            const reasoning = `\nDecision: My hand is weak (${myEnvido.toFixed(1)}), but I sense an opportunity based on player's fold rate. I will bluff and call ENVIDO.`;
            return { action: { type: ActionType.CALL_ENVIDO }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    }
    
    return null; // No action
}