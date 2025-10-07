import { GameState, ActionType, Player, GamePhase, Case } from '../../types';
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
    // Game continues. The turn should be restored to whoever was about to play.
    return {
        ...state,
        gamePhase: `trick_${state.currentTrick + 1}` as GamePhase,
        currentTurn: state.turnBeforeInterrupt!, // Restore the turn
        turnBeforeInterrupt: null, // Reset the interrupt state
        pendingTrucoCaller: null,
        messageLog,
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
    let newOpponentModel = state.opponentModel;
    let newAiCases = state.aiCases;

    // If AI was the caller, the player just folded to AI's call. Update learning model.
    if (caller === 'ai' && state.aiTrucoContext) {
        // Player folded. This is a "win" for the AI's call.
        const newCase: Case = {
            ...state.aiTrucoContext,
            outcome: 'win',
            opponentFoldRateAtTimeOfCall: state.opponentModel.trucoFoldRate,
        };
        newAiCases = [...state.aiCases, newCase];

        // Update opponent's fold rate: increase it as they just folded.
        // new_rate = old_rate * decay + (1 - decay) * new_observation
        const decay = 0.9;
        const newFoldRate = state.opponentModel.trucoFoldRate * decay + (1 - decay) * 1;
        newOpponentModel = { ...state.opponentModel, trucoFoldRate: Math.min(0.95, newFoldRate) };
    }
    
    const points = state.trucoLevel > 1 ? state.trucoLevel - 1 : 1;

    return {
        ...state,
        playerScore: caller === 'player' ? state.playerScore + points : state.playerScore,
        aiScore: caller === 'ai' ? state.aiScore + points : state.aiScore,
        messageLog: [...messageLog, `${caller.toUpperCase()} wins ${points} point(s).`],
        gamePhase: 'round_end',
        currentTurn: 'player',
        pendingTrucoCaller: null,
        // Update learning state
        opponentModel: newOpponentModel,
        aiCases: newAiCases,
        aiTrucoContext: null, // Reset context after it's been handled
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