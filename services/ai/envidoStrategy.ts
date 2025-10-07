import { GameState, AiMove, ActionType } from '../../types';
import { getEnvidoDetails } from '../trucoLogic';
import { ENVIDO_PHRASES, REAL_ENVIDO_PHRASES, FALTA_ENVIDO_PHRASES, getRandomPhrase, QUIERO_PHRASES, NO_QUIERO_PHRASES } from './phrases';

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
        reasoning.push(`Soy mano, lo que me da ventaja en empates.`);
    }

    const estimatedOpponentEnvido = estimateOpponentStrengthOnCall(state);
    reasoning.push(`[Modelo Oponente]: El jugador cantó por ${envidoPointsOnOffer} puntos. Estimo que su envido es alrededor de ${estimatedOpponentEnvido}.`);
    
    const advantage = (myEnvido - estimatedOpponentEnvido) / 33;
    reasoning.push(`Mi ventaja calculada es ${(advantage * 100).toFixed(0)}%.`);

    const randomFactor = Math.random();
    const aiPointsToWin = 15 - aiScore;
    const isPlayerInitialCall = envidoPointsOnOffer <= 3;

    // High advantage -> Escalate
    if (advantage > 0.2 && isPlayerInitialCall) { // ~7+ point difference
        if (aiPointsToWin <= envidoPointsOnOffer + 3 && myEnvido >= 30) {
             reasoning.push(`\nDecisión: Tengo una ventaja enorme y estoy cerca de ganar. Voy con todo con FALTA ENVIDO.`);
             const blurbText = getRandomPhrase(FALTA_ENVIDO_PHRASES);
             return { action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText } }, reasoning: reasoning.join('\n') };
        }
        reasoning.push(`\nDecisión: Mi mano es mucho más fuerte. Subiré la apuesta con REAL ENVIDO.`);
        const blurbText = getRandomPhrase(REAL_ENVIDO_PHRASES);
        return { action: { type: ActionType.CALL_REAL_ENVIDO, payload: { blurbText } }, reasoning: reasoning.join('\n') };
    } 
    
    // Positive or slightly negative advantage -> Accept
    if (advantage > -0.15) { // My hand is close to or better than my estimate of theirs
        reasoning.push(`\nDecisión: Las probabilidades están a mi favor, o son muy parejas. Voy a ACEPTAR.`);
        return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(QUIERO_PHRASES) } }, reasoning: reasoning.join('\n') };
    }

    // Low advantage -> Mostly Decline
    reasoning.push(`Mi mano parece más débil de lo que el jugador representa.`);
    if (randomFactor < 0.15) { // 15% chance to "hero call"
         reasoning.push(`\nDecisión: Podría ser un farol. Tomaré el riesgo y voy a ACEPTAR.`);
         return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(QUIERO_PHRASES) } }, reasoning: reasoning.join('\n') };
    }
    
    reasoning.push(`\nDecisión: El riesgo es muy alto. Voy a RECHAZAR.`);
    return { action: { type: ActionType.DECLINE, payload: { blurbText: getRandomPhrase(NO_QUIERO_PHRASES) } }, reasoning: reasoning.join('\n') };
}

export const getEnvidoCall = (state: GameState): AiMove | null => {
    const { initialAiHand, playerScore, aiScore, playerEnvidoFoldHistory, mano } = state;
    
    const aiEnvidoDetails = getEnvidoDetails(initialAiHand);
    let myEnvido = aiEnvidoDetails.value;
    let reasonPrefix: string[] = [`[Lógica: Cantar Envido]`, aiEnvidoDetails.reasoning];

    if (mano === 'ai') {
        myEnvido += 0.5; // Mano bonus
        reasonPrefix.push(`Soy mano, lo que me da ventaja en empates.`);
    }

    const randomFactor = Math.random();
    const playerPointsToWin = 15 - playerScore;
    const aiPointsToWin = 15 - aiScore;
    
    const recentHistory = playerEnvidoFoldHistory.slice(-5);
    const foldCount = recentHistory.filter(f => f).length;
    const playerFoldRate = recentHistory.length > 0 ? foldCount / recentHistory.length : 0.3; // Default 30%
    reasonPrefix.push(`\n[Modelo Oponente]: La tasa de abandono de Envido reciente del jugador es ${(playerFoldRate * 100).toFixed(0)}%.`);

    // High strength hand -> Escalate
    if (myEnvido >= 30) {
        if (aiPointsToWin <= 5 && randomFactor < 0.75) {
            const blurbText = getRandomPhrase(FALTA_ENVIDO_PHRASES);
            const reasoning = `\nDecisión: Con una mano poderosa (${myEnvido.toFixed(1)}) y la victoria a la vista, canto ¡FALTA ENVIDO!`;
            return { action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        } else {
            const blurbText = getRandomPhrase(REAL_ENVIDO_PHRASES);
            const reasoning = `\nDecisión: Con ${myEnvido.toFixed(1)} puntos, tengo una mano dominante. Cantaré REAL ENVIDO para maximizar el valor.`;
            return { action: { type: ActionType.CALL_REAL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    } 
    // Strong hand -> Standard call
    else if (myEnvido >= 27) {
        if (playerPointsToWin <= 3 && myEnvido >= 28) {
             const blurbText = getRandomPhrase(FALTA_ENVIDO_PHRASES);
             const reasoning = `\nDecisión: El jugador está cerca de ganar. Un Falta Envido es una jugada defensiva fuerte con mi mano (${myEnvido.toFixed(1)}).`;
             return { action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        } else {
            const blurbText = getRandomPhrase(ENVIDO_PHRASES);
            const reasoning = `\nDecisión: Mi envido de ${myEnvido.toFixed(1)} es fuerte. Inciaré con ENVIDO.`;
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    }
    // Marginal hand -> Occasional call
    else if (myEnvido >= 23) { // New tier: 23-26
        const marginalCallChance = 0.20; // 20% chance to call with a marginal hand
        if (randomFactor < marginalCallChance) {
            const blurbText = getRandomPhrase(ENVIDO_PHRASES);
            const reasoning = `\nDecisión: Mi mano es mediocre (${myEnvido.toFixed(1)}), pero vale la pena intentarlo. Cantando ENVIDO.`;
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    }
    // Low strength hand -> Bluffing
    else {
        const baseBluffChance = 0.10;
        const adjustedBluffChance = Math.min(0.4, baseBluffChance + (playerFoldRate * 0.25));
        
        if (randomFactor < adjustedBluffChance) {
            const blurbText = getRandomPhrase(ENVIDO_PHRASES);
            reasonPrefix.push(`Mi probabilidad de farol ajustada es ${(adjustedBluffChance * 100).toFixed(0)}%.`);
            const reasoning = `\nDecisión: Mi mano es débil (${myEnvido.toFixed(1)}), pero siento una oportunidad basada en la tasa de abandono del jugador. Farolearé y cantaré ENVIDO.`;
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    }
    
    return null; // No action
}