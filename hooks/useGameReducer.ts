// Fix: Moved the game reducer logic from the misnamed types.ts to its correct location here.
// This file now contains the full, correct reducer implementation for the game.
import { GameState, Action, ActionType } from '../types';
import { handleRestartGame, handleStartNewRound, handlePlayCard } from './reducers/gameplayReducer';
import { handleCallEnvido, handleCallRealEnvido, handleCallFaltaEnvido } from './reducers/envidoReducer';
import { handleCallTruco, handleCallRetruco, handleCallValeCuatro } from './reducers/trucoReducer';
import { handleAccept, handleDecline } from './reducers/responseReducer';


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
  messageLog: ['Welcome to Truco AI!'],
  isDebugMode: false,
  aiReasoningLog: [{ round: 0, reasoning: 'AI is waiting for the game to start.' }],
  isLogExpanded: false,
  isGameLogExpanded: false,
  lastCaller: null,
  turnBeforeInterrupt: null,
  pendingTrucoCaller: null,
  hasEnvidoBeenCalledThisRound: false,
  envidoPointsOnOffer: 0,
  trucoLevel: 0,
  playerEnvidoFoldHistory: [],
  playerTrucoFoldHistory: [],
  playerCalledHighEnvido: false,
};

export function useGameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    // Gameplay Actions
    case ActionType.RESTART_GAME:
      return handleRestartGame(state, action);
    case ActionType.START_NEW_ROUND:
      return handleStartNewRound(state, action);
    case ActionType.PLAY_CARD:
      return handlePlayCard(state, action);

    // Envido Calling Actions
    case ActionType.CALL_ENVIDO:
      return handleCallEnvido(state, action);
    case ActionType.CALL_REAL_ENVIDO:
      return handleCallRealEnvido(state, action);
    case ActionType.CALL_FALTA_ENVIDO:
      return handleCallFaltaEnvido(state, action);

    // Truco Calling Actions
    case ActionType.CALL_TRUCO:
      return handleCallTruco(state, action);
    case ActionType.CALL_RETRUCO:
      return handleCallRetruco(state, action);
    case ActionType.CALL_VALE_CUATRO:
      return handleCallValeCuatro(state, action);

    // Response Actions
    case ActionType.ACCEPT:
      return handleAccept(state, action);
    case ActionType.DECLINE:
      return handleDecline(state, action);

    // Simple state changes & UI actions
    case ActionType.TOGGLE_DEBUG_MODE:
      return { ...state, isDebugMode: !state.isDebugMode };
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