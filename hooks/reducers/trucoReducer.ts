import { GameState, ActionType, AiTrucoContext, PlayerTrucoCallEntry } from '../../types';
import { calculateHandStrength } from '../../services/trucoLogic';

function updateRoundHistoryWithCall(state: GameState, callText: string): GameState {
    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
      currentRoundSummary.calls.push(callText);
    }
    return { ...state, roundHistory: newRoundHistory };
};

export function handleCallTruco(state: GameState, action: { type: ActionType.CALL_TRUCO, payload?: { blurbText: string, trucoContext?: AiTrucoContext } }): GameState {
  const isEnvidoPossible = state.currentTrick === 0 && state.playerTricks[0] === null && state.aiTricks[0] === null;
  const callerName = state.currentTurn === 'player' ? 'Jugador' : 'IA';
  const caller = state.currentTurn!;
  
  const newState: Partial<GameState> = {};

  if (caller === 'player' && state.currentTrick === 0) {
    const strength = calculateHandStrength(state.initialPlayerHand);
    const newEntry: PlayerTrucoCallEntry = { strength, mano: state.mano === 'player' };
    newState.playerTrucoCallHistory = [...state.playerTrucoCallHistory, newEntry];
  }

  const updatedState = updateRoundHistoryWithCall(state, `${caller}: Truco`);

  return { 
    ...updatedState, 
    ...newState,
    gamePhase: 'truco_called', 
    lastCaller: state.currentTurn, 
    currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
    turnBeforeInterrupt: state.currentTurn,
    trucoLevel: 1,
    pendingTrucoCaller: isEnvidoPossible ? state.currentTurn : null,
    messageLog: [...state.messageLog, `${callerName} canta ¡TRUCO!`],
    aiTrucoContext: action.payload?.trucoContext || null,
    aiBlurb: action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
    isThinking: caller === 'ai' ? false : state.isThinking,
  };
}

export function handleCallRetruco(state: GameState, action: { type: ActionType.CALL_RETRUCO, payload?: { blurbText: string, trucoContext?: AiTrucoContext } }): GameState {
   const callerName = state.currentTurn === 'player' ? 'Jugador' : 'IA';
   const caller = state.currentTurn!;
   const updatedState = updateRoundHistoryWithCall(state, `${caller}: Retruco`);
   return { 
      ...updatedState, 
      gamePhase: 'retruco_called', 
      lastCaller: state.currentTurn, 
      currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
      turnBeforeInterrupt: state.turnBeforeInterrupt || state.currentTurn,
      trucoLevel: 2,
      pendingTrucoCaller: null,
      messageLog: [...state.messageLog, `${callerName} canta ¡RETRUCO!`],
      aiTrucoContext: action.payload?.trucoContext || null,
      aiBlurb: action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
      isThinking: caller === 'ai' ? false : state.isThinking,
    };
}

export function handleCallValeCuatro(state: GameState, action: { type: ActionType.CALL_VALE_CUATRO, payload?: { blurbText: string, trucoContext?: AiTrucoContext } }): GameState {
   const callerName = state.currentTurn === 'player' ? 'Jugador' : 'IA';
   const caller = state.currentTurn!;
   const updatedState = updateRoundHistoryWithCall(state, `${caller}: Vale Cuatro`);
   return { 
      ...updatedState, 
      gamePhase: 'vale_cuatro_called', 
      lastCaller: state.currentTurn, 
      currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
      turnBeforeInterrupt: state.turnBeforeInterrupt || state.currentTurn,
      trucoLevel: 3,
      pendingTrucoCaller: null,
      messageLog: [...state.messageLog, `${callerName} canta ¡VALE CUATRO!`],
      aiTrucoContext: action.payload?.trucoContext || null,
      aiBlurb: action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
      isThinking: caller === 'ai' ? false : state.isThinking,
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
