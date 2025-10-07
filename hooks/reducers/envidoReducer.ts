// Fix: Imported `GamePhase` to make the type available for casting.
import { GameState, ActionType, Player, GamePhase } from '../../types';

export function handleCallEnvido(state: GameState, action: { type: ActionType.CALL_ENVIDO }): GameState {
  const caller = state.currentTurn;
  const opponent = caller === 'player' ? 'ai' : 'player';

  const message = state.pendingTrucoCaller !== null
    ? `${caller.toUpperCase()}: "El envido está primero!"`
    : `${caller.toUpperCase()} calls ENVIDO!`;

  return { 
    ...state, 
    gamePhase: 'envido_called', 
    lastCaller: caller, 
    currentTurn: opponent,
    turnBeforeInterrupt: state.pendingTrucoCaller !== null ? state.turnBeforeInterrupt : caller,
    hasEnvidoBeenCalledThisRound: true,
    envidoPointsOnOffer: 2,
    messageLog: [...state.messageLog, message],
  };
}

export function handleCallRealEnvido(state: GameState, action: { type: ActionType.CALL_REAL_ENVIDO }): GameState {
  const isPlayerRespondingToAI = state.lastCaller === 'ai';
  const newFoldHistory = isPlayerRespondingToAI
      ? [...state.playerEnvidoFoldHistory, false]
      : state.playerEnvidoFoldHistory;
  const caller = state.currentTurn;
  const opponent = caller === 'player' ? 'ai' : 'player';
  return {
    ...state,
    gamePhase: 'envido_called',
    lastCaller: caller,
    currentTurn: opponent,
    turnBeforeInterrupt: state.turnBeforeInterrupt || caller,
    envidoPointsOnOffer: state.envidoPointsOnOffer + 3,
    messageLog: [...state.messageLog, `${caller.toUpperCase()} escalates to REAL ENVIDO!`],
    playerEnvidoFoldHistory: newFoldHistory,
  };
}

export function handleCallFaltaEnvido(state: GameState, action: { type: ActionType.CALL_FALTA_ENVIDO }): GameState {
  const isPlayerRespondingToAI = state.lastCaller === 'ai';
  const newFoldHistory = isPlayerRespondingToAI
      ? [...state.playerEnvidoFoldHistory, false]
      : state.playerEnvidoFoldHistory;
  const caller = state.currentTurn;
  const opponent = caller === 'player' ? 'ai' : 'player';
  
  // Falta Envido is worth the points the leading player needs to win the game (to 15).
  const leadingScore = Math.max(state.playerScore, state.aiScore);
  const faltaPoints = 15 - leadingScore;

  return {
    ...state,
    gamePhase: 'envido_called',
    lastCaller: caller,
    currentTurn: opponent,
    turnBeforeInterrupt: state.turnBeforeInterrupt || caller,
    envidoPointsOnOffer: faltaPoints,
    messageLog: [...state.messageLog, `${caller.toUpperCase()} calls FALTA ENVIDO!`],
    playerEnvidoFoldHistory: newFoldHistory,
  };
}

export function handleDeclareFlor(state: GameState, action: { type: ActionType.DECLARE_FLOR }): GameState {
  const caller = state.currentTurn;
  const points = 3;

  let newPlayerScore = state.playerScore;
  let newAiScore = state.aiScore;

  if (caller === 'player') {
    newPlayerScore += points;
  } else {
    newAiScore += points;
  }
  
  const messageLog = [
    ...state.messageLog, 
    `${caller.toUpperCase()} declares FLOR!`,
    `${caller.toUpperCase()} wins ${points} points.`
  ];

  // Since Flor doesn't require a response, the game state continues.
  // The turn to play a card remains with whoever's turn it was.
  // The envido phase is now over.
  return {
    ...state,
    playerScore: newPlayerScore,
    aiScore: newAiScore,
    hasFlorBeenCalledThisRound: true,
    hasEnvidoBeenCalledThisRound: true, // Flor overrides envido
    messageLog,
    // FIX: Changed `as const` to `as GamePhase` to correctly cast the template literal string to the GamePhase union type.
    gamePhase: `trick_${state.currentTrick + 1}` as GamePhase,
    // currentTurn does not change, it's still this player's turn to act (play a card or call truco)
  };
}