import { GameState, ActionType, Player, GamePhase } from '../../types';
import { getEnvidoValue } from '../../services/trucoLogic';

function handleEnvidoAccept(state: GameState, messageLog: string[]): GameState {
    const isPlayerRespondingToAI = state.lastCaller === 'ai';
    const newEnvidoFoldHistory = isPlayerRespondingToAI
        ? [...state.playerEnvidoFoldHistory, false]
        : state.playerEnvidoFoldHistory;

    const playerEnvido = getEnvidoValue(state.initialPlayerHand);
    const aiEnvido = getEnvidoValue(state.initialAiHand);
    let envidoMessage = `Player has ${playerEnvido}. AI has ${aiEnvido}.`;

    let winner: Player | 'tie' = 'tie';
    if (playerEnvido > aiEnvido) winner = 'player';
    else if (aiEnvido > playerEnvido) winner = 'ai';
    else winner = state.mano;

    let newPlayerScore = state.playerScore;
    let newAiScore = state.aiScore;
    let playerCalledHighEnvido = state.playerCalledHighEnvido;

    if (winner === 'player') {
        newPlayerScore += state.envidoPointsOnOffer;
        envidoMessage += ` Player wins ${state.envidoPointsOnOffer} points.`;
        if (state.lastCaller === 'player' && playerEnvido >= 27) {
            playerCalledHighEnvido = true;
        }
    } else {
        newAiScore += state.envidoPointsOnOffer;
        envidoMessage += ` AI wins ${state.envidoPointsOnOffer} points.`;
    }

    const postEnvidoState = state.pendingTrucoCaller ? {
        gamePhase: 'truco_called' as GamePhase,
        currentTurn: state.pendingTrucoCaller === 'player' ? 'ai' : 'player' as Player,
        lastCaller: state.pendingTrucoCaller,
        turnBeforeInterrupt: state.pendingTrucoCaller,
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
        messageLog: [...messageLog, envidoMessage],
        playerEnvidoFoldHistory: newEnvidoFoldHistory,
        playerCalledHighEnvido,
        ...postEnvidoState,
    };
}

function handleTrucoAccept(state: GameState, messageLog: string[]): GameState {
    const isPlayerRespondingToAI = state.lastCaller === 'ai';
    const newTrucoFoldHistory = isPlayerRespondingToAI
      ? [...state.playerTrucoFoldHistory, false]
      : state.playerTrucoFoldHistory;
    // Game continues. The turn should be restored to whoever was about to play.
    return {
        ...state,
        gamePhase: `trick_${state.currentTrick + 1}` as GamePhase,
        currentTurn: state.turnBeforeInterrupt!, // Restore the turn
        turnBeforeInterrupt: null, // Reset the interrupt state
        pendingTrucoCaller: null,
        messageLog,
        playerTrucoFoldHistory: newTrucoFoldHistory,
    };
}

export function handleAccept(state: GameState, action: { type: ActionType.ACCEPT }): GameState {
    const messageLog = [...state.messageLog, `${state.currentTurn.toUpperCase()} accepts!`];

    if (state.gamePhase.includes('envido')) {
        return handleEnvidoAccept(state, messageLog);
    }
    
    if (state.gamePhase.includes('truco')) {
        return handleTrucoAccept(state, messageLog);
    }
    return state;
}

function handleEnvidoDecline(state: GameState, caller: Player, messageLog: string[]): GameState {
    const isPlayerRespondingToAI = state.lastCaller === 'ai';
    const newFoldHistory = isPlayerRespondingToAI
        ? [...state.playerEnvidoFoldHistory, true]
        : state.playerEnvidoFoldHistory;

    const points = state.envidoPointsOnOffer > 2 ? state.envidoPointsOnOffer - 2 : 1; 

    const postEnvidoState = state.pendingTrucoCaller ? {
        gamePhase: 'truco_called' as GamePhase,
        currentTurn: state.pendingTrucoCaller === 'player' ? 'ai' : 'player' as Player,
        lastCaller: state.pendingTrucoCaller,
        turnBeforeInterrupt: state.pendingTrucoCaller,
        pendingTrucoCaller: null,
    } : {
        gamePhase: `trick_${state.currentTrick + 1}` as GamePhase,
        currentTurn: state.turnBeforeInterrupt!,
        turnBeforeInterrupt: null,
    };
    
    return {
        ...state,
        playerScore: caller === 'player' ? state.playerScore + points : state.playerScore,
        aiScore: caller === 'ai' ? state.aiScore + points : state.aiScore,
        messageLog: [...messageLog, `${caller.toUpperCase()} wins ${points} point(s).`],
        playerEnvidoFoldHistory: newFoldHistory,
        ...postEnvidoState,
    };
}

function handleTrucoDecline(state: GameState, caller: Player, messageLog: string[]): GameState {
    const isPlayerRespondingToAI = state.lastCaller === 'ai';
    const newTrucoFoldHistory = isPlayerRespondingToAI
        ? [...state.playerTrucoFoldHistory, true]
        : state.playerTrucoFoldHistory;
    
    // Declining a truco call ends the round immediately.
    // The winner (the caller) gets the points for the PREVIOUS accepted level.
    // trucoLevel 1 (Truco) was called -> 1 point awarded.
    // trucoLevel 2 (Retruco) was called -> 2 points awarded (value of Truco).
    // trucoLevel 3 (Vale Cuatro) was called -> 3 points awarded (value of Retruco).
    const points = state.trucoLevel > 1 ? state.trucoLevel - 1 : 1; // Correct points on decline

    return {
        ...state,
        playerScore: caller === 'player' ? state.playerScore + points : state.playerScore,
        aiScore: caller === 'ai' ? state.aiScore + points : state.aiScore,
        messageLog: [...messageLog, `${caller.toUpperCase()} wins ${points} point(s).`],
        gamePhase: 'round_end',
        currentTurn: 'player', // Hand control to player for next round button
        pendingTrucoCaller: null,
        playerTrucoFoldHistory: newTrucoFoldHistory,
    }
}

export function handleDecline(state: GameState, action: { type: ActionType.DECLINE }): GameState {
    const caller = state.lastCaller!;
    const messageLog = [...state.messageLog, `${state.currentTurn.toUpperCase()} declines!`];

    if (state.gamePhase.includes('envido')) {
        return handleEnvidoDecline(state, caller, messageLog);
    }

    if (state.gamePhase.includes('truco')) {
        return handleTrucoDecline(state, caller, messageLog);
    }
    return state;
}