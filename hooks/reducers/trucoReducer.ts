import { GameState, ActionType, AiDecisionContext, PlayerTrucoCallEntry } from '../../types';
import { calculateHandStrength, getHandPercentile } from '../../services/trucoLogic';

function updateRoundHistoryWithCall(state: GameState, callText: string): GameState {
    const newRoundHistory = [...state.roundHistory];
    const currentRoundSummary = newRoundHistory.find(r => r.round === state.round);
    if (currentRoundSummary) {
      currentRoundSummary.calls.push(callText);
    }
    return { ...state, roundHistory: newRoundHistory };
};

export function handleCallTruco(state: GameState, action: { type: ActionType.CALL_TRUCO, payload?: { blurbText: string, decisionContext?: AiDecisionContext } }): GameState {
  const isEnvidoPossible = state.currentTrick === 0 && state.playerTricks[0] === null && state.aiTricks[0] === null;
  const caller = state.currentTurn!;
  const isPlayer = caller === 'player';
  
  const newState: Partial<GameState> = {};
  let updatedState = { ...state };

  if (isPlayer) {
    const handStrength = calculateHandStrength(state.initialPlayerHand);
    const handPercentile = getHandPercentile(state.initialPlayerHand);
    const isBluff = handPercentile < 40; // Bluff is defined as a hand in the bottom 40%

    const newEntry: PlayerTrucoCallEntry = { strength: handStrength, mano: state.mano === 'player' };
    newState.playerTrucoCallHistory = [...state.playerTrucoCallHistory, newEntry];
    
    // Update round history with bluff info
    const currentRoundIndex = updatedState.roundHistory.findIndex(r => r.round === state.round);
    if (currentRoundIndex !== -1) {
        const newRoundHistory = [...updatedState.roundHistory];
        const updatedSummary = { 
            ...newRoundHistory[currentRoundIndex],
            playerTrucoCall: { handStrength, isBluff }
        };
        newRoundHistory[currentRoundIndex] = updatedSummary;
        updatedState = { ...updatedState, roundHistory: newRoundHistory };
    }
  }
  
  if (caller === 'ai' && state.currentTrick === 0) {
    updatedState.envidoPrimeroOpportunities = (updatedState.envidoPrimeroOpportunities || 0) + 1;
  }

  updatedState = updateRoundHistoryWithCall(updatedState, `${caller}: Truco`);

  return { 
    ...updatedState, 
    ...newState,
    gamePhase: 'truco_called', 
    lastCaller: state.currentTurn, 
    currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
    turnBeforeInterrupt: state.turnBeforeInterrupt || state.currentTurn,
    trucoLevel: 1,
    pendingTrucoCaller: isEnvidoPossible ? state.currentTurn : null,
    messageLog: [...state.messageLog, { key: 'log.call_truco', options: { caller } }],
    aiDecisionContext: action.payload?.decisionContext || null,
    playerBlurb: isPlayer ? { text: 'actionBar.truco', isVisible: true } : null,
    aiBlurb: !isPlayer && action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
    isThinking: caller === 'ai' ? false : state.isThinking,
  };
}

export function handleCallRetruco(state: GameState, action: { type: ActionType.CALL_RETRUCO, payload?: { blurbText: string, decisionContext?: AiDecisionContext } }): GameState {
   const caller = state.currentTurn!;
   const isPlayer = caller === 'player';
   const updatedState = updateRoundHistoryWithCall(state, `${caller}: Retruco`);
   return { 
      ...updatedState, 
      gamePhase: 'retruco_called', 
      lastCaller: state.currentTurn, 
      currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
      turnBeforeInterrupt: state.turnBeforeInterrupt || state.currentTurn,
      trucoLevel: 2,
      pendingTrucoCaller: null,
      messageLog: [...state.messageLog, { key: 'log.call_retruco', options: { caller } }],
      aiDecisionContext: action.payload?.decisionContext || null,
      playerBlurb: isPlayer ? { text: 'actionBar.retruco', isVisible: true } : null,
      aiBlurb: !isPlayer && action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
      isThinking: caller === 'ai' ? false : state.isThinking,
    };
}

export function handleCallValeCuatro(state: GameState, action: { type: ActionType.CALL_VALE_CUATRO, payload?: { blurbText: string, decisionContext?: AiDecisionContext } }): GameState {
   const caller = state.currentTurn!;
   const isPlayer = caller === 'player';
   const updatedState = updateRoundHistoryWithCall(state, `${caller}: Vale Cuatro`);
   return { 
      ...updatedState, 
      gamePhase: 'vale_cuatro_called', 
      lastCaller: state.currentTurn, 
      currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
      turnBeforeInterrupt: state.turnBeforeInterrupt || state.currentTurn,
      trucoLevel: 3,
      pendingTrucoCaller: null,
      messageLog: [...state.messageLog, { key: 'log.call_vale_cuatro', options: { caller } }],
      aiDecisionContext: action.payload?.decisionContext || null,
      playerBlurb: isPlayer ? { text: 'actionBar.vale_cuatro', isVisible: true } : null,
      aiBlurb: !isPlayer && action.payload?.blurbText ? { text: action.payload.blurbText, isVisible: true } : null,
      isThinking: caller === 'ai' ? false : state.isThinking,
    };
}

export function handleCallFaltaTruco(state: GameState, action: { type: ActionType.CALL_FALTA_TRUCO }): GameState {
   // Falta Truco escalates the game to the highest stakes, functionally similar to Vale Cuatro in this point system.
   const caller = state.currentTurn!;
   return { 
      ...state, 
      gamePhase: 'vale_cuatro_called', 
      lastCaller: state.currentTurn, 
      currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
      turnBeforeInterrupt: state.turnBeforeInterrupt || state.currentTurn,
      trucoLevel: 3,
      pendingTrucoCaller: null,
      messageLog: [...state.messageLog, { key: 'log.call_falta_truco', options: { caller } }],
    };
}