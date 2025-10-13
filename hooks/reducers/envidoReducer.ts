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
  const isPlayer = caller === 'player';
  const isEscalation = state.gamePhase === 'envido_called';
  const previousPoints = isEscalation ? state.envidoPointsOnOffer : 0;
  const newPoints = isEscalation ? state.envidoPointsOnOffer + 2 : 2;

  let newEnvidoHistory = state.playerEnvidoHistory;
  if (isPlayer) {
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

  const messageKey = isEscalation
    ? 'log.call_envido_again'
    : state.pendingTrucoCaller !== null
    ? 'log.call_envido_primero'
    : 'log.call_envido';
  const message = { key: messageKey, options: { caller } };

  const updatedState = updateRoundHistoryWithCall(state, `${caller}: Envido`);

  if (isPlayer && state.pendingTrucoCaller === 'ai') {
    updatedState.envidoPrimeroCalls = (updatedState.envidoPrimeroCalls || 0) + 1;
  }

  return { 
    ...updatedState, 
    gamePhase: 'envido_called', 
    lastCaller: caller, 
    currentTurn: opponent,
    turnBeforeInterrupt: state.pendingTrucoCaller !== null ? state.turnBeforeInterrupt : caller,
    hasEnvidoBeenCalledThisRound: true,
    envidoPointsOnOffer: newPoints,
    previousEnvidoPoints: previousPoints,
    playerEnvidoHistory: newEnvidoHistory,
    messageLog: [...state.messageLog, message],
    playerBlurb: isPlayer ? { text: 'actionBar.envido', isVisible: true } : null,
    aiBlurb: !isPlayer && action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
    isThinking: caller === 'ai' ? false : state.isThinking,
  };
}

export function handleCallRealEnvido(state: GameState, action: { type: ActionType.CALL_REAL_ENVIDO, payload?: { blurbText: string } }): GameState {
  const caller = state.currentTurn!;
  const opponent = caller === 'player' ? 'ai' : 'player';
  const isPlayer = caller === 'player';

  const isPlayerRespondingToAI = state.lastCaller === 'ai';
  const newFoldHistory = isPlayerRespondingToAI
      ? [...state.playerEnvidoFoldHistory, false]
      : state.playerEnvidoFoldHistory;

  let newEnvidoHistory = state.playerEnvidoHistory;
  if (isPlayer) {
    const entry: PlayerEnvidoActionEntry = {
        round: state.round,
        envidoPoints: getEnvidoValue(state.initialPlayerHand),
        action: 'escalated_real',
        wasMano: state.mano === 'player',
    };
    newEnvidoHistory = [...state.playerEnvidoHistory.filter(e => !(e.round === state.round && e.action === 'did_not_call')), entry];
  }
  
  const updatedState = updateRoundHistoryWithCall(state, `${caller}: Real Envido`);

  const isEscalation = state.gamePhase === 'envido_called';
  const previousPoints = isEscalation ? state.envidoPointsOnOffer : 0;
  const newPoints = isEscalation ? state.envidoPointsOnOffer + 3 : 3;

  return {
    ...updatedState,
    gamePhase: 'envido_called',
    lastCaller: caller,
    currentTurn: opponent,
    turnBeforeInterrupt: state.turnBeforeInterrupt || caller,
    envidoPointsOnOffer: newPoints,
    previousEnvidoPoints: previousPoints,
    hasRealEnvidoBeenCalledThisSequence: true,
    playerEnvidoHistory: newEnvidoHistory,
    messageLog: [...state.messageLog, { key: 'log.call_real_envido', options: { caller } }],
    playerEnvidoFoldHistory: newFoldHistory,
    hasEnvidoBeenCalledThisRound: true,
    playerBlurb: isPlayer ? { text: 'actionBar.real_envido', isVisible: true } : null,
    aiBlurb: !isPlayer && action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
    isThinking: caller === 'ai' ? false : state.isThinking,
  };
}

export function handleCallFaltaEnvido(state: GameState, action: { type: ActionType.CALL_FALTA_ENVIDO, payload?: { blurbText: string } }): GameState {
  const caller = state.currentTurn!;
  const opponent = caller === 'player' ? 'ai' : 'player';
  const isPlayer = caller === 'player';

  const isPlayerRespondingToAI = state.lastCaller === 'ai';
  const newFoldHistory = isPlayerRespondingToAI
      ? [...state.playerEnvidoFoldHistory, false]
      : state.playerEnvidoFoldHistory;
  
  // Falta Envido is worth the points the leading player needs to win the game (to 15).
  const leadingScore = Math.max(state.playerScore, state.aiScore);
  const faltaPoints = 15 - leadingScore;

  let newEnvidoHistory = state.playerEnvidoHistory;
  if (isPlayer) {
    const entry: PlayerEnvidoActionEntry = {
        round: state.round,
        envidoPoints: getEnvidoValue(state.initialPlayerHand),
        action: 'escalated_falta',
        wasMano: state.mano === 'player',
    };
    newEnvidoHistory = [...state.playerEnvidoHistory.filter(e => !(e.round === state.round && e.action === 'did_not_call')), entry];
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
    messageLog: [...state.messageLog, { key: 'log.call_falta_envido', options: { caller } }],
    playerEnvidoFoldHistory: newFoldHistory,
    hasEnvidoBeenCalledThisRound: true,
    playerBlurb: isPlayer ? { text: 'actionBar.falta_envido', isVisible: true } : null,
    aiBlurb: !isPlayer && action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
    isThinking: caller === 'ai' ? false : state.isThinking,
  };
}

export function handleDeclareFlor(state: GameState, action: { type: ActionType.DECLARE_FLOR; payload?: { blurbText?: string; player?: Player } }): GameState {
  const caller = action.payload?.player || state.currentTurn!;
  const opponent = caller === 'player' ? 'ai' : 'player';
  const isPlayer = caller === 'player';

  const updatedState = updateRoundHistoryWithCall(state, `${caller}: Flor`);
  
  return {
    ...updatedState,
    gamePhase: 'flor_called',
    lastCaller: caller,
    currentTurn: opponent,
    turnBeforeInterrupt: state.turnBeforeInterrupt || caller,
    hasFlorBeenCalledThisRound: true,
    hasEnvidoBeenCalledThisRound: true, // Flor cancels any envido for the round
    florPointsOnOffer: 3,
    messageLog: [...state.messageLog, { key: 'log.declare_flor', options: { caller } }],
    playerBlurb: isPlayer ? { text: 'actionBar.flor', isVisible: true } : null,
    aiBlurb: !isPlayer && action.payload?.blurbText
      ? { text: action.payload.blurbText, isVisible: true }
      : state.aiBlurb,
    isThinking: caller === 'ai' ? false : state.isThinking,
  };
}

export function handleRespondToEnvidoWithFlor(state: GameState, action: { type: ActionType.RESPOND_TO_ENVIDO_WITH_FLOR, payload?: { blurbText?: string } }): GameState {
  const caller = state.currentTurn!; // The one with Flor
  const opponent = caller === 'player' ? 'ai' : 'player'; // The one who called Envido
  const isPlayer = caller === 'player';

  const updatedState = updateRoundHistoryWithCall(state, `${caller}: Flor`);
  
  return {
    ...updatedState,
    gamePhase: 'flor_called',
    lastCaller: caller,
    currentTurn: opponent, // Turn goes to the Envido caller to respond to the Flor
    turnBeforeInterrupt: state.turnBeforeInterrupt,
    hasFlorBeenCalledThisRound: true,
    hasEnvidoBeenCalledThisRound: true,
    florPointsOnOffer: 3,
    envidoPointsOnOffer: 0, // Envido is cancelled
    messageLog: [...state.messageLog, { key: 'log.respond_envido_with_flor', options: { caller } }],
    playerBlurb: isPlayer ? { text: 'actionBar.flor', isVisible: true } : null,
    aiBlurb: !isPlayer && action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
    isThinking: caller === 'ai' ? false : state.isThinking,
  };
}

export function handleCallContraflor(state: GameState, action: { type: ActionType.CALL_CONTRAFLOR, payload?: { blurbText?: string } }): GameState {
  const caller = state.currentTurn!;
  const opponent = caller === 'player' ? 'ai' : 'player';
  const isPlayer = caller === 'player';

  const updatedState = updateRoundHistoryWithCall(state, `${caller}: Contraflor`);
  
  return {
    ...updatedState,
    gamePhase: 'contraflor_called',
    lastCaller: caller,
    currentTurn: opponent,
    turnBeforeInterrupt: state.turnBeforeInterrupt,
    messageLog: [...state.messageLog, { key: 'log.call_contraflor', options: { caller } }],
    playerBlurb: isPlayer ? { text: 'actionBar.contraflor', isVisible: true } : null,
    aiBlurb: !isPlayer && action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
    isThinking: caller === 'ai' ? false : state.isThinking,
  };
}
