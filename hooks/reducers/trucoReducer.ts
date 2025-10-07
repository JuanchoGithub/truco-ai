import { GameState, ActionType } from '../../types';

export function handleCallTruco(state: GameState, action: { type: ActionType.CALL_TRUCO }): GameState {
  const isEnvidoPossible = state.currentTrick === 0 && state.playerTricks[0] === null && state.aiTricks[0] === null;
  return { 
    ...state, 
    gamePhase: 'truco_called', 
    lastCaller: state.currentTurn, 
    currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
    turnBeforeInterrupt: state.currentTurn,
    trucoLevel: 1,
    pendingTrucoCaller: isEnvidoPossible ? state.currentTurn : null,
    messageLog: [...state.messageLog, `${state.currentTurn.toUpperCase()} calls TRUCO!`],
  };
}

export function handleCallRetruco(state: GameState, action: { type: ActionType.CALL_RETRUCO }): GameState {
   return { 
      ...state, 
      gamePhase: 'retruco_called', 
      lastCaller: state.currentTurn, 
      currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
      turnBeforeInterrupt: state.turnBeforeInterrupt || state.currentTurn,
      trucoLevel: 2,
      pendingTrucoCaller: null,
      messageLog: [...state.messageLog, `${state.currentTurn.toUpperCase()} calls RETRUCO!`],
    };
}

export function handleCallValeCuatro(state: GameState, action: { type: ActionType.CALL_VALE_CUATRO }): GameState {
   return { 
      ...state, 
      gamePhase: 'vale_cuatro_called', 
      lastCaller: state.currentTurn, 
      currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
      turnBeforeInterrupt: state.turnBeforeInterrupt || state.currentTurn,
      trucoLevel: 3,
      pendingTrucoCaller: null,
      messageLog: [...state.messageLog, `${state.currentTurn.toUpperCase()} calls VALE CUATRO!`],
    };
}

export function handleCallFaltaTruco(state: GameState, action: { type: ActionType.CALL_FALTA_TRUCO }): GameState {
   // Falta Truco escalates the game to the highest stakes, functionally similar to Vale Cuatro in this point system.
   return { 
      ...state, 
      gamePhase: 'vale_cuatro_called', 
      lastCaller: state.currentTurn, 
      currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
      turnBeforeInterrupt: state.turnBeforeInterrupt || state.currentTurn,
      trucoLevel: 3,
      pendingTrucoCaller: null,
      messageLog: [...state.messageLog, `${state.currentTurn.toUpperCase()} calls FALTA TRUCO!`],
    };
}
