// Fix: Moved the game reducer logic from the misnamed types.ts to its correct location here.
// This file now contains the full, correct reducer implementation for the game.
import { GameState, Action, ActionType, AiTrucoContext } from '../types';
import { handleRestartGame, handleStartNewRound, handlePlayCard } from './reducers/gameplayReducer';
// Fix: Corrected typo in function name from 'handleCallFalfaEnvido' to 'handleCallFaltaEnvido'.
import { handleCallEnvido, handleCallRealEnvido, handleCallFaltaEnvido, handleDeclareFlor } from './reducers/envidoReducer';
import { handleCallTruco, handleCallRetruco, handleCallValeCuatro, handleCallFaltaTruco } from './reducers/trucoReducer';
import { handleAccept, handleDecline, handleResolveEnvidoAccept, handleResolveEnvidoDecline, handleResolveTrucoDecline } from './reducers/responseReducer';
import { createInitialCardPlayStats } from '../services/cardAnalysis';


export const initialState: GameState = {
  deck: [],
  playerHand: [],
  aiHand: [],
  initialPlayerHand: [],
  initialAiHand: [],
  playerTricks: [null, null, null],
  aiTricks: [null, null, null],
  trickWinners: [null, null, null],
  currentTrick: 0,
  playerScore: 0,
  aiScore: 0,
  round: 0,
  mano: 'player',
  currentTurn: 'player',
  gamePhase: 'initial',
  isThinking: false,
  winner: null,
  messageLog: ['¡Bienvenido a Truco AI!'],
  isDebugMode: false,
  aiReasoningLog: [{ round: 0, reasoning: 'La IA está esperando que comience el juego.' }],
  isLogExpanded: false,
  isGameLogExpanded: false,
  lastCaller: null,
  turnBeforeInterrupt: null,
  pendingTrucoCaller: null,
  hasEnvidoBeenCalledThisRound: false,
  hasFlorBeenCalledThisRound: false,
  playerHasFlor: false,
  aiHasFlor: false,
  envidoPointsOnOffer: 0,
  trucoLevel: 0,
  playerEnvidoFoldHistory: [],
  playerTrucoCallHistory: [],
  playerCalledHighEnvido: false,
  playedCards: [],
  // AI Learning & Modeling
  opponentModel: { 
    trucoFoldRate: 0.3, 
    bluffSuccessRate: 0.5,
    envidoBehavior: {
      callThreshold: 27,
      foldRate: 0.4,
      escalationRate: 0.2,
    },
    playStyle: {
      leadWithHighestRate: 0.75,
      baitRate: 0.1,
    }
  },
  aiCases: [],
  aiTrucoContext: null,
  // Probabilistic Opponent Modeling
  opponentHandProbabilities: null,
  playerEnvidoValue: null,
  playerActionHistory: [],
  aiBlurb: null,
  lastRoundWinner: null,
  centralMessage: null,
  isDataModalVisible: false,
  // Granular Behavior Tracking
  playerEnvidoHistory: [],
  playerPlayOrderHistory: [],
  // New Detailed Statistics
  playerCardPlayStats: createInitialCardPlayStats(),
  roundHistory: [],
};

export function useGameReducer(state: GameState, action: Action): GameState {
  // Log every action and its payload for easier debugging
  // console.log('Dispatching Action:', action.type, (action as any).payload);

  const updateRoundHistoryWithCall = (callText: string): GameState => {
    const newRoundHistory = [...state.roundHistory];
    if (newRoundHistory.length > 0) {
      const lastRound = newRoundHistory[newRoundHistory.length - 1];
      if (lastRound.round === state.round) {
        lastRound.calls.push(callText);
      }
    }
    return { ...state, roundHistory: newRoundHistory };
  };


  switch (action.type) {
    // Gameplay Actions
    case ActionType.RESTART_GAME:
      return handleRestartGame(initialState, state);
    case ActionType.START_NEW_ROUND:
      return handleStartNewRound(state, action);
    case ActionType.PROCEED_TO_NEXT_ROUND:
      return handleStartNewRound(state, { type: ActionType.START_NEW_ROUND });
    case ActionType.PLAY_CARD:
      return handlePlayCard(state, action);

    // Envido Calling Actions
    case ActionType.CALL_ENVIDO:
      return handleCallEnvido(state, action);
    case ActionType.CALL_REAL_ENVIDO:
      return handleCallRealEnvido(state, action);
    case ActionType.CALL_FALTA_ENVIDO:
      // Fix: Corrected typo in function name from 'handleCallFalfaEnvido' to 'handleCallFaltaEnvido'.
      return handleCallFaltaEnvido(state, action);
    case ActionType.DECLARE_FLOR:
      return handleDeclareFlor(state, action);

    // Truco Calling Actions
    case ActionType.CALL_TRUCO:
      return handleCallTruco(state, action);
    case ActionType.CALL_RETRUCO:
      return handleCallRetruco(state, action);
    case ActionType.CALL_VALE_CUATRO:
      return handleCallValeCuatro(state, action);
    case ActionType.CALL_FALTA_TRUCO:
      return handleCallFaltaTruco(state, action);

    // Response Actions
    case ActionType.ACCEPT:
      return handleAccept(state, action);
    case ActionType.DECLINE:
      return handleDecline(state, action);

    // New Resolution Actions for delayed flow
    case ActionType.RESOLVE_ENVIDO_ACCEPT:
        return handleResolveEnvidoAccept(state);
    case ActionType.RESOLVE_ENVIDO_DECLINE:
        return handleResolveEnvidoDecline(state);
    case ActionType.RESOLVE_TRUCO_DECLINE:
        return handleResolveTrucoDecline(state);

    // Opponent Modeling Action
    case ActionType.UPDATE_OPPONENT_PROBS:
      return { ...state, opponentHandProbabilities: action.payload };

    // Central Message
    case ActionType.CLEAR_CENTRAL_MESSAGE:
      return { ...state, centralMessage: null };

    // Local Storage & Import/Export Actions
    case ActionType.LOAD_PERSISTED_STATE:
    case ActionType.LOAD_IMPORTED_DATA:
      const loadedState = action.payload;
      return {
          ...state,
          ...loadedState,
          // Deep merge nested objects to prevent them from being overwritten by `undefined`
          opponentModel: {
              ...state.opponentModel,
              ...(loadedState.opponentModel || {}),
              envidoBehavior: {
                  ...state.opponentModel.envidoBehavior,
                  ...(loadedState.opponentModel?.envidoBehavior || {}),
              },
              playStyle: {
                 ...state.opponentModel.playStyle,
                 ...(loadedState.opponentModel?.playStyle || {}),
              }
          },
          // Ensure arrays are not undefined if they don't exist in the loaded data
          roundHistory: loadedState.roundHistory || [],
          playerCardPlayStats: loadedState.playerCardPlayStats || createInitialCardPlayStats(),
          playerEnvidoHistory: loadedState.playerEnvidoHistory || [],
          playerPlayOrderHistory: loadedState.playerPlayOrderHistory || [],
      };

    // Simple state changes & UI actions
    case ActionType.TOGGLE_DEBUG_MODE:
      return { ...state, isDebugMode: !state.isDebugMode };
    case ActionType.TOGGLE_DATA_MODAL:
      return { ...state, isDataModalVisible: !state.isDataModalVisible };
    case ActionType.ADD_AI_REASONING_LOG:
      return { ...state, aiReasoningLog: [...state.aiReasoningLog, action.payload] };
    case ActionType.TOGGLE_AI_LOG_EXPAND:
      return { ...state, isLogExpanded: !state.isLogExpanded };
    case ActionType.TOGGLE_GAME_LOG_EXPAND:
      return { ...state, isGameLogExpanded: !state.isGameLogExpanded };
    case ActionType.AI_THINKING:
        return { ...state, isThinking: action.payload };
    case ActionType.ADD_MESSAGE:
        return { ...state, messageLog: [...state.messageLog, action.payload] };

    default:
      return state;
  }
}
