import { GameState, ActionType, Player, GamePhase, Case } from '../../types';
import { getEnvidoValue } from '../../services/trucoLogic';
import { updateProbsOnEnvido } from '../../services/ai/inferenceService';

function handleEnvidoAccept(state: GameState, messageLog: string[]): GameState {
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

    let winner: Player | 'tie' = 'tie';
    if (playerEnvido > aiEnvido) winner = 'player';
    else if (aiEnvido > playerEnvido) winner = 'ai';
    else winner = state.mano;

    let newPlayerScore = state.playerScore;
    let newAiScore = state.aiScore;
    let playerCalledHighEnvido = state.playerCalledHighEnvido;

    if (winner === 'player') {
        newPlayerScore += state.envidoPointsOnOffer;
        envidoMessage += ` Jugador gana ${state.envidoPointsOnOffer} puntos.`;
        if (state.lastCaller === 'player' && playerEnvido >= 27) {
            playerCalledHighEnvido = true;
        }
    } else {
        newAiScore += state.envidoPointsOnOffer;
        envidoMessage += ` La IA gana ${state.envidoPointsOnOffer} puntos.`;
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
        opponentHandProbabilities: updatedProbs,
        playerEnvidoValue: playerEnvido,
        ...postEnvidoState,
        aiBlurb: null,
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
        playerActionHistory: [...state.playerActionHistory, ActionType.ACCEPT],
        aiBlurb: null,
    };
}

export function handleAccept(state: GameState, action: { type: ActionType.ACCEPT }): GameState {
    const acceptorName = state.currentTurn === 'player' ? 'Jugador' : 'IA';
    const messageLog = [...state.messageLog, `¡${acceptorName} quiere!`];

    if (state.gamePhase.includes('envido')) {
        return handleEnvidoAccept(state, messageLog);
    }
    
    if (state.gamePhase.includes('truco') || state.gamePhase.includes('vale_cuatro')) {
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
    
    const winnerName = caller === 'player' ? 'Jugador' : 'IA';
    return {
        ...state,
        playerScore: caller === 'player' ? state.playerScore + points : state.playerScore,
        aiScore: caller === 'ai' ? state.aiScore + points : state.aiScore,
        messageLog: [...messageLog, `${winnerName} gana ${points} punto(s).`],
        playerEnvidoFoldHistory: newFoldHistory,
        playerActionHistory: [...state.playerActionHistory, ActionType.DECLINE],
        ...postEnvidoState,
        aiBlurb: null,
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
            // Fix: Corrected typo from `trucoFoldrate` to `trucoFoldRate`.
            opponentFoldRateAtTimeOfCall: state.opponentModel.trucoFoldRate,
        };
        newAiCases = [...state.aiCases, newCase];

        const decay = 0.9;
        // Update opponent's fold rate: increase it as they just folded.
        const newFoldRate = state.opponentModel.trucoFoldRate * decay + (1 - decay) * 1;
        
        let newBluffSuccessRate = state.opponentModel.bluffSuccessRate;
        if (state.aiTrucoContext.isBluff) {
            // Opponent folded, so they failed to catch the bluff.
            const outcome = 0; 
            newBluffSuccessRate = state.opponentModel.bluffSuccessRate * decay + (1 - decay) * outcome;
        }

        newOpponentModel = {
            trucoFoldRate: Math.min(0.95, newFoldRate),
            bluffSuccessRate: newBluffSuccessRate
        };
    }
    
    const points = state.trucoLevel > 1 ? state.trucoLevel - 1 : 1;
    const winnerName = caller === 'player' ? 'Jugador' : 'IA';

    return {
        ...state,
        playerScore: caller === 'player' ? state.playerScore + points : state.playerScore,
        aiScore: caller === 'ai' ? state.aiScore + points : state.aiScore,
        messageLog: [...messageLog, `${winnerName} gana ${points} punto(s).`],
        gamePhase: 'round_end',
        currentTurn: 'player',
        pendingTrucoCaller: null,
        playerActionHistory: [...state.playerActionHistory, ActionType.DECLINE],
        // Update learning state
        opponentModel: newOpponentModel,
        aiCases: newAiCases,
        aiTrucoContext: null, // Reset context after it's been handled
        aiBlurb: null,
    }
}

export function handleDecline(state: GameState, action: { type: ActionType.DECLINE }): GameState {
    const caller = state.lastCaller!;
    const declinerName = state.currentTurn === 'player' ? 'Jugador' : 'IA';
    const messageLog = [...state.messageLog, `${declinerName} no quiere.`];

    if (state.gamePhase.includes('envido')) {
        return handleEnvidoDecline(state, caller, messageLog);
    }

    if (state.gamePhase.includes('truco') || state.gamePhase.includes('vale_cuatro')) {
        return handleTrucoDecline(state, caller, messageLog);
    }
    return state;
}