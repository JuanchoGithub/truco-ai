

// Fix: Moved the game reducer logic from the misnamed types.ts to its correct location here.
// This file now contains the full, correct reducer implementation for the game.
import { GameState, Action, ActionType, AiTrucoContext } from '../types';
import { handleRestartGame, handleStartNewRound, handlePlayCard } from './reducers/gameplayReducer';
// Fix: Corrected typo in function name from 'handleCallFalfaEnvido' to 'handleCallFaltaEnvido'.
import { handleCallEnvido, handleCallRealEnvido, handleCallFaltaEnvido, handleDeclareFlor, handleRespondToEnvidoWithFlor, handleCallContraflor } from './reducers/envidoReducer';
import { handleCallTruco, handleCallRetruco, handleCallValeCuatro, handleCallFaltaTruco } from './reducers/trucoReducer';
import { handleAccept, handleDecline, handleResolveEnvidoAccept, handleResolveEnvidoDecline, handleResolveTrucoDecline, handleAcknowledgeFlor, handleAcceptContraflor, handleDeclineContraflor, handleResolveFlorShowdown, handleResolveContraflorDecline } from './reducers/responseReducer';
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
  hasRealEnvidoBeenCalledThisSequence: false,
  hasFlorBeenCalledThisRound: false,
  playerHasFlor: false,
  aiHasFlor: false,
  envidoPointsOnOffer: 0,
  previousEnvidoPoints: 0,
  florPointsOnOffer: 0,
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
    },
    trucoBluffs: {
        attempts: 0,
        successes: 0,
    },
  },
  aiCases: [],
  aiTrucoContext: null,
  // Probabilistic Opponent Modeling
  opponentHandProbabilities: null,
  playerEnvidoValue: null,
  playerActionHistory: [],
  aiBlurb: null,
  playerBlurb: null,
  lastRoundWinner: null,
  centralMessage: null,
  isCentralMessagePersistent: false,
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

    // Envido & Flor Calling Actions
    case ActionType.CALL_ENVIDO:
      return handleCallEnvido(state, action);
    case ActionType.CALL_REAL_ENVIDO:
      return handleCallRealEnvido(state, action);
    case ActionType.CALL_FALTA_ENVIDO:
      return handleCallFaltaEnvido(state, action);
    case ActionType.DECLARE_FLOR:
      return handleDeclareFlor(state, action);
    case ActionType.RESPOND_TO_ENVIDO_WITH_FLOR:
      return handleRespondToEnvidoWithFlor(state, action);
    case ActionType.CALL_CONTRAFLOR:
      return handleCallContraflor(state, action);

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
    case ActionType.ACKNOWLEDGE_FLOR:
      return handleAcknowledgeFlor(state, action);
    case ActionType.ACCEPT_CONTRAFLOR:
      return handleAcceptContraflor(state, action);
    case ActionType.DECLINE_CONTRAFLOR:
      return handleDeclineContraflor(state, action);


    // Resolution Actions for delayed flow
    case ActionType.RESOLVE_ENVIDO_ACCEPT:
        return handleResolveEnvidoAccept(state);
    case ActionType.RESOLVE_ENVIDO_DECLINE:
        return handleResolveEnvidoDecline(state);
    case ActionType.RESOLVE_TRUCO_DECLINE:
        return handleResolveTrucoDecline(state);
    case ActionType.RESOLVE_FLOR_SHOWDOWN:
        return handleResolveFlorShowdown(state);
    case ActionType.RESOLVE_CONTRAFLOR_DECLINE:
        return handleResolveContraflorDecline(state);

    // Opponent Modeling Action
    case ActionType.UPDATE_OPPONENT_PROBS:
      return { ...state, opponentHandProbabilities: action.payload };

    // Central Message
    case ActionType.CLEAR_CENTRAL_MESSAGE:
      return { ...state, centralMessage: null, isCentralMessagePersistent: false };
    
    // Player Blurb
    case ActionType.CLEAR_PLAYER_BLURB:
      return { ...state, playerBlurb: null };

    // Local Storage & Import/Export Actions
    case ActionType.LOAD_IMPORTED_DATA:
    case ActionType.LOAD_PERSISTED_STATE: {
        const loadedState = action.payload;
        if (!loadedState) return state;

        // If the loaded state includes a specific hand, it's a scenario setup (like the tutorial).
        // In this case, we apply the state directly and don't start a new round.
        if (loadedState.playerHand && loadedState.playerHand.length > 0) {
            return {
                ...initialState, // Start from a clean slate
                ...loadedState, // Apply the specific scenario state
            };
        }

        // Construct a clean state, but with the persisted learning data.
        // This prevents loading into a stale state (e.g., game over, middle of a trick).
        const restoredState: GameState = {
            ...initialState, // Start with a fresh game state
            
            // Carry over all learning and historical data from storage/import
            opponentModel: loadedState.opponentModel || initialState.opponentModel,
            aiCases: loadedState.aiCases || [],
            playerEnvidoFoldHistory: loadedState.playerEnvidoFoldHistory || [],
            playerTrucoCallHistory: loadedState.playerTrucoCallHistory || [],
            playerEnvidoHistory: loadedState.playerEnvidoHistory || [],
            playerPlayOrderHistory: loadedState.playerPlayOrderHistory || [],
            playerCardPlayStats: loadedState.playerCardPlayStats || initialState.playerCardPlayStats,
            roundHistory: loadedState.roundHistory || [],
            
            // Carry over user settings and score from the previous game state
            isDebugMode: loadedState.isDebugMode || false,
            playerScore: loadedState.playerScore || 0,
            aiScore: loadedState.aiScore || 0,
            
            // Set a message indicating session restoration or import
            messageLog: action.type === ActionType.LOAD_PERSISTED_STATE
              ? [...(loadedState.messageLog || []), '--- Sesión Restaurada ---']
              : ['--- Perfil Importado ---'],

            // Continue the game by setting the correct mano for the *next* round
            mano: loadedState.mano || 'player',
            round: loadedState.round || 0,
        };

        // Deep merge opponent model to handle cases where the model structure has been updated
        if (loadedState.opponentModel) {
            restoredState.opponentModel = {
                ...initialState.opponentModel,
                ...loadedState.opponentModel,
                envidoBehavior: {
                    ...initialState.opponentModel.envidoBehavior,
                    ...(loadedState.opponentModel.envidoBehavior || {}),
                },
                playStyle: {
                    ...initialState.opponentModel.playStyle,
                    ...(loadedState.opponentModel.playStyle || {}),
                },
                trucoBluffs: {
                    ...initialState.opponentModel.trucoBluffs,
                    ...(loadedState.opponentModel.trucoBluffs || { attempts: 0, successes: 0 }),
                }
            };
        }

        // Now, start a new round with this restored context. This ensures the app
        // always loads into a clean, playable state (trick_1) with all history intact.
        return handleStartNewRound(restoredState, { type: ActionType.START_NEW_ROUND });
    }

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
