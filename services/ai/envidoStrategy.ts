
import { GameState, AiMove, ActionType } from '../../types';
import { getEnvidoDetails, getFlorValue, hasFlor } from '../trucoLogic';
import { ENVIDO_PHRASES, REAL_ENVIDO_PHRASES, FALTA_ENVIDO_PHRASES, FLOR_PHRASES, getRandomPhrase, QUIERO_PHRASES, NO_QUIERO_PHRASES, CONTRAFLOR_PHRASES, CONTRAFLOR_QUIERO_PHRASES, CONTRAFLOR_ACHICO_FRASES } from './phrases';

// Helper for getEnvidoResponse: Estimates opponent's strength based on their call.
const estimateOpponentStrengthOnCall = (state: GameState): number => {
    const { envidoPointsOnOffer, opponentModel } = state;
    const playerContext = state.mano === 'player' ? 'mano' : 'pie';
    // Base the estimate on the player's learned calling threshold for the current context.
    let estimate = opponentModel.envidoBehavior[playerContext].callThreshold || 27;

    // Adjust based on the current situation. A higher stake implies a stronger hand.
    if (envidoPointsOnOffer >= 5) estimate = Math.max(estimate, 29); // Real Envido or more
    else if (envidoPointsOnOffer >= 3) estimate = Math.max(estimate, 28); // Real Envido
    
    return estimate;
}

export const getEnvidoResponse = (state: GameState, gamePressure: number, reasoning: string[]): AiMove | null => {
    const { initialAiHand, aiScore, mano, envidoPointsOnOffer, hasRealEnvidoBeenCalledThisSequence } = state;
    
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

    // Decision thresholds are now adjusted by gamePressure
    const escalateAdvantageThreshold = 0.15 - (gamePressure * 0.1); // Escalate more easily when desperate
    const acceptAdvantageThreshold = -0.1 - (gamePressure * 0.15); // Accept more easily when desperate
    const heroCallChance = 0.15 + (gamePressure > 0 ? gamePressure * 0.2 : 0); // Hero call more when desperate

    // High advantage -> Escalate
    if (advantage > escalateAdvantageThreshold) {
        if (aiPointsToWin <= envidoPointsOnOffer + 3 && myEnvido >= 30) {
             reasoning.push(`\nDecisión: Tengo una ventaja enorme y estoy cerca de ganar. Voy con todo con FALTA ENVIDO.`);
             const blurbText = getRandomPhrase(FALTA_ENVIDO_PHRASES);
             return { action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText } }, reasoning: reasoning.join('\n') };
        }
        if (!hasRealEnvidoBeenCalledThisSequence) {
             reasoning.push(`\nDecisión: Mi mano es mucho más fuerte. Subiré la apuesta con REAL ENVIDO.`);
             const blurbText = getRandomPhrase(REAL_ENVIDO_PHRASES);
             return { action: { type: ActionType.CALL_REAL_ENVIDO, payload: { blurbText } }, reasoning: reasoning.join('\n') };
        }
        if (envidoPointsOnOffer === 2 && myEnvido >= 28) { // Only escalate with Envido-Envido if hand is strong
            reasoning.push(`\nDecisión: Mi mano es fuerte, pero no quiero arriesgar un Real Envido. Responderé con ENVIDO.`);
            const blurbText = getRandomPhrase(ENVIDO_PHRASES);
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: reasoning.join('\n') };
        }
    } 
    
    // Positive or slightly negative advantage -> Accept
    if (advantage > acceptAdvantageThreshold) {
        reasoning.push(`\nDecisión: Las probabilidades están a mi favor, o son muy parejas. Voy a ACEPTAR.`);
        return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(QUIERO_PHRASES) } }, reasoning: reasoning.join('\n') };
    }

    // Low advantage -> Mostly Decline
    reasoning.push(`Mi mano parece más débil de lo que el jugador representa.`);
    if (myEnvido >= 23 && randomFactor < heroCallChance) {
         reasoning.push(`\nDecisión: Podría ser un farol. Tomaré el riesgo y voy a ACEPTAR (Prob. Hero Call: ${(heroCallChance * 100).toFixed(0)}%).`);
         return { action: { type: ActionType.ACCEPT, payload: { blurbText: getRandomPhrase(QUIERO_PHRASES) } }, reasoning: reasoning.join('\n') };
    }
    
    reasoning.push(`\nDecisión: El riesgo es muy alto. Voy a RECHAZAR.`);
    return { action: { type: ActionType.DECLINE, payload: { blurbText: getRandomPhrase(NO_QUIERO_PHRASES) } }, reasoning: reasoning.join('\n') };
}

export const getEnvidoCall = (state: GameState, gamePressure: number): AiMove | null => {
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
    
    const playerContext = state.mano === 'player' ? 'mano' : 'pie';
    const opponentContextualBehavior = opponentModel.envidoBehavior[playerContext];
    
    // AI's calling threshold is now dynamic based on game pressure
    const dynamicCallThreshold = opponentContextualBehavior.callThreshold - (gamePressure * 3); // More desperate -> lower threshold
    reasonPrefix.push(`\n[Modelo Oponente (${playerContext.toUpperCase()})]: Umbral de llamada del jugador: ~${opponentContextualBehavior.callThreshold.toFixed(1)}. Mi umbral ajustado por presión: ${dynamicCallThreshold.toFixed(1)}.`);

    const isObjectivelyStrong = myEnvido >= 28;
    reasonPrefix.push(`Mano objetivamente fuerte (>=28): ${isObjectivelyStrong ? 'Sí' : 'No'}.`);

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
    else if (isObjectivelyStrong || myEnvido >= dynamicCallThreshold) {
        if (playerPointsToWin <= 3 && myEnvido >= 28) {
             const blurbText = getRandomPhrase(FALTA_ENVIDO_PHRASES);
             const reasoning = `\nDecisión: El jugador está cerca de ganar. Un Falta Envido es una jugada defensiva fuerte con mi mano (${myEnvido.toFixed(1)}).`;
             return { action: { type: ActionType.CALL_FALTA_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        } else {
            const blurbText = getRandomPhrase(ENVIDO_PHRASES);
            const reasoning = `\nDecisión: Mi envido de ${myEnvido.toFixed(1)} es fuerte y ${isObjectivelyStrong ? 'es objetivamente bueno.' : 'supera el umbral dinámico.'} Inciaré con ENVIDO.`;
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
        // More desperate -> higher bluff chance. Cautious -> lower bluff chance.
        const adjustedBluffChance = Math.min(0.4, baseBluffChance + (opponentContextualBehavior.foldRate * 0.3) + (gamePressure > 0 ? gamePressure * 0.15 : 0));
        
        if (randomFactor < adjustedBluffChance) {
            const blurbText = getRandomPhrase(ENVIDO_PHRASES);
            reasonPrefix.push(`Mi probabilidad de farol ajustada es ${(adjustedBluffChance * 100).toFixed(0)}%.`);
            const reasoning = `\nDecisión: Mi mano es débil (${myEnvido.toFixed(1)}), pero siento una oportunidad. Farolearé y cantaré ENVIDO.`;
            return { action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
        }
    }
    
    return null; // No action
}

export const getFlorResponse = (state: GameState, reasoning: string[]): AiMove | null => {
    const { gamePhase, initialAiHand, aiHasFlor, playerHasFlor, aiScore } = state;

    if (gamePhase === 'flor_called') {
        reasoning.push(`[Lógica de Respuesta a Flor]: El jugador cantó Flor. Debo responder.`);
        if (aiHasFlor) {
            const myFlor = getFlorValue(initialAiHand);
            reasoning.push(`- Yo también tengo Flor, con un valor de ${myFlor}.`);
            // Simple strategy: if my Flor is very good, I escalate.
            if (myFlor >= 30) {
                 const decisionReason = `\nDecisión: Mi Flor es muy fuerte. Escalaré con ¡CONTRAFLOR AL RESTO!`;
                 return { action: { type: ActionType.CALL_CONTRAFLOR, payload: { blurbText: getRandomPhrase(CONTRAFLOR_PHRASES) } }, reasoning: [...reasoning, decisionReason].join('\n') };
            } else {
                 const decisionReason = `\nDecisión: Mi Flor no es lo suficientemente fuerte como para arriesgar una Contraflor. Aceptaré los puntos.`;
                 return { action: { type: ActionType.ACKNOWLEDGE_FLOR, payload: { blurbText: "Las mías son peores." } }, reasoning: [...reasoning, decisionReason].join('\n') };
            }
        } else {
            const decisionReason = `\nDecisión: No tengo Flor. Debo aceptar la derrota.`;
            return { action: { type: ActionType.ACKNOWLEDGE_FLOR, payload: { blurbText: "Son buenas." } }, reasoning: [...reasoning, decisionReason].join('\n') };
        }
    }

    if (gamePhase === 'contraflor_called') {
        reasoning.push(`[Lógica de Respuesta a Contraflor]: El jugador cantó Contraflor. Debo decidir si acepto el duelo.`);
        const myFlor = getFlorValue(initialAiHand);
        reasoning.push(`- Mi Flor tiene un valor de ${myFlor}.`);
        
        // --- NEW: Score-aware logic ---
        const pointsFromContraflor = 6;
        const canWinGame = (aiScore + pointsFromContraflor) >= 15;
        let acceptanceThreshold = 32; // Default conservative threshold

        if (canWinGame) {
            acceptanceThreshold = 30; // Lower threshold for a game-winning gamble
            reasoning.push(`- Análisis de Puntuación: Ganar esta Contraflor (${pointsFromContraflor} puntos) me daría la victoria del juego (llegaría a ${aiScore + pointsFromContraflor}).`);
            reasoning.push(`- Estrategia: Estoy dispuesto a tomar un riesgo mayor. Mi umbral de aceptación baja a ${acceptanceThreshold}.`);
        } else {
             reasoning.push(`- Estrategia: El riesgo es alto, seré conservador. Mi umbral de aceptación es ${acceptanceThreshold}.`);
        }
        // --- END NEW LOGIC ---

        if (myFlor >= acceptanceThreshold) {
            const decisionReason = `\nDecisión: Mi Flor de ${myFlor} cumple con mi umbral de ${acceptanceThreshold}. Acepto el desafío. ¡CON FLOR QUIERO!`;
            return { action: { type: ActionType.ACCEPT_CONTRAFLOR, payload: { blurbText: getRandomPhrase(CONTRAFLOR_QUIERO_PHRASES) } }, reasoning: [...reasoning, decisionReason].join('\n') };
        } else {
            const decisionReason = `\nDecisión: El jugador debe tener una Flor increíble para cantar Contraflor. Mi mano (${myFlor}) no es suficiente para arriesgarme dadas las circunstancias. CON FLOR ME ACHICO.`;
            return { action: { type: ActionType.DECLINE_CONTRAFLOR, payload: { blurbText: getRandomPhrase(CONTRAFLOR_ACHICO_FRASES) } }, reasoning: [...reasoning, decisionReason].join('\n') };
        }
    }

    return null;
};


export const getFlorCallOrEnvidoCall = (state: GameState, gamePressure: number): AiMove | null => {
    if (state.aiHasFlor) {
        const myFlor = getFlorValue(state.initialAiHand);
        let reasonPrefix: string[] = [`[Lógica: Cantar Flor o Envido]`, `Tengo Flor con un valor de ${myFlor}.`];
        
        // Strategic decision: call Flor or bluff Envido
        if (myFlor < 26 && Math.random() < 0.4) { // 40% chance to bluff with a weak Flor
            reasonPrefix.push(`Mi Flor es débil. Consideraré un farol de Envido para ocultar mi juego.`);
            const envidoMove = getEnvidoCall(state, gamePressure);
            if (envidoMove) {
                const updatedReasoning = [...reasonPrefix, `\n--- Faroleando con Envido ---`, envidoMove.reasoning].join('\n');
                return { ...envidoMove, reasoning: updatedReasoning };
            }
        }
        
        // Default to calling Flor
        const reasoning = `\nDecisión: Mi Flor de ${myFlor} es lo suficientemente buena. Cantaré ¡FLOR!`;
        const blurbText = getRandomPhrase(FLOR_PHRASES);
        return { action: { type: ActionType.DECLARE_FLOR, payload: { blurbText, player: 'ai' } }, reasoning: [...reasonPrefix, reasoning].join('\n') };
    } else {
        // No Flor, proceed with normal Envido logic
        return getEnvidoCall(state, gamePressure);
    }
}