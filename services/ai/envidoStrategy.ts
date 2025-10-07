import { GameState, AiMove, ActionType } from '../../types';
import { getEnvidoDetails } from '../trucoLogic';

export const getEnvidoResponse = (state: GameState, reasoning: string[]): AiMove | null => {
    const { initialAiHand, aiScore, mano, envidoPointsOnOffer } = state;
    
    const aiEnvidoDetails = getEnvidoDetails(initialAiHand);
    reasoning.push(aiEnvidoDetails.reasoning);
    let aiEnvido = aiEnvidoDetails.value;

    if (mano === 'ai') {
        aiEnvido += 0.5; // Small bonus for being mano (wins ties)
        reasoning.push(`I am mano, which gives me an edge in ties.`);
    }

    const randomFactor = Math.random();
    const aiPointsToWin = 15 - aiScore;
    const isPlayerInitialCall = envidoPointsOnOffer <= 3; // Is this a response to a simple Envido or Real Envido?

    // High strength hand
    if (aiEnvido >= 30) {
        if (aiPointsToWin <= envidoPointsOnOffer + 3) { // If a Falta would be game-winning or close
             reasoning.push(`\nDecision: I have a monster hand (${aiEnvido}) and I'm close to winning. I'm going all in with FALTA ENVIDO.`);
             return { action: { type: ActionType.CALL_FALTA_ENVIDO }, reasoning: reasoning.join('\n') };
        }
         if (isPlayerInitialCall) {
            reasoning.push(`\nDecision: My envido is very high (${aiEnvido}). I will escalate with REAL ENVIDO.`);
            return { action: { type: ActionType.CALL_REAL_ENVIDO }, reasoning: reasoning.join('\n') };
        }
        reasoning.push(`\nDecision: My hand is a monster (${aiEnvido}). I will of course ACCEPT.`);
        return { action: { type: ActionType.ACCEPT }, reasoning: reasoning.join('\n') };
    } 
    // Medium strength hand
    else if (aiEnvido >= 26) { // Lowered threshold slightly
        reasoning.push(`My hand is solid (${aiEnvido.toFixed(1)}).`);
        if (isPlayerInitialCall && randomFactor < 0.25) { // 25% chance to escalate with a solid hand
             reasoning.push(`\nDecision: I feel confident. I'll apply pressure and escalate to REAL ENVIDO.`);
             return { action: { type: ActionType.CALL_REAL_ENVIDO }, reasoning: reasoning.join('\n') };
        }
        reasoning.push(`\nDecision: A solid hand is worth accepting.`);
        return { action: { type: ActionType.ACCEPT }, reasoning: reasoning.join('\n') };
    } 
    // Weak hand
    else {
        reasoning.push(`My hand is weak (${aiEnvido.toFixed(1)}).`);
        if (envidoPointsOnOffer > 3 && aiEnvido < 23) { // Higher stakes, fold more easily
             reasoning.push(`\nDecision: The stakes are too high for my weak hand. I will DECLINE.`);
             return { action: { type: ActionType.DECLINE }, reasoning: reasoning.join('\n') };
        }
        if (randomFactor < 0.15) { // 15% chance to "hero call"
             reasoning.push(`\nDecision: This might be a bluff from the player. I'll risk it and ACCEPT.`);
             return { action: { type: ActionType.ACCEPT }, reasoning: reasoning.join('\n') };
        }
        reasoning.push(`\nDecision: It's not worth the risk. I will DECLINE.`);
        return { action: { type: ActionType.DECLINE }, reasoning: reasoning.join('\n') };
    }
}

export const getEnvidoCall = (state: GameState): AiMove | null => {
    const { initialAiHand, playerScore, aiScore, playerEnvidoFoldHistory, mano } = state;
    
    const aiEnvidoDetails = getEnvidoDetails(initialAiHand);
    let aiEnvido = aiEnvidoDetails.value;
    let reasonPrefix: string[] = [`[Envido Call Logic]`, aiEnvidoDetails.reasoning];

    if (mano === 'ai') {
        aiEnvido += 0.5; // Small bonus for being mano (wins ties)
        reasonPrefix.push(`I am mano, which gives me an edge in ties.`);
    }

    const randomFactor = Math.random();
    const playerPointsToWin = 15 - playerScore;
    const aiPointsToWin = 15 - aiScore;
    let envidoAction: AiMove | null = null;
    
    const recentHistory = playerEnvidoFoldHistory.slice(-5);
    const foldCount = recentHistory.filter(f => f).length;
    const playerFoldRate = recentHistory.length > 0 ? foldCount / recentHistory.length : 0.3; // Default 30%
    const baseBluffChance = 0.10; // 10% base chance
    const adjustedBluffChance = Math.min(0.4, baseBluffChance + (playerFoldRate * 0.25)); // Increase bluff chance up to 40% if player folds a lot
    
    // High strength hand
    if (aiEnvido >= 30) {
        // Endgame Falta Envido
        if (aiPointsToWin <= 5 && randomFactor < 0.75) { // High chance to go for the win
            envidoAction = { action: { type: ActionType.CALL_FALTA_ENVIDO }, reasoning: `\nDecision: With a powerful hand (${aiEnvido.toFixed(1)}) and victory in sight, I call FALTA ENVIDO!` };
        } else {
            envidoAction = { action: { type: ActionType.CALL_REAL_ENVIDO }, reasoning: `\nDecision: With ${aiEnvido.toFixed(1)} points, I have a dominant hand. I will call REAL ENVIDO.` };
        }
    } 
    // Medium strength hand
    else if (aiEnvido >= 27) {
        // Defensive Falta Envido when player is close to winning
        if (playerPointsToWin <= 3 && aiEnvido >= 28) {
             envidoAction = { action: { type: ActionType.CALL_FALTA_ENVIDO }, reasoning: `\nDecision: Player is close to winning. A Falta Envido call is a low-risk defensive move with my hand (${aiEnvido.toFixed(1)}).` };
        } else {
            envidoAction = { action: { type: ActionType.CALL_ENVIDO }, reasoning: `\nDecision: My envido of ${aiEnvido.toFixed(1)} is strong. I will initiate with ENVIDO.` };
        }
    } 
    // Low strength hand - bluffing
    else if (aiEnvido < 22 && randomFactor < adjustedBluffChance) {
        reasonPrefix.push(`\n[Opponent Model]: Player's recent Envido fold rate is ${(playerFoldRate * 100).toFixed(0)}%. My bluff chance is ${(adjustedBluffChance * 100).toFixed(0)}%.`);
        envidoAction = { action: { type: ActionType.CALL_ENVIDO }, reasoning: `\nDecision: My hand is weak (${aiEnvido.toFixed(1)}), but I sense an opportunity. I will bluff and call ENVIDO.` };
    }

    if (envidoAction) {
        return { ...envidoAction, reasoning: [...reasonPrefix, envidoAction.reasoning].join('\n') };
    }
    
    return null;
}