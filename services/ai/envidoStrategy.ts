import { GameState, AiMove, ActionType } from '../../types';
import { getEnvidoDetails } from '../trucoLogic';

export const getEnvidoResponse = (state: GameState, reasoning: string[]): AiMove | null => {
    const { initialAiHand, aiScore } = state;
    
    const aiEnvidoDetails = getEnvidoDetails(initialAiHand);
    reasoning.push(aiEnvidoDetails.reasoning);
    const aiEnvido = aiEnvidoDetails.value;
    const randomFactor = Math.random();
    const aiPointsToWin = 15 - aiScore;

    // High strength hand
    if (aiEnvido >= 30) {
        // Near game end, be decisive
        if (aiPointsToWin <= 5) {
             reasoning.push(`\nDecision: I have a monster hand (${aiEnvido}) and I'm close to winning. I'm going all in with FALTA ENVIDO.`);
             return { action: { type: ActionType.CALL_FALTA_ENVIDO }, reasoning: reasoning.join('\n') };
        }
        reasoning.push(`\nDecision: My envido is very high (${aiEnvido}). I will escalate with REAL ENVIDO.`);
        return { action: { type: ActionType.CALL_REAL_ENVIDO }, reasoning: reasoning.join('\n') };
    } 
    // Medium strength hand
    else if (aiEnvido >= 25) {
        reasoning.push(`My hand is solid (${aiEnvido}).`);
        // Unpredictable escalation
        if (randomFactor < 0.15) { // 15% chance to escalate
             reasoning.push(`\nDecision: I feel confident. I'll apply pressure and escalate to REAL ENVIDO.`);
             return { action: { type: ActionType.CALL_REAL_ENVIDO }, reasoning: reasoning.join('\n') };
        }
        reasoning.push(`\nDecision: A solid hand is worth accepting.`);
        return { action: { type: ActionType.ACCEPT }, reasoning: reasoning.join('\n') };
    } 
    // Weak hand
    else {
        reasoning.push(`My hand is weak (${aiEnvido}).`);
        // Bluff "hero call"
        if (randomFactor < 0.10) { // 10% chance to accept anyway
             reasoning.push(`\nDecision: This might be a bluff from the player. I'll risk it and ACCEPT.`);
             return { action: { type: ActionType.ACCEPT }, reasoning: reasoning.join('\n') };
        }
        reasoning.push(`\nDecision: It's not worth the risk. I will DECLINE.`);
        return { action: { type: ActionType.DECLINE }, reasoning: reasoning.join('\n') };
    }
}

export const getEnvidoCall = (state: GameState): AiMove | null => {
    const { initialAiHand, playerScore, aiScore, playerEnvidoFoldHistory } = state;
    
    const aiEnvidoDetails = getEnvidoDetails(initialAiHand);
    const aiEnvido = aiEnvidoDetails.value;
    const randomFactor = Math.random();
    const playerPointsToWin = 15 - playerScore;
    const aiPointsToWin = 15 - aiScore;
    let envidoAction: AiMove | null = null;
    let reasonPrefix: string[] = [];
    
    const recentHistory = playerEnvidoFoldHistory.slice(-5);
    const foldCount = recentHistory.filter(f => f).length;
    const playerFoldRate = recentHistory.length > 0 ? foldCount / recentHistory.length : 0.3; // Default 30%
    const baseBluffChance = 0.10; // 10% base chance
    const adjustedBluffChance = Math.min(0.4, baseBluffChance + (playerFoldRate * 0.25)); // Increase bluff chance up to 40% if player folds a lot
    
    // High strength hand
    if (aiEnvido >= 30) {
        reasonPrefix = [`[Envido Call Logic]`, aiEnvidoDetails.reasoning];
        // Endgame Falta Envido
        if (aiPointsToWin <= 5 && randomFactor < 0.75) { // High chance to go for the win
            envidoAction = { action: { type: ActionType.CALL_FALTA_ENVIDO }, reasoning: `\nDecision: With a powerful hand (${aiEnvido}) and victory in sight, I call FALTA ENVIDO!` };
        } else {
            envidoAction = { action: { type: ActionType.CALL_REAL_ENVIDO }, reasoning: `\nDecision: With ${aiEnvido} points, I have a dominant hand. I will call REAL ENVIDO.` };
        }
    } 
    // Medium strength hand
    else if (aiEnvido >= 27) {
        reasonPrefix = [`[Envido Call Logic]`, aiEnvidoDetails.reasoning];
        // Defensive Falta Envido when player is close to winning
        if (playerPointsToWin <= 3 && aiEnvido >= 28) {
             envidoAction = { action: { type: ActionType.CALL_FALTA_ENVIDO }, reasoning: `\nDecision: Player is close to winning. A Falta Envido call is a low-risk defensive move with my hand (${aiEnvido}).` };
        } else {
            envidoAction = { action: { type: ActionType.CALL_ENVIDO }, reasoning: `\nDecision: My envido of ${aiEnvido} is strong. I will initiate with ENVIDO.` };
        }
    } 
    // Low strength hand - bluffing
    else if (aiEnvido < 22 && randomFactor < adjustedBluffChance) {
        reasonPrefix = [`[Envido Call Logic]`, aiEnvidoDetails.reasoning];
        reasonPrefix.push(`\n[Opponent Model]: Player's recent Envido fold rate is ${(playerFoldRate * 100).toFixed(0)}%. My bluff chance is ${(adjustedBluffChance * 100).toFixed(0)}%.`);
        envidoAction = { action: { type: ActionType.CALL_ENVIDO }, reasoning: `\nDecision: My hand is weak (${aiEnvido}), but I sense an opportunity. I will bluff and call ENVIDO.` };
    }

    if (envidoAction) {
        return { ...envidoAction, reasoning: [...reasonPrefix, envidoAction.reasoning].join('\n') };
    }
    
    return null;
}