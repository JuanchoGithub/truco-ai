import { GameState, ActionType } from '../../types';

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
  const opponentScore = opponent === 'player' ? state.playerScore : state.aiScore;
  const faltaPoints = 15 - opponentScore;
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
