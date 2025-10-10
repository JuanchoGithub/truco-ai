

import { GameState, ActionType, AiMove } from '../types';
import { findBestCardToPlay } from './ai/playCardStrategy';
import { getEnvidoResponse, getEnvidoCall, getFlorResponse, getFlorCallOrEnvidoCall } from './ai/envidoStrategy';
import { getTrucoResponse, getTrucoCall } from './ai/trucoStrategy';
import { getCardName, getEnvidoDetails, calculateHandStrength } from './trucoLogic';
import { getRandomPhrase, FLOR_PHRASES, ENVIDO_PRIMERO_PHRASES, QUIERO_PHRASES, NO_QUIERO_PHRASES } from './ai/phrases';

export const getLocalAIMove = (state: GameState): AiMove => {
    const { gamePhase, currentTurn, lastCaller, currentTrick, hasEnvidoBeenCalledThisRound, aiHasFlor, playerHasFlor, hasFlorBeenCalledThisRound, playerTricks, aiTricks, trickWinners, aiScore, playerScore } = state;
    let reasoning: string[] = [];
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
    reasoning.push(`[Análisis Estratégico]`);
    reasoning.push(`Presión de Juego: ${gamePressure.toFixed(2)} (${gamePressure > 0.5 ? 'Desesperado' : gamePressure < -0.5 ? 'Cauteloso' : 'Neutral'})`);
    reasoning.push(`--------------------`);


    // Recap the previous trick if it's not the first trick
    if (currentTrick > 0) {
        const lastTrickIndex = currentTrick - 1;
        const playerCard = playerTricks[lastTrickIndex];
        const aiCard = aiTricks[lastTrickIndex];
        const winner = trickWinners[lastTrickIndex];

        if (playerCard && aiCard && winner) {
            reasoning.push(`[Resumen Mano ${lastTrickIndex + 1}]`);
            reasoning.push(`Jugador jugó: ${getCardName(playerCard)}`);
            reasoning.push(`Yo jugué: ${getCardName(aiCard)}`);
            reasoning.push(`Resultado: ${winner === 'tie' ? 'Empate' : `${winner.toUpperCase()} ganó`}`);
            reasoning.push(`--------------------`);
        }
    }

    // 1. MUST RESPOND to a player's call
    if (gamePhase.includes('_called') && currentTurn === 'ai' && lastCaller === 'player') {
        reasoning.push(`[Lógica de Respuesta]`);
        reasoning.push(`El jugador cantó ${gamePhase.replace('_called', '').toUpperCase()}. Debo responder.`);

        // Flor response logic
        if (gamePhase === 'flor_called' || gamePhase === 'contraflor_called') {
            move = getFlorResponse(state, reasoning);
            if (move) return move;
        }
        
        // FIX: Broaden the condition for "Envido Primero". It can be called as long as the first trick isn't over.
        const canCallEnvidoPrimero = gamePhase === 'truco_called' && currentTrick === 0 && !hasEnvidoBeenCalledThisRound;
        if (canCallEnvidoPrimero) {
            // If AI has flor, it must respond with flor.
            if (aiHasFlor) {
                const blurbText = getRandomPhrase(FLOR_PHRASES);
                return {
                    action: { type: ActionType.DECLARE_FLOR, payload: { blurbText } },
                    reasoning: "[Lógica de Prioridad: Flor]\nEl jugador cantó TRUCO, pero mi Flor tiene prioridad. Debo declararla."
                };
            }
            const envidoCallDecision = getEnvidoCall(state, gamePressure);
            if (envidoCallDecision) {
                 const blurbText = getRandomPhrase(ENVIDO_PRIMERO_PHRASES);
                 const updatedReasoning = `[Lógica de Envido Primero]\nEl jugador cantó TRUCO, pero invocaré la prioridad del Envido.\n` + envidoCallDecision.reasoning;
                 return { ...envidoCallDecision, reasoning: updatedReasoning, action: { type: ActionType.CALL_ENVIDO, payload: { blurbText } } };
            }
        }
        
        if (gamePhase === 'envido_called') {
            // Check for Flor response to Envido
            if (aiHasFlor) {
                const blurbText = getRandomPhrase(FLOR_PHRASES);
                return {
                    action: { type: ActionType.RESPOND_TO_ENVIDO_WITH_FLOR, payload: { blurbText } },
                    reasoning: "[Lógica de Prioridad: Flor]\nEl jugador cantó Envido. Mi Flor lo anula y gana 3 puntos."
                };
            }
            move = getEnvidoResponse(state, gamePressure, reasoning);
        }

        if (gamePhase.includes('truco') || gamePhase.includes('vale_cuatro')) {
            move = getTrucoResponse(state, gamePressure, reasoning);
        }
        if (move) return move;
    }

    // 2. DECIDE TO MAKE A CALL
    if (!gamePhase.includes('_called')) {
        let singingMove: AiMove | null = null;
        let trucoMove: AiMove | null = null;
        
        const canSing = !hasEnvidoBeenCalledThisRound && currentTrick === 0 && state.aiTricks[0] === null;
        if (canSing) {
            singingMove = getFlorCallOrEnvidoCall(state, gamePressure);
        }
        
        if (!gamePhase.includes('envido') && !gamePhase.includes('flor')) {
            trucoMove = getTrucoCall(state, gamePressure);
        }

        // --- NEW: Advanced Strategic Baiting Logic ---
        // This block decides if it's better to NOT sing a good Envido/Flor to set up a trap or bait the opponent.
        if (singingMove) {
            const aiEnvidoDetails = getEnvidoDetails(state.initialAiHand);
            const handStrength = calculateHandStrength(state.initialAiHand);
            const { opponentModel } = state;

            // SCENARIO 1: MONSTER HAND BAIT (Strong Envido + Strong Truco)
            // Goal: Set a Truco trap by hiding the high Envido/Flor score.
            if (aiEnvidoDetails.value >= 31 && handStrength >= 20) {
                const baseChance = 0.60;
                const adjustedChance = baseChance + (opponentModel.trucoFoldRate * 0.1); 

                if (Math.random() < adjustedChance && trucoMove) {
                    const reasoningBait = `[Lógica Estratégica Superior: Trampa de Monstruo]\n` +
                                    `Evaluación de Mano Completa:\n` +
                                    `  - Puntos de Envido/Flor: ${aiEnvidoDetails.value} (Extremadamente Fuerte).\n` +
                                    `  - Fuerza de Truco: ${handStrength} (Élite).\n` +
                                    `Análisis: Mi mano es un "monstruo" en ambas fases. Cantar un Envido/Flor tan alto (que probablemente ganaría) alertaría al jugador de mis cartas altas, haciéndolo jugar el Truco con extrema cautela.\n` +
                                    `Decisión Táctica: Sacrificaré la ganancia de puntos del Envido para ocultar mi fuerza y tender una trampa, con el objetivo de ganar más puntos en un Truco posterior.\n` +
                                    `\n--- Procediendo con el plan de Truco ---\n` +
                                    trucoMove.reasoning;
                    return { ...trucoMove, reasoning: reasoningBait };
                }
            }
            
            // SCENARIO 2: LOPSIDED HAND BAIT (Strong Envido + Weak Truco)
            // Goal: Bait the player into calling Envido to win more points there, offsetting a likely Truco loss.
            else if (aiEnvidoDetails.value >= 29 && handStrength <= 11) {
                let baitChance = 0.15; // Base 15% chance
                let baitReasoning = `Mi Envido es fuerte (${aiEnvidoDetails.value}) pero mi Truco es débil (${handStrength}). Consideraré una jugada de cebo.`;
                
                if (opponentModel.envidoBehavior.pie.callThreshold < 27) { // Using 'pie' as a general proxy for player's aggression
                    baitChance += 0.20;
                    baitReasoning += `\n- El jugador es agresivo con el Envido (umbral < 27), aumentando la probabilidad de que muerda el anzuelo. (+20%)`;
                }
                
                if (opponentModel.envidoBehavior.pie.foldRate < 0.35) {
                    baitChance += 0.15;
                    baitReasoning += `\n- El jugador rara vez se retira del Envido, lo que significa que puedo extraer más valor si escalo. (+15%)`;
                }

                baitChance = Math.min(0.5, baitChance); // Cap at 50%
                baitReasoning += `\n- Probabilidad final de cebo: ${(baitChance * 100).toFixed(0)}%.`;

                if (Math.random() < baitChance) {
                    // If baiting, we DO NOT sing. We play a card instead and wait.
                    const cardToPlayResult = findBestCardToPlay(state);
                    const reasoningLopsided = `[Lógica Estratégica Superior: Cebo de Envido]\n` +
                                    `Evaluación de Mano Completa:\n` +
                                    `  - Puntos de Envido/Flor: ${aiEnvidoDetails.value} (Fuerte).\n` +
                                    `  - Fuerza de Truco: ${handStrength} (Débil).\n` +
                                    `Análisis: Mi mano es desequilibrada. Probablemente perderé si se canta Truco. Mi mejor oportunidad es maximizar los puntos del Envido.\n` +
                                    `Decisión Táctica: No cantaré mi Envido. En su lugar, jugaré una carta y esperaré a que el jugador cante Envido primero. Esto me permite contraatacar y potencialmente ganar más puntos, compensando mi debilidad en el Truco.\n` +
                                    `\n[Análisis de Probabilidad de Cebo]\n${baitReasoning}` +
                                    `\n\n--- Procediendo con una jugada de carta silenciosa ---\n` +
                                    cardToPlayResult.reasoning.join('\n');
                    
                    return { 
                        action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: cardToPlayResult.index } },
                        reasoning: reasoningLopsided
                    };
                }
            }

            // DEFAULT: If no baiting strategy is triggered, the Envido/Flor call takes precedence.
            return singingMove;
        }

        if (trucoMove) return trucoMove;
    }

    // 3. Just PLAY A CARD
    const cardToPlayResult = findBestCardToPlay(state);
    const finalReasoning = [...reasoning, ...cardToPlayResult.reasoning];
    
    return { 
        action: { type: ActionType.PLAY_CARD, payload: { player: 'ai', cardIndex: cardToPlayResult.index } },
        reasoning: finalReasoning.join('\n')
    };
};