// Fix: Imported `GamePhase` to make the type available for casting.
import { GameState, ActionType, Player, GamePhase } from '../../types';

export function handleCallEnvido(state: GameState, action: { type: ActionType.CALL_ENVIDO; payload?: { blurbText: string } }): GameState {
  const caller = state.currentTurn;
  const opponent = caller === 'player' ? 'ai' : 'player';

  const message = state.pendingTrucoCaller !== null
    ? `${caller === 'player' ? 'Jugador' : 'IA'}: "¡El envido está primero!"`
    : `${caller === 'player' ? 'Jugador' : 'IA'} canta ¡ENVIDO!`;

  return { 
    ...state, 
    gamePhase: 'envido_called', 
    lastCaller: caller, 
    currentTurn: opponent,
    turnBeforeInterrupt: state.pendingTrucoCaller !== null ? state.turnBeforeInterrupt : caller,
    hasEnvidoBeenCalledThisRound: true,
    envidoPointsOnOffer: 2,
    messageLog: [...state.messageLog, message],
    aiBlurb: action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
  };
}

export function handleCallRealEnvido(state: GameState, action: { type: ActionType.CALL_REAL_ENVIDO, payload?: { blurbText: string } }): GameState {
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
    messageLog: [...state.messageLog, `${caller === 'player' ? 'Jugador' : 'IA'} sube a ¡REAL ENVIDO!`],
    playerEnvidoFoldHistory: newFoldHistory,
    hasEnvidoBeenCalledThisRound: true,
    aiBlurb: action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
  };
}

export function handleCallFaltaEnvido(state: GameState, action: { type: ActionType.CALL_FALTA_ENVIDO, payload?: { blurbText: string } }): GameState {
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
    messageLog: [...state.messageLog, `${caller === 'player' ? 'Jugador' : 'IA'} canta ¡FALTA ENVIDO!`],
    playerEnvidoFoldHistory: newFoldHistory,
    hasEnvidoBeenCalledThisRound: true,
    aiBlurb: action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
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
  
  const callerName = caller === 'player' ? 'Jugador' : 'IA';
  const messageLog = [
    ...state.messageLog, 
    `${callerName} canta ¡FLOR!`,
    `${callerName} gana ${points} puntos.`
  ];

  // If flor was declared while another call (like truco) was pending,
  // we resolve flor but keep the game in that pending state.
  // Otherwise, we proceed with the trick.
  const nextGamePhase = state.gamePhase.includes('_called')
    ? state.gamePhase
    : `trick_${state.currentTrick + 1}`;
  
  return {
    ...state,
    playerScore: newPlayerScore,
    aiScore: newAiScore,
    hasFlorBeenCalledThisRound: true,
    hasEnvidoBeenCalledThisRound: true, // Flor overrides envido
    messageLog,
    gamePhase: nextGamePhase as GamePhase,
    // currentTurn does not change, it's still this player's turn to act
  };
}