import { GameState, ActionType, Player, GamePhase, Case, PlayerEnvidoActionEntry, MessageObject } from '../../types';
import { getEnvidoValue, getFlorValue, getCardCode } from '../../services/trucoLogic';
import { updateProbsOnEnvido } from '../../services/ai/inferenceService';
// Fix: Replaced direct phrase array imports with the PHRASE_KEYS object to match the refactored phrases service.
import { getRandomPhrase, PHRASE_KEYS } from '../../services/ai/phrases';
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
    const newMessages: MessageObject[] = [
        { key: 'log.envido_showdown', options: { playerPoints: playerEnvido, aiPoints: aiEnvido } }
    ];

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
    let centralMessage: MessageObject;
    
    if (playerEnvido === aiEnvido) {
        centralMessage = { key: 'centralMessage.tie_envido', options: { points: playerEnvido, winner } };
    } else {
        centralMessage = { key: 'centralMessage.envido_result', options: { playerPoints: playerEnvido, aiPoints: aiEnvido, winner } };
    }
    
    let finalBlurb: { titleKey: string; text: string; isVisible: boolean; } | null = null;
    if (state.pendingTrucoCaller === 'ai') {
        const reminderPhrase = getRandomPhrase(PHRASE_KEYS.POST_ENVIDO_TRUCO_REMINDER);
        finalBlurb = { titleKey: 'actionBar.truco', text: reminderPhrase, isVisible: true };
    } else {
        if (winner === 'ai') {
          finalBlurb = { titleKey: 'blurb_titles.envido_result', text: getRandomPhrase(PHRASE_KEYS.ENVIDO_WIN), isVisible: true };
        } else {
          finalBlurb = { titleKey: 'blurb_titles.envido_result', text: getRandomPhrase(PHRASE_KEYS.ENVIDO_LOSE), isVisible: true };
        }
    }

    if (winner === 'player') {
        newPlayerScore += state.envidoPointsOnOffer;
        newMessages.push({ key: 'log.win_points', options: { winner: 'player', points: state.envidoPointsOnOffer } });
        if (state.lastCaller === 'player' && playerEnvido >= 27) {
            playerCalledHighEnvido = true;
        }
    } else {
        newAiScore += state.envidoPointsOnOffer;
        newMessages.push({ key: 'log.win_points', options: { winner: 'ai', points: state.envidoPointsOnOffer } });
    }

    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
        if (!currentRoundSummary.pointsAwarded.by) { // For old saved games
            currentRoundSummary.pointsAwarded.by = { flor: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } }, envido: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } }, truco: { player: 0, ai: 0, note: { key: 'gameBoard.note_truco_simple' } } };
        }
        if (winner === 'player') {
            currentRoundSummary.pointsAwarded.player += state.envidoPointsOnOffer;
            currentRoundSummary.pointsAwarded.by.envido.player = state.envidoPointsOnOffer;
        } else {
            currentRoundSummary.pointsAwarded.ai += state.envidoPointsOnOffer;
            currentRoundSummary.pointsAwarded.by.envido.ai = state.envidoPointsOnOffer;
        }
        currentRoundSummary.pointsAwarded.by.envido.note = { key: 'gameBoard.note_envido_accepted' };
    }

    // Check for a game winner immediately after awarding points
    if (newPlayerScore >= 15 || newAiScore >= 15) {
        const finalWinner = newPlayerScore >= 15 ? 'player' : 'ai';
        return {
            ...state,
            playerScore: newPlayerScore,
            aiScore: newAiScore,
            messageLog: [...state.messageLog, ...newMessages],
            winner: finalWinner,
            gamePhase: 'game_over',
            gameOverReason: { key: finalWinner === 'player' ? 'game.game_over_by_points_win' : 'game.game_over_by_points_lose' },
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
        messageLog: [...state.messageLog, ...newMessages],
        playerEnvidoFoldHistory: newEnvidoFoldHistory,
        playerCalledHighEnvido,
        opponentHandProbabilities: updatedProbs,
        playerEnvidoValue: playerEnvido,
        aiEnvidoValue: aiEnvido,
        hasEnvidoBeenCalledThisRound: true,
        hasRealEnvidoBeenCalledThisSequence: false, // Reset for next round
        ...postEnvidoState,
        aiBlurb: finalBlurb,
        centralMessage: centralMessage,
        isCentralMessagePersistent: true,
        roundHistory: newRoundHistory,
    };
}

function handleTrucoAccept(state: GameState, messageLog: (string | MessageObject)[]): GameState {
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
    const isPlayer = acceptor === 'player';
    const messageLog: (string | MessageObject)[] = [...state.messageLog, { key: 'log.accept', options: { acceptor } }];

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
      playerBlurb: isPlayer ? { text: 'actionBar.quiero', isVisible: true } : null,
      aiBlurb: !isPlayer && action.payload?.blurbText 
        ? { titleKey: 'actionBar.quiero', text: action.payload.blurbText, isVisible: true } 
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
        const isPlayerAccepting = isPlayer && state.lastCaller === 'ai';
        const newTrucoFoldHistory = isPlayerAccepting ? [...state.playerTrucoFoldHistory, false] : state.playerTrucoFoldHistory;
        const updatedStateWithHistory = { ...newState, playerTrucoFoldHistory: newTrucoFoldHistory };
        return handleTrucoAccept(updatedStateWithHistory, messageLog);
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

    let finalBlurb: { titleKey: string; text: string; isVisible: boolean; } | null = null;
    if (state.pendingTrucoCaller === 'ai') {
        const reminderPhrase = getRandomPhrase(PHRASE_KEYS.POST_ENVIDO_TRUCO_REMINDER);
        finalBlurb = { titleKey: 'actionBar.truco', text: reminderPhrase, isVisible: true };
    }
    
    const finalLogMessage: MessageObject = { key: 'log.win_points', options: { winner: caller, points } };
    const newPlayerScore = caller === 'player' ? state.playerScore + points : state.playerScore;
    const newAiScore = caller === 'ai' ? state.aiScore + points : state.aiScore;

    // Finalize the round history points
    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
        if (!currentRoundSummary.pointsAwarded.by) {
            currentRoundSummary.pointsAwarded.by = { flor: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } }, envido: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } }, truco: { player: 0, ai: 0, note: { key: 'gameBoard.note_truco_simple' } } };
        }
        const declinerRole = state.currentTurn!;

        if (caller === 'player') {
            currentRoundSummary.pointsAwarded.player += points;
            currentRoundSummary.pointsAwarded.by.envido.player = points;
        }
        if (caller === 'ai') {
            currentRoundSummary.pointsAwarded.ai += points;
            currentRoundSummary.pointsAwarded.by.envido.ai = points;
        }
        currentRoundSummary.pointsAwarded.by.envido.note = {
            key: "gameBoard.note_declined",
            options: { decliner: declinerRole }
        };
    }

    // Check for a game winner immediately after awarding points
    if (newPlayerScore >= 15 || newAiScore >= 15) {
        const finalWinner = newPlayerScore >= 15 ? 'player' : 'ai';
        return {
            ...state,
            playerScore: newPlayerScore,
            aiScore: newAiScore,
            messageLog: [...state.messageLog, finalLogMessage],
            winner: finalWinner,
            gamePhase: 'game_over',
            gameOverReason: { key: finalWinner === 'player' ? 'game.game_over_by_points_win' : 'game.game_over_by_points_lose' },
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
        hasEnvidoBeenCalledThisRound: true,
        playerActionHistory: [...state.playerActionHistory, ActionType.DECLINE],
        hasRealEnvidoBeenCalledThisSequence: false, // Reset for next round
        ...postEnvidoState,
        aiBlurb: finalBlurb,
        roundHistory: newRoundHistory,
    };
}

export function handleResolveTrucoDecline(state: GameState): GameState {
    const caller = state.lastCaller!;
    let newAiCases = state.aiCases;

    if (caller === 'ai' && state.aiDecisionContext) {
        // Player declined, so the AI's action was successful.
        const outcome = 'win';
        const { deceptionType } = state.aiDecisionContext;

        if (deceptionType !== 'none' || Math.random() < 0.1) {
            const newCase: Case = {
                ...state.aiDecisionContext,
                outcome,
            };
            newAiCases = [...state.aiCases, newCase];
        }
    }
    
    const points = state.trucoLevel;
    const finalLogMessage: MessageObject = { key: 'log.win_points', options: { winner: caller, points } };

    const newPlayerScore = caller === 'player' ? state.playerScore + points : state.playerScore;
    const newAiScore = caller === 'ai' ? state.aiScore + points : state.aiScore;

    // Finalize the round history
    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
        if (!currentRoundSummary.pointsAwarded.by) {
            currentRoundSummary.pointsAwarded.by = { flor: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } }, envido: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } }, truco: { player: 0, ai: 0, note: { key: 'gameBoard.note_truco_simple' } } };
        }
        currentRoundSummary.roundWinner = caller;
        const declinerRole = state.currentTurn!;
        if (caller === 'player') {
            currentRoundSummary.pointsAwarded.player += points;
            currentRoundSummary.pointsAwarded.by.truco.player = points;
        }
        if (caller === 'ai') {
            currentRoundSummary.pointsAwarded.ai += points;
            currentRoundSummary.pointsAwarded.by.truco.ai = points;
        }
        currentRoundSummary.pointsAwarded.by.truco.note = {
            key: "gameBoard.note_declined",
            options: { decliner: declinerRole }
        };
        currentRoundSummary.playerTricks = state.playerTricks.map(c => c ? getCardCode(c) : null);
        currentRoundSummary.aiTricks = state.aiTricks.map(c => c ? getCardCode(c) : null);
    }
    
    if (newPlayerScore >= 15 || newAiScore >= 15) {
        const finalWinner = newPlayerScore >= 15 ? 'player' : 'ai';
        
        return {
            ...state,
            playerScore: newPlayerScore,
            aiScore: newAiScore,
            messageLog: [...state.messageLog, finalLogMessage],
            pendingTrucoCaller: null,
            playerActionHistory: [...state.playerActionHistory, ActionType.DECLINE],
            aiCases: newAiCases,
            aiDecisionContext: null,
            winner: finalWinner,
            gamePhase: 'game_over',
            gameOverReason: { key: finalWinner === 'player' ? 'game.game_over_by_points_win' : 'game.game_over_by_points_lose' },
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
        aiCases: newAiCases,
        aiDecisionContext: null,
        lastRoundWinner: caller,
        gamePhase: 'round_end',
        currentTurn: null,
        roundHistory: newRoundHistory,
    };
}

export function handleDecline(state: GameState, action: { type: ActionType.DECLINE; payload?: { blurbText: string } }): GameState {
    const decliner = state.currentTurn!;
    const isPlayer = decliner === 'player';
    const messageLog: (string | MessageObject)[] = [...state.messageLog, { key: 'log.decline', options: { decliner } }];

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
      playerBlurb: isPlayer ? { text: 'actionBar.no_quiero', isVisible: true } : null,
      aiBlurb: !isPlayer && action.payload?.blurbText 
        ? { titleKey: 'actionBar.no_quiero', text: action.payload.blurbText, isVisible: true } 
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
        const isPlayerDeclining = isPlayer && state.lastCaller === 'ai';
        const newTrucoFoldHistory = isPlayerDeclining ? [...state.playerTrucoFoldHistory, true] : state.playerTrucoFoldHistory;
        return {
            ...newState,
            playerTrucoFoldHistory: newTrucoFoldHistory,
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

    let newPlayerScore = state.playerScore;
    let newAiScore = state.aiScore;

    if (florCaller === 'player') newPlayerScore += points;
    else newAiScore += points;

    const finalLogMessage: MessageObject = { key: 'log.flor_win_points', options: { winner: florCaller, points } };
    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
        if (!currentRoundSummary.pointsAwarded.by) {
            currentRoundSummary.pointsAwarded.by = { flor: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } }, envido: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } }, truco: { player: 0, ai: 0, note: { key: 'gameBoard.note_truco_simple' } } };
        }
        if (florCaller === 'player') {
            currentRoundSummary.pointsAwarded.player += points;
            currentRoundSummary.pointsAwarded.by.flor.player = points;
        } else {
            currentRoundSummary.pointsAwarded.ai += points;
            currentRoundSummary.pointsAwarded.by.flor.ai = points;
        }
        currentRoundSummary.pointsAwarded.by.flor.note = { key: 'gameBoard.note_flor_accepted' };
    }

    if (newPlayerScore >= 15 || newAiScore >= 15) {
        const finalWinner = newPlayerScore >= 15 ? 'player' : 'ai';
        return {
            ...state,
            playerScore: newPlayerScore,
            aiScore: newAiScore,
            messageLog: [...state.messageLog, finalLogMessage],
            winner: finalWinner,
            gamePhase: 'game_over',
            gameOverReason: { key: finalWinner === 'player' ? 'game.game_over_by_points_win' : 'game.game_over_by_points_lose' },
            centralMessage: null,
            isCentralMessagePersistent: false,
            roundHistory: newRoundHistory,
        };
    }
    
    // FIX: Acknowledging a Flor ends the scoring part of the round. Transition to 'round_end'.
    // This prevents a state loop where the AI tries to call Envido again.
    return {
        ...state,
        playerScore: newPlayerScore,
        aiScore: newAiScore,
        messageLog: [...state.messageLog, finalLogMessage],
        lastRoundWinner: florCaller, // Winner of flor takes mano for the next round
        gamePhase: 'round_end',
        currentTurn: null,
        turnBeforeInterrupt: null,
        lastCaller: null,
        roundHistory: newRoundHistory,
        florPointsOnOffer: 0, // Reset flor points
        envidoPointsOnOffer: 0, // Reset envido points
        playerBlurb: isPlayer ? { text: 'actionBar.flor_ack_good', isVisible: true } : null,
        aiBlurb: !isPlayer && action.payload?.blurbText ? { titleKey: 'actionBar.flor_ack_good', text: action.payload.blurbText, isVisible: true } : null,
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
        messageLog: [...state.messageLog, { key: 'log.accept_contraflor', options: { acceptor } }],
        playerBlurb: isPlayer ? { text: 'actionBar.contraflor_quiero', isVisible: true } : null,
        aiBlurb: !isPlayer && action.payload?.blurbText ? { titleKey: 'actionBar.contraflor_quiero', text: action.payload.blurbText, isVisible: true } : null,
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
        messageLog: [...state.messageLog, { key: 'log.decline_contraflor', options: { decliner } }],
        playerBlurb: isPlayer ? { text: 'actionBar.contraflor_no_quiero', isVisible: true } : null,
        aiBlurb: !isPlayer && action.payload?.blurbText ? { titleKey: 'actionBar.contraflor_no_quiero', text: action.payload.blurbText, isVisible: true } : null,
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

    const centralMessage: MessageObject = {
        key: 'centralMessage.flor_result',
        options: { playerPoints: playerFlor, aiPoints: aiFlor, winner }
    };
    const logMessage: MessageObject = { key: 'log.flor_showdown_win', options: { winner, points } };

    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
        if (!currentRoundSummary.pointsAwarded.by) {
            currentRoundSummary.pointsAwarded.by = { flor: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } }, envido: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } }, truco: { player: 0, ai: 0, note: { key: 'gameBoard.note_truco_simple' } } };
        }
        if (winner === 'player') {
            currentRoundSummary.pointsAwarded.player += points;
            currentRoundSummary.pointsAwarded.by.flor.player = points;
        } else {
            currentRoundSummary.pointsAwarded.ai += points;
            currentRoundSummary.pointsAwarded.by.flor.ai = points;
        }
        currentRoundSummary.pointsAwarded.by.flor.note = { key: 'gameBoard.note_contraflor_accepted' };
    }

    if (newPlayerScore >= 15 || newAiScore >= 15) {
        const finalWinner = newPlayerScore >= 15 ? 'player' : 'ai';
        return {
            ...state,
            playerScore: newPlayerScore,
            aiScore: newAiScore,
            messageLog: [...state.messageLog, logMessage],
            winner: finalWinner,
            gamePhase: 'game_over',
            gameOverReason: { key: finalWinner === 'player' ? 'game.game_over_by_points_win' : 'game.game_over_by_points_lose' },
            centralMessage: null,
            isCentralMessagePersistent: false,
            roundHistory: newRoundHistory,
        };
    }

    // FIX: A resolved Flor ends the scoring part of the round. Transition to 'round_end'.
    return {
        ...state,
        playerScore: newPlayerScore,
        aiScore: newAiScore,
        messageLog: [...state.messageLog, logMessage],
        centralMessage, // Show the result
        isCentralMessagePersistent: false, // Let it fade
        lastRoundWinner: winner,
        gamePhase: 'round_end',
        currentTurn: null,
        turnBeforeInterrupt: null,
        lastCaller: null,
        roundHistory: newRoundHistory,
        florPointsOnOffer: 0,
        envidoPointsOnOffer: 0,
    };
}

export function handleResolveContraflorDecline(state: GameState): GameState {
    const winner = state.lastCaller!; // The one who called Contraflor
    const points = state.florPointsOnOffer; // 4 points

    let newPlayerScore = state.playerScore;
    let newAiScore = state.aiScore;

    if (winner === 'player') newPlayerScore += points;
    else newAiScore += points;

    const finalLogMessage: MessageObject = { key: 'log.win_points', options: { winner, points } };

    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
        if (!currentRoundSummary.pointsAwarded.by) {
            currentRoundSummary.pointsAwarded.by = { flor: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } }, envido: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } }, truco: { player: 0, ai: 0, note: { key: 'gameBoard.note_truco_simple' } } };
        }
        const declinerRole = state.currentTurn!;
        if (winner === 'player') {
            currentRoundSummary.pointsAwarded.player += points;
            currentRoundSummary.pointsAwarded.by.flor.player = points;
        } else {
            currentRoundSummary.pointsAwarded.ai += points;
            currentRoundSummary.pointsAwarded.by.flor.ai = points;
        }
        currentRoundSummary.pointsAwarded.by.flor.note = {
            key: 'gameBoard.note_contraflor_declined',
            options: { decliner: declinerRole }
        };
    }

    if (newPlayerScore >= 15 || newAiScore >= 15) {
        const finalWinner = newPlayerScore >= 15 ? 'player' : 'ai';
        
        return {
            ...state,
            playerScore: newPlayerScore,
            aiScore: newAiScore,
            messageLog: [...state.messageLog, finalLogMessage],
            winner: finalWinner,
            gamePhase: 'game_over',
            gameOverReason: { key: finalWinner === 'player' ? 'game.game_over_by_points_win' : 'game.game_over_by_points_lose' },
            centralMessage: null,
            isCentralMessagePersistent: false,
            roundHistory: newRoundHistory,
        };
    }

    // FIX: A resolved Flor ends the scoring part of the round. Transition to 'round_end'.
    return {
        ...state,
        playerScore: newPlayerScore,
        aiScore: newAiScore,
        messageLog: [...state.messageLog, finalLogMessage],
        lastRoundWinner: winner,
        gamePhase: 'round_end',
        currentTurn: null,
        turnBeforeInterrupt: null,
        lastCaller: null,
        roundHistory: newRoundHistory,
        florPointsOnOffer: 0,
        envidoPointsOnOffer: 0,
    };
}