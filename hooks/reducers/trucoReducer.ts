import { GameState, ActionType } from '../../types';

export function handleCallTruco(state: GameState, action: { type: ActionType.CALL_TRUCO, payload?: { blurbText: string } }): GameState {
  const isEnvidoPossible = state.currentTrick === 0 && state.playerTricks[0] === null && state.aiTricks[0] === null;
  const callerName = state.currentTurn === 'player' ? 'Jugador' : 'IA';
  return { 
    ...state, 
    gamePhase: 'truco_called', 
    lastCaller: state.currentTurn, 
    currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
    turnBeforeInterrupt: state.currentTurn,
    trucoLevel: 1,
    pendingTrucoCaller: isEnvidoPossible ? state.currentTurn : null,
    messageLog: [...state.messageLog, `${callerName} canta ¡TRUCO!`],
    aiBlurb: action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
  };
}

export function handleCallRetruco(state: GameState, action: { type: ActionType.CALL_RETRUCO, payload?: { blurbText: string } }): GameState {
   const callerName = state.currentTurn === 'player' ? 'Jugador' : 'IA';
   return { 
      ...state, 
      gamePhase: 'retruco_called', 
      lastCaller: state.currentTurn, 
      currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
      turnBeforeInterrupt: state.turnBeforeInterrupt || state.currentTurn,
      trucoLevel: 2,
      pendingTrucoCaller: null,
      messageLog: [...state.messageLog, `${callerName} canta ¡RETRUCO!`],
      aiBlurb: action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
    };
}

export function handleCallValeCuatro(state: GameState, action: { type: ActionType.CALL_VALE_CUATRO, payload?: { blurbText: string } }): GameState {
   const callerName = state.currentTurn === 'player' ? 'Jugador' : 'IA';
   return { 
      ...state, 
      gamePhase: 'vale_cuatro_called', 
      lastCaller: state.currentTurn, 
      currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
      turnBeforeInterrupt: state.turnBeforeInterrupt || state.currentTurn,
      trucoLevel: 3,
      pendingTrucoCaller: null,
      messageLog: [...state.messageLog, `${callerName} canta ¡VALE CUATRO!`],
      aiBlurb: action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
    };
}

export function handleCallFaltaTruco(state: GameState, action: { type: ActionType.CALL_FALTA_TRUCO }): GameState {
   // Falta Truco escalates the game to the highest stakes, functionally similar to Vale Cuatro in this point system.
   const callerName = state.currentTurn === 'player' ? 'Jugador' : 'IA';
   return { 
      ...state, 
      gamePhase: 'vale_cuatro_called', 
      lastCaller: state.currentTurn, 
      currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
      turnBeforeInterrupt: state.turnBeforeInterrupt || state.currentTurn,
      trucoLevel: 3,
      pendingTrucoCaller: null,
      messageLog: [...state.messageLog, `${callerName} canta ¡FALTA TRUCO!`],
    };
}