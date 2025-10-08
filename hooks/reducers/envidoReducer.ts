

// Fix: Imported `GamePhase` to make the type available for casting.
import { GameState, ActionType, Player, GamePhase, PlayerEnvidoActionEntry } from '../../types';
import { getEnvidoValue } from '../../services/trucoLogic';

function updateRoundHistoryWithCall(state: GameState, callText: string): GameState {
    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
      currentRoundSummary.calls.push(callText);
    }
    return { ...state, roundHistory: newRoundHistory };
};

export function handleCallEnvido(state: GameState, action: { type: ActionType.CALL_ENVIDO; payload?: { blurbText: string } }): GameState {
  const caller = state.currentTurn!;
  const opponent = caller === 'player' ? 'ai' : 'player';

  let newEnvidoHistory = state.playerEnvidoHistory;
  if (caller === 'player') {
    // We remove the 'did_not_call' entry that was preemptively added on the first card play
    const filteredHistory = state.playerEnvidoHistory.filter(e => !(e.round === state.round && e.action === 'did_not_call'));
    const entry: PlayerEnvidoActionEntry = {
        round: state.round,
        envidoPoints: getEnvidoValue(state.initialPlayerHand),
        action: 'called',
        wasMano: state.mano === 'player',
    };
    newEnvidoHistory = [...filteredHistory, entry];
  }

  const message = state.pendingTrucoCaller !== null
    ? `${caller === 'player' ? 'Jugador' : 'IA'}: "¡El envido está primero!"`
    : `${caller === 'player' ? 'Jugador' : 'IA'} canta ¡ENVIDO!`;

  const updatedState = updateRoundHistoryWithCall(state, `${caller}: Envido`);

  return { 
    ...updatedState, 
    gamePhase: 'envido_called', 
    lastCaller: caller, 
    currentTurn: opponent,
    turnBeforeInterrupt: state.pendingTrucoCaller !== null ? state.turnBeforeInterrupt : caller,
    hasEnvidoBeenCalledThisRound: true,
    envidoPointsOnOffer: 2,
    previousEnvidoPoints: 0,
    playerEnvidoHistory: newEnvidoHistory,
    messageLog: [...state.messageLog, message],
    aiBlurb: action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
    isThinking: caller === 'ai' ? false : state.isThinking,
  };
}

export function handleCallRealEnvido(state: GameState, action: { type: ActionType.CALL_REAL_ENVIDO, payload?: { blurbText: string } }): GameState {
  const caller = state.currentTurn!;
  const opponent = caller === 'player' ? 'ai' : 'player';

  const isPlayerRespondingToAI = state.lastCaller === 'ai';
  const newFoldHistory = isPlayerRespondingToAI
      ? [...state.playerEnvidoFoldHistory, false]
      : state.playerEnvidoFoldHistory;

  let newEnvidoHistory = state.playerEnvidoHistory;
  if (caller === 'player') {
    const entry: PlayerEnvidoActionEntry = {
        round: state.round,
        envidoPoints: getEnvidoValue(state.initialPlayerHand),
        action: 'escalated_real',
        wasMano: state.mano === 'player',
    };
    newEnvidoHistory = [...state.playerEnvidoHistory, entry];
  }
  
  const updatedState = updateRoundHistoryWithCall(state, `${caller}: Real Envido`);

  const isEscalation = state.gamePhase === 'envido_called';
  const previousPoints = isEscalation ? state.envidoPointsOnOffer : 0;

  return {
    ...updatedState,
    gamePhase: 'envido_called',
    lastCaller: caller,
    currentTurn: opponent,
    turnBeforeInterrupt: state.turnBeforeInterrupt || caller,
    envidoPointsOnOffer: 3,
    previousEnvidoPoints: previousPoints,
    playerEnvidoHistory: newEnvidoHistory,
    messageLog: [...state.messageLog, `${caller === 'player' ? 'Jugador' : 'IA'} sube a ¡REAL ENVIDO!`],
    playerEnvidoFoldHistory: newFoldHistory,
    hasEnvidoBeenCalledThisRound: true,
    aiBlurb: action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
    isThinking: caller === 'ai' ? false : state.isThinking,
  };
}

export function handleCallFaltaEnvido(state: GameState, action: { type: ActionType.CALL_FALTA_ENVIDO, payload?: { blurbText: string } }): GameState {
  const caller = state.currentTurn!;
  const opponent = caller === 'player' ? 'ai' : 'player';

  const isPlayerRespondingToAI = state.lastCaller === 'ai';
  const newFoldHistory = isPlayerRespondingToAI
      ? [...state.playerEnvidoFoldHistory, false]
      : state.playerEnvidoFoldHistory;
  
  // Falta Envido is worth the points the leading player needs to win the game (to 15).
  const leadingScore = Math.max(state.playerScore, state.aiScore);
  const faltaPoints = 15 - leadingScore;

  let newEnvidoHistory = state.playerEnvidoHistory;
  if (caller === 'player') {
    const entry: PlayerEnvidoActionEntry = {
        round: state.round,
        envidoPoints: getEnvidoValue(state.initialPlayerHand),
        action: 'escalated_falta',
        wasMano: state.mano === 'player',
    };
    newEnvidoHistory = [...state.playerEnvidoHistory, entry];
  }

  const updatedState = updateRoundHistoryWithCall(state, `${caller}: Falta Envido`);

  const isEscalation = state.gamePhase === 'envido_called';
  const previousPoints = isEscalation ? state.envidoPointsOnOffer : 0;

  return {
    ...updatedState,
    gamePhase: 'envido_called',
    lastCaller: caller,
    currentTurn: opponent,
    turnBeforeInterrupt: state.turnBeforeInterrupt || caller,
    envidoPointsOnOffer: faltaPoints,
    previousEnvidoPoints: previousPoints,
    playerEnvidoHistory: newEnvidoHistory,
    messageLog: [...state.messageLog, `${caller === 'player' ? 'Jugador' : 'IA'} canta ¡FALTA ENVIDO!`],
    playerEnvidoFoldHistory: newFoldHistory,
    hasEnvidoBeenCalledThisRound: true,
    aiBlurb: action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
    isThinking: caller === 'ai' ? false : state.isThinking,
  };
}

export function handleDeclareFlor(state: GameState, action: { type: ActionType.DECLARE_FLOR; payload?: { blurbText: string } }): GameState {
  const caller = state.currentTurn!;
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
  
  const updatedState = updateRoundHistoryWithCall(state, `${caller}: Flor`);
  
  // Finalize the round history points
  const newRoundHistory = [...updatedState.roundHistory];
  const currentRoundSummary = newRoundHistory.find(r => r.round === updatedState.round);
  if (currentRoundSummary) {
      if (caller === 'player') currentRoundSummary.pointsAwarded.player += points;
      if (caller === 'ai') currentRoundSummary.pointsAwarded.ai += points;
  }
  
  // Check for a game winner immediately after awarding points
  if (newPlayerScore >= 15 || newAiScore >= 15) {
      const finalWinner = newPlayerScore >= 15 ? 'player' : 'ai';
      return {
          ...updatedState,
          playerScore: newPlayerScore,
          aiScore: newAiScore,
          winner: finalWinner,
          gamePhase: 'game_over',
          messageLog,
          roundHistory: newRoundHistory,
          hasFlorBeenCalledThisRound: true,
          hasEnvidoBeenCalledThisRound: true,
      };
  }

  // If flor was declared while another call (like truco) was pending,
  // we resolve flor but keep the game in that pending state.
  // Otherwise, we proceed with the trick.
  const nextGamePhase = state.gamePhase.includes('_called')
    ? state.gamePhase
    : `trick_${state.currentTrick + 1}`;

  return {
    ...updatedState,
    playerScore: newPlayerScore,
    aiScore: newAiScore,
    hasFlorBeenCalledThisRound: true,
    hasEnvidoBeenCalledThisRound: true, // Flor overrides envido
    messageLog,
    roundHistory: newRoundHistory,
    gamePhase: nextGamePhase as GamePhase,
    aiBlurb: caller === 'ai' && action.payload?.blurbText 
      ? { text: action.payload.blurbText, isVisible: true } 
      : state.aiBlurb, // Preserve existing blurb if player acts
    isThinking: caller === 'ai' ? false : state.isThinking,
    // currentTurn does not change, it's still this player's turn to act
  };
}