import { GameState, AiMove, ActionType } from '../../types';
import { getEnvidoDetails } from '../trucoLogic';
import { ENVIDO_PHRASES, REAL_ENVIDO_PHRASES, FALTA_ENVIDO_PHRASES, getRandomPhrase, QUIERO_PHRASES, NO_QUIERO_PHRASES } from './phrases';

// Helper for getEnvidoResponse: Estimates opponent's strength based on their call.
const estimateOpponentStrengthOnCall = (state: GameState): number => {
    const { envidoPointsOnOffer, opponentModel } = state;
    // Base the estimate on the player's learned calling threshold.
    let estimate = opponentModel.envidoBehavior.callThreshold || 27;

    // Adjust based on the current situation. A higher stake implies a stronger hand.
    if (envidoPointsOnOffer >= 5) estimate = Math.max(estimate, 29); // Real Envido or more
    else if (envidoPointsOnOffer >= 3) estimate = Math.max(estimate, 28); // Real Envido
    
    return estimate;
}

export const getEnvidoResponse = (state: GameState, reasoning: string[]): AiMove | null => {
    const { initialAiHand, aiScore, mano, envidoPointsOnOffer, opponentModel } = state;
    
    const aiEnvidoDetails = getEnvidoDetails(initialAiHand);
    reasoning.push(aiEnvidoDetails.reasoning);
    let myEnvido = aiEnvidoDetails.value;

    if (mano === 'ai') {
        myEnvido += 0.5; // Mano bonus for winning ties
        reasoning.push(`Soy mano, lo que me da ventaja en empates.`);
    }

    const estimatedOpponentEnvido = estimateOpponentStrengthOnCall(state);
    reasoning.push(`[Modelo Oponente]: El jugador cantó por ${envidoPointsOnOffer} puntos. Basado en su comportamiento, estimo que su envido es alrededor de ${estimatedOpponentEnvido.toFixed(1)}.`);
    
    const advantage = (myEnvido - estimatedOpponentEnvido) / 33;
    reasoning.push(`Mi ventaja calculada es ${(advantage * 100).toFixed(0)}%.`);

    const randomFactor = Math.random();
    const aiPointsToWin = 15 - aiScore;
    const isPlayerInitialCall = envidoPointsOnOffer <= 3;

    // High advantage -> Escalate
    if (advantage > 0.15 && isPlayerInitialCall && opponentModel.envidoBehavior.escalationRate < 0.6) { // ~5+ point diff, and player doesn't escalate too often
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
    if (advantage > -0.1) { // My hand is close to or better than my estimate of theirs
        reasoning.push(`\nDecisión: Las probabilidades están a mi favor, o son muy parejas. Voy a ACEPTAR.`);
        return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(QUIERO_PHRASES) } }, reasoning: reasoning.join('\n') };
    }

    // Low advantage -> Mostly Decline
    reasoning.push(`Mi mano parece más débil de lo que el jugador representa.`);
    if (randomFactor < 0.10) { // 10% chance to "hero call"
         reasoning.push(`\nDecisión: Podría ser un farol. Tomaré el riesgo y voy a ACEPTAR.`);
         return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(QUIERO_PHRASES) } }, reasoning: reasoning.join('\n') };
    }
    
    reasoning.push(`\nDecisión: El riesgo es muy alto. Voy a RECHAZAR.`);
    return { action: { type: ActionType.DECLINE, payload: { blurbText: getRandomPhrase(NO_QUIERO_PHRASES) } }, reasoning: reasoning.join('\n') };
}

export const getEnvidoCall = (state: GameState): AiMove | null => {
    const { initialAiHand, playerScore, aiScore, mano, opponentModel } = state;
    
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
    
    const playerFoldRate = opponentModel.envidoBehavior.foldRate;
    reasonPrefix.push(`\n[Modelo Oponente]: La tasa de abandono de Envido del jugador es ${(playerFoldRate * 100).toFixed(0)}%. Suelen cantar con ~${opponentModel.envidoBehavior.callThreshold.toFixed(1)} puntos.`);

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
    else if (myEnvido >= opponentModel.envidoBehavior.callThreshold) {
        if (playerPointsToWin <= 3 && myEnvido >= 28) {
             const blurbText = getRandomPhrase(FALTA_ENVIDO_PHRASES);
             const reasoning = `\nDecisión: El jugador está cerca de ganar. Un Falta Envido es una jugada defensiva fuerte con mi mano (${myEnvido.toFixed(1)}).`;
             return { action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        } else {
            const blurbText = getRandomPhrase(ENVIDO_PHRASES);
            const reasoning = `\nDecisión: Mi envido de ${myEnvido.toFixed(1)} es fuerte y supera el umbral del jugador. Inciaré con ENVIDO.`;
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    }
    // Marginal hand -> Occasional call
    else if (myEnvido >= 23) {
        const marginalCallChance = 0.15;
        if (randomFactor < marginalCallChance) {
            const blurbText = getRandomPhrase(ENVIDO_PHRASES);
            const reasoning = `\nDecisión: Mi mano es mediocre (${myEnvido.toFixed(1)}), pero vale la pena intentarlo. Cantando ENVIDO.`;
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    }
    // Low strength hand -> Bluffing
    else {
        const baseBluffChance = 0.08;
        const adjustedBluffChance = Math.min(0.4, baseBluffChance + (playerFoldRate * 0.3));
        
        if (randomFactor < adjustedBluffChance) {
            const blurbText = getRandomPhrase(ENVIDO_PHRASES);
            reasonPrefix.push(`Mi probabilidad de farol ajustada es ${(adjustedBluffChance * 100).toFixed(0)}%.`);
            const reasoning = `\nDecisión: Mi mano es débil (${myEnvido.toFixed(1)}), pero siento una oportunidad basada en la tasa de abandono del jugador. Farolearé y cantaré ENVIDO.`;
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    }
    
    return null; // No action
}