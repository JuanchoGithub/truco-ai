
import { GameState, ActionType, Player, GamePhase, Case, PlayerEnvidoActionEntry } from '../../types';
import { getEnvidoValue, getFlorValue, getCardCode } from '../../services/trucoLogic';
import { updateProbsOnEnvido } from '../../services/ai/inferenceService';
import { getRandomPhrase, ENVIDO_LOSE_PHRASES, ENVIDO_WIN_PHRASES, POST_ENVIDO_TRUCO_REMINDER_PHRASES } from '../../services/ai/phrases';
import { handleStartNewRound } from './gameplayReducer';

function updateRoundHistoryWithCall(state: GameState, callText: string): GameState {
    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
      currentRoundSummary.calls.push(callText);
    }
    return { ...state, roundHistory: newRoundHistory };
};

export function handleResolveEnvidoAccept(state: GameState): GameState {
    const isPlayerRespondingToAI = state.lastCaller === 'ai';
    const newEnvidoFoldHistory = isPlayerRespondingToAI
        ? [...state.playerEnvidoFoldHistory, false]
        : state.playerEnvidoFoldHistory;

    const playerEnvido = getEnvidoValue(state.initialPlayerHand);
    const aiEnvido = getEnvidoValue(state.initialAiHand);
    let envidoMessage = `Jugador tiene ${playerEnvido}. La IA tiene ${aiEnvido}.`;

    let updatedProbs = state.opponentHandProbabilities;
    // If AI called and player accepted, we now know the player's envido value.
    // This is a huge information leak we can use.
    if (state.lastCaller === 'ai' && updatedProbs) {
      updatedProbs = updateProbsOnEnvido(updatedProbs, playerEnvido, state.mano === 'player');
    }

    let winner: Player;
    if (playerEnvido > aiEnvido) {
        winner = 'player';
    } else if (aiEnvido > playerEnvido) {
        winner = 'ai';
    } else {
        winner = state.mano; // Tie is broken by 'mano'
    }

    let newPlayerScore = state.playerScore;
    let newAiScore = state.aiScore;
    let playerCalledHighEnvido = state.playerCalledHighEnvido;
    let centralMessageText: string;
    
    if (playerEnvido === aiEnvido) {
        centralMessageText = `Empate en ${playerEnvido}. ${winner === 'player' ? 'Ganaste' : 'Gana la IA'} por ser mano.`;
    } else {
        centralMessageText = `Tus tantos: ${playerEnvido}. IA: ${aiEnvido}. ${winner === 'player' ? '¡Ganaste!' : 'Gana la IA.'}`;
    }
    
    let finalBlurb;
    if (state.pendingTrucoCaller === 'ai') {
        const reminderPhrase = getRandomPhrase(POST_ENVIDO_TRUCO_REMINDER_PHRASES);
        finalBlurb = { text: reminderPhrase, isVisible: true };
    } else {
        if (winner === 'ai') {
          finalBlurb = { text: getRandomPhrase(ENVIDO_WIN_PHRASES), isVisible: true };
        } else {
          finalBlurb = { text: getRandomPhrase(ENVIDO_LOSE_PHRASES), isVisible: true };
        }
    }

    if (winner === 'player') {
        newPlayerScore += state.envidoPointsOnOffer;
        envidoMessage += ` Jugador gana ${state.envidoPointsOnOffer} ${state.envidoPointsOnOffer === 1 ? 'punto' : 'puntos'}.`;
        if (state.lastCaller === 'player' && playerEnvido >= 27) {
            playerCalledHighEnvido = true;
        }
    } else {
        newAiScore += state.envidoPointsOnOffer;
        envidoMessage += ` La IA gana ${state.envidoPointsOnOffer} ${state.envidoPointsOnOffer === 1 ? 'punto' : 'puntos'}.`;
    }

    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
        if (!currentRoundSummary.pointsAwarded.by) { // For old saved games
            currentRoundSummary.pointsAwarded.by = { flor: { player: 0, ai: 0, note: "" }, envido: { player: 0, ai: 0, note: "" }, truco: { player: 0, ai: 0, note: "" } };
        }
        if (winner === 'player') {
            currentRoundSummary.pointsAwarded.player += state.envidoPointsOnOffer;
            currentRoundSummary.pointsAwarded.by.envido.player = state.envidoPointsOnOffer;
        } else {
            currentRoundSummary.pointsAwarded.ai += state.envidoPointsOnOffer;
            currentRoundSummary.pointsAwarded.by.envido.ai = state.envidoPointsOnOffer;
        }
        currentRoundSummary.pointsAwarded.by.envido.note = "Aceptado";
    }

    // Check for a game winner immediately after awarding points
    if (newPlayerScore >= 15 || newAiScore >= 15) {
        const finalWinner = newPlayerScore >= 15 ? 'player' : 'ai';
        const finalMessage = finalWinner === 'player'
          ? "¡Ganaste el juego! La ronda terminó antes porque ya tenés los puntos para ganar."
          : "¡Perdiste el juego! La ronda terminó antes porque la IA ya tiene los puntos para ganar.";
        return {
            ...state,
            playerScore: newPlayerScore,
            aiScore: newAiScore,
            messageLog: [...state.messageLog, envidoMessage, finalMessage],
            winner: finalWinner,
            gamePhase: 'game_over',
            gameOverReason: finalMessage,
            centralMessage: null,
            isCentralMessagePersistent: false,
            roundHistory: newRoundHistory
        };
    }

    const postEnvidoState = state.pendingTrucoCaller ? {
        gamePhase: 'truco_called' as GamePhase,
        currentTurn: state.pendingTrucoCaller === 'player' ? 'ai' : 'player' as Player,
        lastCaller: state.pendingTrucoCaller,
        pendingTrucoCaller: null,
    } : {
        gamePhase: `trick_${state.currentTrick + 1}` as GamePhase,
        currentTurn: state.turnBeforeInterrupt!,
        turnBeforeInterrupt: null,
    };
    
    return {
        ...state,
        playerScore: newPlayerScore,
        aiScore: newAiScore,
        messageLog: [...state.messageLog, envidoMessage],
        playerEnvidoFoldHistory: newEnvidoFoldHistory,
        playerCalledHighEnvido,
        opponentHandProbabilities: updatedProbs,
        playerEnvidoValue: playerEnvido,
        aiEnvidoValue: aiEnvido,
        hasRealEnvidoBeenCalledThisSequence: false, // Reset for next round
        ...postEnvidoState,
        aiBlurb: finalBlurb,
        centralMessage: centralMessageText,
        isCentralMessagePersistent: true,
        roundHistory: newRoundHistory,
    };
}

function handleTrucoAccept(state: GameState, messageLog: string[]): GameState {
    // Game continues. The turn should be restored to whoever was about to play.
    // Accepting truco closes the window for envido calls for the rest of the round.
    return {
        ...state,
        gamePhase: `trick_${state.currentTrick + 1}` as GamePhase,
        currentTurn: state.turnBeforeInterrupt!, // Restore the turn
        turnBeforeInterrupt: null, // Reset the interrupt state
        pendingTrucoCaller: null,
        hasEnvidoBeenCalledThisRound: true, // This prevents any future envido calls this round
        messageLog,
        playerActionHistory: [...state.playerActionHistory, ActionType.ACCEPT],
        isThinking: false,
    };
}

export function handleAccept(state: GameState, action: { type: ActionType.ACCEPT; payload?: { blurbText: string } }): GameState {
    const acceptor = state.currentTurn!;
    const acceptorName = acceptor === 'player' ? 'Jugador' : 'IA';
    const isPlayer = acceptor === 'player';
    const messageLog = [...state.messageLog, `¡${acceptorName} quiere!`];

    let newEnvidoHistory = state.playerEnvidoHistory;
    if (state.gamePhase.includes('envido') && isPlayer) {
        const entry: PlayerEnvidoActionEntry = {
            round: state.round,
            envidoPoints: getEnvidoValue(state.initialPlayerHand),
            action: 'accepted',
            wasMano: state.mano === 'player',
        };
        newEnvidoHistory = [...state.playerEnvidoHistory, entry];
    }
    
    const updatedStateWithCall = updateRoundHistoryWithCall(state, `${acceptor}: Quiero`);

    const newState = {
      ...updatedStateWithCall,
      playerEnvidoHistory: newEnvidoHistory,
      playerBlurb: isPlayer ? { text: '¡Quiero!', isVisible: true } : null,
      aiBlurb: !isPlayer && action.payload?.blurbText 
        ? { text: action.payload.blurbText, isVisible: true } 
        : null,
    };

    if (state.gamePhase.includes('envido')) {
        return {
            ...newState,
            gamePhase: 'ENVIDO_ACCEPTED',
            messageLog,
            isThinking: false, // Stop thinking indicator after response
        };
    }
    
    if (state.gamePhase.includes('truco') || state.gamePhase.includes('vale_cuatro')) {
        return handleTrucoAccept(newState, messageLog);
    }
    return newState;
}

export function handleResolveEnvidoDecline(state: GameState): GameState {
    const caller = state.lastCaller!;
    const isPlayerRespondingToAI = state.lastCaller === 'ai';
    const newFoldHistory = isPlayerRespondingToAI
        ? [...state.playerEnvidoFoldHistory, true]
        : state.playerEnvidoFoldHistory;

    let points = 1; // Default for declining a simple Envido.
    // If previousEnvidoPoints > 0, it was an escalation. Points are from the previous bet.
    if (state.previousEnvidoPoints > 0) {
        points = state.previousEnvidoPoints;
    }

    let finalBlurb = null;
    if (state.pendingTrucoCaller === 'ai') {
        const reminderPhrase = getRandomPhrase(POST_ENVIDO_TRUCO_REMINDER_PHRASES);
        finalBlurb = { text: reminderPhrase, isVisible: true };
    }
    
    const winnerName = caller === 'player' ? 'Jugador' : 'IA';
    const finalLogMessage = `${winnerName} gana ${points} ${points === 1 ? 'punto' : 'puntos'}.`;
    const newPlayerScore = caller === 'player' ? state.playerScore + points : state.playerScore;
    const newAiScore = caller === 'ai' ? state.aiScore + points : state.aiScore;

    // Finalize the round history points
    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
        if (!currentRoundSummary.pointsAwarded.by) {
            currentRoundSummary.pointsAwarded.by = { flor: { player: 0, ai: 0, note: "" }, envido: { player: 0, ai: 0, note: "" }, truco: { player: 0, ai: 0, note: "" } };
        }
        const declinerName = state.currentTurn === 'player' ? 'Jugador' : 'IA';

        if (caller === 'player') {
            currentRoundSummary.pointsAwarded.player += points;
            currentRoundSummary.pointsAwarded.by.envido.player = points;
        }
        if (caller === 'ai') {
            currentRoundSummary.pointsAwarded.ai += points;
            currentRoundSummary.pointsAwarded.by.envido.ai = points;
        }
        currentRoundSummary.pointsAwarded.by.envido.note = `${declinerName} no quiso`;
    }

    // Check for a game winner immediately after awarding points
    if (newPlayerScore >= 15 || newAiScore >= 15) {
        const finalWinner = newPlayerScore >= 15 ? 'player' : 'ai';
        const finalMessage = finalWinner === 'player'
          ? "¡Ganaste el juego! La ronda terminó antes porque ya tenés los puntos para ganar."
          : "¡Perdiste el juego! La ronda terminó antes porque la IA ya tiene los puntos para ganar.";
        return {
            ...state,
            playerScore: newPlayerScore,
            aiScore: newAiScore,
            messageLog: [...state.messageLog, finalLogMessage, finalMessage],
            winner: finalWinner,
            gamePhase: 'game_over',
            gameOverReason: finalMessage,
            centralMessage: null,
            isCentralMessagePersistent: false,
            roundHistory: newRoundHistory,
        };
    }

    const postEnvidoState = state.pendingTrucoCaller ? {
        gamePhase: 'truco_called' as GamePhase,
        currentTurn: state.pendingTrucoCaller === 'player' ? 'ai' : 'player' as Player,
        lastCaller: state.pendingTrucoCaller,
        pendingTrucoCaller: null,
    } : {
        gamePhase: `trick_${state.currentTrick + 1}` as GamePhase,
        currentTurn: state.turnBeforeInterrupt!,
        turnBeforeInterrupt: null,
    };
    
    return {
        ...state,
        playerScore: newPlayerScore,
        aiScore: newAiScore,
        messageLog: [...state.messageLog, finalLogMessage],
        playerEnvidoFoldHistory: newFoldHistory,
        playerActionHistory: [...state.playerActionHistory, ActionType.DECLINE],
        hasRealEnvidoBeenCalledThisSequence: false, // Reset for next round
        ...postEnvidoState,
        aiBlurb: finalBlurb,
        roundHistory: newRoundHistory,
    };
}

export function handleResolveTrucoDecline(state: GameState): GameState {
    const caller = state.lastCaller!;
    let newOpponentModel = state.opponentModel;
    let newAiCases = state.aiCases;

    if (caller === 'ai' && state.aiTrucoContext) {
        const newCase: Case = {
            ...state.aiTrucoContext,
            outcome: 'win',
            opponentFoldRateAtTimeOfCall: state.opponentModel.trucoFoldRate,
        };
        newAiCases = [...state.aiCases, newCase];

        const decay = 0.9;
        const newFoldRate = state.opponentModel.trucoFoldRate * decay + (1 - decay) * 1;
        
        let newBluffSuccessRate = state.opponentModel.bluffSuccessRate;
        if (state.aiTrucoContext.isBluff) {
            const outcome = 1; // FIX: Player folding to a bluff is a success for the AI.
            newBluffSuccessRate = state.opponentModel.bluffSuccessRate * decay + (1 - decay) * outcome;
        }

        newOpponentModel = {
            ...newOpponentModel,
            trucoFoldRate: Math.min(0.95, newFoldRate),
            bluffSuccessRate: newBluffSuccessRate
        };
    }
    
    const points = state.trucoLevel;
    const winnerName = caller === 'player' ? 'Jugador' : 'IA';
    const finalLogMessage = `${winnerName} gana ${points} ${points === 1 ? 'punto' : 'puntos'}.`;

    const newPlayerScore = caller === 'player' ? state.playerScore + points : state.playerScore;
    const newAiScore = caller === 'ai' ? state.aiScore + points : state.aiScore;

    // Finalize the round history
    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
        if (!currentRoundSummary.pointsAwarded.by) {
            currentRoundSummary.pointsAwarded.by = { flor: { player: 0, ai: 0, note: "" }, envido: { player: 0, ai: 0, note: "" }, truco: { player: 0, ai: 0, note: "" } };
        }
        currentRoundSummary.roundWinner = caller;
        const declinerName = state.currentTurn === 'player' ? 'Jugador' : 'IA';
        if (caller === 'player') {
            currentRoundSummary.pointsAwarded.player += points;
            currentRoundSummary.pointsAwarded.by.truco.player = points;
        }
        if (caller === 'ai') {
            currentRoundSummary.pointsAwarded.ai += points;
            currentRoundSummary.pointsAwarded.by.truco.ai = points;
        }
        currentRoundSummary.pointsAwarded.by.truco.note = `${declinerName} no quiso`;
        currentRoundSummary.playerTricks = state.playerTricks.map(c => c ? getCardCode(c) : null);
        currentRoundSummary.aiTricks = state.aiTricks.map(c => c ? getCardCode(c) : null);
    }
    
    if (newPlayerScore >= 15 || newAiScore >= 15) {
        const finalWinner = newPlayerScore >= 15 ? 'player' : 'ai';
        const finalMessage = finalWinner === 'player'
          ? "¡Ganaste el juego! La ronda terminó antes porque ya tenés los puntos para ganar."
          : "¡Perdiste el juego! La ronda terminó antes porque la IA ya tiene los puntos para ganar.";
        
        return {
            ...state,
            playerScore: newPlayerScore,
            aiScore: newAiScore,
            messageLog: [...state.messageLog, finalLogMessage, finalMessage],
            pendingTrucoCaller: null,
            playerActionHistory: [...state.playerActionHistory, ActionType.DECLINE],
            opponentModel: newOpponentModel,
            aiCases: newAiCases,
            aiTrucoContext: null,
            winner: finalWinner,
            gamePhase: 'game_over',
            gameOverReason: finalMessage,
            centralMessage: null,
            isCentralMessagePersistent: false,
            roundHistory: newRoundHistory,
        };
    }

    return {
        ...state,
        playerScore: newPlayerScore,
        aiScore: newAiScore,
        messageLog: [...state.messageLog, finalLogMessage],
        pendingTrucoCaller: null,
        playerActionHistory: [...state.playerActionHistory, ActionType.DECLINE],
        opponentModel: newOpponentModel,
        aiCases: newAiCases,
        aiTrucoContext: null,
        lastRoundWinner: caller,
        gamePhase: 'round_end',
        currentTurn: null,
        roundHistory: newRoundHistory,
    };
}

export function handleDecline(state: GameState, action: { type: ActionType.DECLINE; payload?: { blurbText: string } }): GameState {
    const decliner = state.currentTurn!;
    const declinerName = decliner === 'player' ? 'Jugador' : 'IA';
    const isPlayer = decliner === 'player';
    const messageLog = [...state.messageLog, `${declinerName} no quiere.`];

    let newEnvidoHistory = state.playerEnvidoHistory;
    if (state.gamePhase.includes('envido') && isPlayer) {
        const entry: PlayerEnvidoActionEntry = {
            round: state.round,
            envidoPoints: getEnvidoValue(state.initialPlayerHand),
            action: 'folded',
            wasMano: state.mano === 'player',
        };
        newEnvidoHistory = [...state.playerEnvidoHistory, entry];
    }
    
    const updatedStateWithCall = updateRoundHistoryWithCall(state, `${decliner}: No Quiero`);

    const newState = {
      ...updatedStateWithCall,
      playerEnvidoHistory: newEnvidoHistory,
      playerBlurb: isPlayer ? { text: 'No Quiero', isVisible: true } : null,
      aiBlurb: !isPlayer && action.payload?.blurbText 
        ? { text: action.payload.blurbText, isVisible: true } 
        : null,
    };

    if (state.gamePhase.includes('envido')) {
        return {
            ...newState,
            gamePhase: 'ENVIDO_DECLINED',
            messageLog,
            isThinking: false, // Stop thinking indicator
        };
    }

    if (state.gamePhase.includes('truco') || state.gamePhase.includes('vale_cuatro')) {
        return {
            ...newState,
            gamePhase: 'TRUCO_DECLINED',
            messageLog,
            isThinking: false, // Stop thinking indicator
        };
    }
    return newState;
}

// New Flor Handlers
export function handleAcknowledgeFlor(state: GameState, action: { type: ActionType.ACKNOWLEDGE_FLOR, payload?: { blurbText?: string } }): GameState {
    const florCaller = state.lastCaller!;
    const acknowledger = state.currentTurn!;
    const isPlayer = acknowledger === 'player';
    const points = state.florPointsOnOffer;
    const winnerName = florCaller === 'player' ? 'Jugador' : 'IA';

    let newPlayerScore = state.playerScore;
    let newAiScore = state.aiScore;

    if (florCaller === 'player') newPlayerScore += points;
    else newAiScore += points;

    const finalLogMessage = `${winnerName} gana ${points} puntos por la Flor.`;
    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
        if (!currentRoundSummary.pointsAwarded.by) {
            currentRoundSummary.pointsAwarded.by = { flor: { player: 0, ai: 0, note: "" }, envido: { player: 0, ai: 0, note: "" }, truco: { player: 0, ai: 0, note: "" } };
        }
        if (florCaller === 'player') {
            currentRoundSummary.pointsAwarded.player += points;
            currentRoundSummary.pointsAwarded.by.flor.player = points;
        } else {
            currentRoundSummary.pointsAwarded.ai += points;
            currentRoundSummary.pointsAwarded.by.flor.ai = points;
        }
        currentRoundSummary.pointsAwarded.by.flor.note = "Aceptada";
    }

    if (newPlayerScore >= 15 || newAiScore >= 15) {
        const finalWinner = newPlayerScore >= 15 ? 'player' : 'ai';
        const finalMessage = finalWinner === 'player'
          ? "¡Ganaste el juego! La ronda terminó antes porque ya tenés los puntos para ganar."
          : "¡Perdiste el juego! La ronda terminó antes porque la IA ya tiene los puntos para ganar.";
        
        return {
            ...state,
            playerScore: newPlayerScore,
            aiScore: newAiScore,
            messageLog: [...state.messageLog, finalLogMessage, finalMessage],
            winner: finalWinner,
            gamePhase: 'game_over',
            gameOverReason: finalMessage,
            centralMessage: null,
            isCentralMessagePersistent: false,
            roundHistory: newRoundHistory,
        };
    }
    
    // Restore turn and continue
    const nextTurn = state.turnBeforeInterrupt!;
    const nextPhase = `trick_${state.currentTrick + 1}` as GamePhase;

    return {
        ...state,
        playerScore: newPlayerScore,
        aiScore: newAiScore,
        messageLog: [...state.messageLog, finalLogMessage],
        currentTurn: nextTurn,
        gamePhase: nextPhase,
        turnBeforeInterrupt: null,
        lastCaller: null,
        roundHistory: newRoundHistory,
        playerBlurb: isPlayer ? { text: 'Son Buenas', isVisible: true } : null,
        aiBlurb: !isPlayer && action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
        isThinking: false,
    };
}

export function handleAcceptContraflor(state: GameState, action: { type: ActionType.ACCEPT_CONTRAFLOR, payload?: { blurbText?: string } }): GameState {
    const acceptor = state.currentTurn!;
    const isPlayer = acceptor === 'player';
    updateRoundHistoryWithCall(state, `${acceptor}: Con Flor Quiero`);
    return {
        ...state,
        gamePhase: 'FLOR_SHOWDOWN',
        florPointsOnOffer: 6,
        messageLog: [...state.messageLog, `${acceptor === 'player' ? 'Jugador' : 'IA'}: "¡Con Flor Quiero!"`],
        playerBlurb: isPlayer ? { text: '¡Quiero!', isVisible: true } : null,
        aiBlurb: !isPlayer && action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
        isThinking: false,
    };
}

export function handleDeclineContraflor(state: GameState, action: { type: ActionType.DECLINE_CONTRAFLOR, payload?: { blurbText?: string } }): GameState {
    const decliner = state.currentTurn!;
    const isPlayer = decliner === 'player';
    updateRoundHistoryWithCall(state, `${decliner}: Con Flor me achico`);
    return {
        ...state,
        gamePhase: 'CONTRAFLOR_DECLINED',
        florPointsOnOffer: 4,
        messageLog: [...state.messageLog, `${decliner === 'player' ? 'Jugador' : 'IA'}: "Con Flor me achico."`],
        playerBlurb: isPlayer ? { text: 'Me achico', isVisible: true } : null,
        aiBlurb: !isPlayer && action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
        isThinking: false,
    };
}

export function handleResolveFlorShowdown(state: GameState): GameState {
    const playerFlor = getFlorValue(state.initialPlayerHand);
    const aiFlor = getFlorValue(state.initialAiHand);

    let winner: Player;
    if (playerFlor > aiFlor) winner = 'player';
    else if (aiFlor > playerFlor) winner = 'ai';
    else winner = state.mano;

    const points = state.florPointsOnOffer;
    let newPlayerScore = state.playerScore;
    let newAiScore = state.aiScore;

    if (winner === 'player') newPlayerScore += points;
    else newAiScore += points;

    const centralMessage = `Tus puntos: ${playerFlor}. IA: ${aiFlor}. ${winner === 'player' ? '¡Ganaste la Flor!' : 'Gana la IA.'}`;
    const logMessage = `${centralMessage} ${winner === 'player' ? 'Jugador' : 'IA'} gana ${points} puntos.`;

    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
        if (!currentRoundSummary.pointsAwarded.by) {
            currentRoundSummary.pointsAwarded.by = { flor: { player: 0, ai: 0, note: "" }, envido: { player: 0, ai: 0, note: "" }, truco: { player: 0, ai: 0, note: "" } };
        }
        if (winner === 'player') {
            currentRoundSummary.pointsAwarded.player += points;
            currentRoundSummary.pointsAwarded.by.flor.player = points;
        } else {
            currentRoundSummary.pointsAwarded.ai += points;
            currentRoundSummary.pointsAwarded.by.flor.ai = points;
        }
        currentRoundSummary.pointsAwarded.by.flor.note = "Contraflor aceptada";
    }

    if (newPlayerScore >= 15 || newAiScore >= 15) {
        const finalWinner = newPlayerScore >= 15 ? 'player' : 'ai';
        const finalMessage = finalWinner === 'player'
          ? "¡Ganaste el juego! La ronda terminó antes porque ya tenés los puntos para ganar."
          : "¡Perdiste el juego! La ronda terminó antes porque la IA ya tiene los puntos para ganar.";
        
        return {
            ...state,
            playerScore: newPlayerScore,
            aiScore: newAiScore,
            messageLog: [...state.messageLog, logMessage, finalMessage],
            winner: finalWinner,
            gamePhase: 'game_over',
            gameOverReason: finalMessage,
            centralMessage: null,
            isCentralMessagePersistent: false,
            roundHistory: newRoundHistory,
        };
    }

    const nextTurn = state.turnBeforeInterrupt!;
    const nextPhase = `trick_${state.currentTrick + 1}` as GamePhase;

    return {
        ...state,
        playerScore: newPlayerScore,
        aiScore: newAiScore,
        messageLog: [...state.messageLog, logMessage],
        centralMessage,
        isCentralMessagePersistent: true,
        currentTurn: nextTurn,
        gamePhase: nextPhase,
        turnBeforeInterrupt: null,
        lastCaller: null,
        roundHistory: newRoundHistory,
    };
}

export function handleResolveContraflorDecline(state: GameState): GameState {
    const winner = state.lastCaller!; // The one who called Contraflor
    const points = state.florPointsOnOffer; // 4 points

    let newPlayerScore = state.playerScore;
    let newAiScore = state.aiScore;

    if (winner === 'player') newPlayerScore += points;
    else newAiScore += points;

    const finalLogMessage = `${winner === 'player' ? 'Jugador' : 'IA'} gana ${points} puntos.`;

    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
        if (!currentRoundSummary.pointsAwarded.by) {
            currentRoundSummary.pointsAwarded.by = { flor: { player: 0, ai: 0, note: "" }, envido: { player: 0, ai: 0, note: "" }, truco: { player: 0, ai: 0, note: "" } };
        }
        const declinerName = state.currentTurn === 'player' ? 'Jugador' : 'IA';
        if (winner === 'player') {
            currentRoundSummary.pointsAwarded.player += points;
            currentRoundSummary.pointsAwarded.by.flor.player = points;
        } else {
            currentRoundSummary.pointsAwarded.ai += points;
            currentRoundSummary.pointsAwarded.by.flor.ai = points;
        }
        currentRoundSummary.pointsAwarded.by.flor.note = `Contraflor (${declinerName} no quiso)`;
    }

    if (newPlayerScore >= 15 || newAiScore >= 15) {
        const finalWinner = newPlayerScore >= 15 ? 'player' : 'ai';
        const finalMessage = finalWinner === 'player'
          ? "¡Ganaste el juego! La ronda terminó antes porque ya tenés los puntos para ganar."
          : "¡Perdiste el juego! La ronda terminó antes porque la IA ya tiene los puntos para ganar.";
        
        return {
            ...state,
            playerScore: newPlayerScore,
            aiScore: newAiScore,
            messageLog: [...state.messageLog, finalLogMessage, finalMessage],
            winner: finalWinner,
            gamePhase: 'game_over',
            gameOverReason: finalMessage,
            centralMessage: null,
            isCentralMessagePersistent: false,
            roundHistory: newRoundHistory,
        };
    }

    const nextTurn = state.turnBeforeInterrupt!;
    const nextPhase = `trick_${state.currentTrick + 1}` as GamePhase;
    
    return {
        ...state,
        playerScore: newPlayerScore,
        aiScore: newAiScore,
        messageLog: [...state.messageLog, finalLogMessage],
        currentTurn: nextTurn,
        gamePhase: nextPhase,
        turnBeforeInterrupt: null,
        lastCaller: null,
        roundHistory: newRoundHistory,
    };
}