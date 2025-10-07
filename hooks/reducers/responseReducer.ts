import { GameState, ActionType, Player, GamePhase, Case } from '../../types';
import { getEnvidoValue } from '../../services/trucoLogic';
import { updateProbsOnEnvido } from '../../services/ai/inferenceService';
import { getRandomPhrase, ENVIDO_LOSE_PHRASES, ENVIDO_WIN_PHRASES } from '../../services/ai/phrases';
import { handleStartNewRound } from './gameplayReducer';

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

    let winner: Player | 'tie' = 'tie';
    if (playerEnvido > aiEnvido) winner = 'player';
    else if (aiEnvido > playerEnvido) winner = 'ai';
    else winner = state.mano;

    let newPlayerScore = state.playerScore;
    let newAiScore = state.aiScore;
    let playerCalledHighEnvido = state.playerCalledHighEnvido;
    
    let finalBlurb;
    if (winner === 'ai') {
      finalBlurb = { text: getRandomPhrase(ENVIDO_WIN_PHRASES), isVisible: true };
    } else {
      finalBlurb = { text: getRandomPhrase(ENVIDO_LOSE_PHRASES), isVisible: true };
    }

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
        messageLog: [...state.messageLog, envidoMessage],
        playerEnvidoFoldHistory: newEnvidoFoldHistory,
        playerCalledHighEnvido,
        opponentHandProbabilities: updatedProbs,
        playerEnvidoValue: playerEnvido,
        ...postEnvidoState,
        aiBlurb: finalBlurb,
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
    };
}

export function handleAccept(state: GameState, action: { type: ActionType.ACCEPT; payload?: { blurbText: string } }): GameState {
    const acceptorName = state.currentTurn === 'player' ? 'Jugador' : 'IA';
    const messageLog = [...state.messageLog, `¡${acceptorName} quiere!`];

    const newState = {
      ...state,
      aiBlurb: state.currentTurn === 'ai' && action.payload?.blurbText 
        ? { text: action.payload.blurbText, isVisible: true } 
        : state.aiBlurb, // Preserve blurb if player is acting
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
        messageLog: [...state.messageLog, `${winnerName} gana ${points} punto(s).`],
        playerEnvidoFoldHistory: newFoldHistory,
        playerActionHistory: [...state.playerActionHistory, ActionType.DECLINE],
        ...postEnvidoState,
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

    const stateBeforeNewRound = {
        ...state,
        playerScore: caller === 'player' ? state.playerScore + points : state.playerScore,
        aiScore: caller === 'ai' ? state.aiScore + points : state.aiScore,
        messageLog: [...state.messageLog, `${winnerName} gana ${points} punto(s).`],
        pendingTrucoCaller: null,
        playerActionHistory: [...state.playerActionHistory, ActionType.DECLINE],
        opponentModel: newOpponentModel,
        aiCases: newAiCases,
        aiTrucoContext: null,
        lastRoundWinner: caller,
    };

    return handleStartNewRound(stateBeforeNewRound, { type: ActionType.START_NEW_ROUND });
}

export function handleDecline(state: GameState, action: { type: ActionType.DECLINE; payload?: { blurbText: string } }): GameState {
    const declinerName = state.currentTurn === 'player' ? 'Jugador' : 'IA';
    const messageLog = [...state.messageLog, `${declinerName} no quiere.`];

    const newState = {
      ...state,
      aiBlurb: state.currentTurn === 'ai' && action.payload?.blurbText 
        ? { text: action.payload.blurbText, isVisible: true } 
        : state.aiBlurb,
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