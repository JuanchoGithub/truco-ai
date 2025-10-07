
import { GameState, Action, ActionType, GamePhase, Case, OpponentModel } from '../../types';
import { createDeck, shuffleDeck, determineTrickWinner, determineRoundWinner, getCardName, hasFlor } from '../../services/trucoLogic';
import { initialState as baseInitialState } from '../useGameReducer';
import { initializeProbabilities, updateProbsOnPlay } from '../../services/ai/inferenceService';

export function handleRestartGame(state: GameState, action: { type: ActionType.RESTART_GAME }): GameState {
  return {
    ...baseInitialState,
    mano: 'ai', // First game player is mano, next is AI
    currentTurn: 'ai',
    round: 0,
    messageLog: ['¡Nuevo juego comenzado! La IA es mano.'],
    isDebugMode: state.isDebugMode, // Persist debug mode setting
    aiReasoningLog: [{ round: 0, reasoning: 'La IA está esperando que comience la nueva ronda.' }],
    playerEnvidoFoldHistory: [], // Reset history on new game
    aiBlurb: null,
  };
}

export function handleStartNewRound(state: GameState, action: { type: ActionType.START_NEW_ROUND }): GameState {
  if (state.playerScore >= 15 || state.aiScore >= 15) {
    return { 
      ...state, 
      winner: state.playerScore >= 15 ? 'player' : 'ai', 
      gamePhase: 'game_over' 
    };
  }
  
  const newMano = state.mano === 'player' ? 'ai' : 'player';
  const newDeck = shuffleDeck(createDeck());
  const newPlayerHand = newDeck.slice(0, 3);
  const newAiHand = newDeck.slice(3, 6);
  const playerHasFlor = hasFlor(newPlayerHand);
  const aiHasFlor = hasFlor(newAiHand);

  // Initialize opponent hand probabilities
  const opponentUnseenCards = [...newDeck.slice(6), ...newPlayerHand];
  const initialProbs = initializeProbabilities(opponentUnseenCards, [...newAiHand]);


  return {
    ...state,
    deck: newDeck.slice(6),
    playerHand: newPlayerHand,
    aiHand: newAiHand,
    initialPlayerHand: [...newPlayerHand],
    initialAiHand: [...newAiHand],
    playerHasFlor,
    aiHasFlor,
    playerTricks: [null, null, null],
    aiTricks: [null, null, null],
    trickWinners: [null, null, null],
    currentTrick: 0,
    mano: newMano,
    currentTurn: newMano,
    gamePhase: 'trick_1',
    round: state.round + 1,
    messageLog: [...state.messageLog, `--- Ronda ${state.round + 1} ---`, `${newMano === 'player' ? 'Eres' : 'La IA es'} mano.`],
    turnBeforeInterrupt: null,
    pendingTrucoCaller: null,
    hasEnvidoBeenCalledThisRound: false,
    hasFlorBeenCalledThisRound: false,
    envidoPointsOnOffer: 0,
    trucoLevel: 0,
    lastCaller: null,
    playerCalledHighEnvido: false,
    playedCards: [],
    // Reset modeling state
    opponentHandProbabilities: initialProbs,
    playerEnvidoValue: null,
    playerActionHistory: [],
    aiBlurb: null,
  };
}

export function handlePlayCard(state: GameState, action: { type: ActionType.PLAY_CARD; payload: { player: 'player' | 'ai'; cardIndex: number } }): GameState {
    if (state.gamePhase === 'round_end' || state.gamePhase === 'game_over') {
        console.warn(`Attempted to play a card during ${state.gamePhase}. Action ignored.`);
        return state;
    }
    
    const { player, cardIndex } = action.payload;
    const hand = player === 'player' ? state.playerHand : state.aiHand;
      
    if (cardIndex < 0 || cardIndex >= hand.length) {
        console.error("Attempted to play an invalid card index.", { player, cardIndex, hand });
        return state;
    }
    
    // Guard: Prevent playing a card if one has already been played this trick
    const tricksForPlayer = player === 'player' ? state.playerTricks : state.aiTricks;
    if (tricksForPlayer[state.currentTrick] !== null) {
      console.warn(`${player.toUpperCase()} attempted to play a card in trick ${state.currentTrick + 1} where they have already played.`);
      return state; // Return current state without changes
    }
      
    const cardPlayed = hand[cardIndex];
    const newPlayedCards = [...state.playedCards, cardPlayed];
      
    const newPlayerHand = player === 'player' ? state.playerHand.filter((_, i) => i !== cardIndex) : state.playerHand;
    const newAiHand = player === 'ai' ? state.aiHand.filter((_, i) => i !== cardIndex) : state.aiHand;
    const newPlayerTricks = [...state.playerTricks];
    const newAiTricks = [...state.aiTricks];
      
    if (player === 'player') {
      newPlayerTricks[state.currentTrick] = cardPlayed;
    } else {
      newAiTricks[state.currentTrick] = cardPlayed;
    }

    // Update opponent model if player played a card
    let updatedProbs = state.opponentHandProbabilities;
    if (player === 'player' && updatedProbs) {
      updatedProbs = updateProbsOnPlay(updatedProbs, cardPlayed);
    }
      
    const messageLog = [...state.messageLog, `${player === 'player' ? 'Jugador' : 'IA'} juega ${getCardName(cardPlayed)}`];
    const isTrickComplete = newPlayerTricks[state.currentTrick] !== null && newAiTricks[state.currentTrick] !== null;

    if (!isTrickComplete) {
      const nextTurn = player === 'player' ? 'ai' : 'player';
      return {
        ...state,
        playerHand: newPlayerHand,
        aiHand: newAiHand,
        playerTricks: newPlayerTricks,
        aiTricks: newAiTricks,
        currentTurn: nextTurn,
        messageLog: messageLog,
        playedCards: newPlayedCards,
        opponentHandProbabilities: updatedProbs,
        aiBlurb: null,
      };
    }

    const trickWinner = determineTrickWinner(newPlayerTricks[state.currentTrick]!, newAiTricks[state.currentTrick]!);
    const newTrickWinners = [...state.trickWinners];
    newTrickWinners[state.currentTrick] = trickWinner;
    
    const winnerNameTrick = trickWinner === 'player' ? 'JUGADOR' : trickWinner === 'ai' ? 'IA' : 'EMPATE';
    const trickMessageLog = [...messageLog, `Ganador de la mano ${state.currentTrick + 1}: ${winnerNameTrick}`];
    const roundWinner = determineRoundWinner(newTrickWinners, state.mano);
      
    if (roundWinner) {
      const trucoPointMapping = [1, 2, 3, 4];
      const points = trucoPointMapping[state.trucoLevel];
        
      let newPlayerScore = state.playerScore;
      let newAiScore = state.aiScore;
        
      if (roundWinner === 'player') newPlayerScore += points;
      else if (roundWinner === 'ai') newAiScore += points;
      
      let newOpponentModel = state.opponentModel;
      let newAiCases = state.aiCases;
      
      // Check if a Truco showdown just concluded. If so, log the case for learning.
      if (state.aiTrucoContext) {
        const outcome = roundWinner === 'ai' ? 'win' : 'loss';
        const newCase: Case = {
            ...state.aiTrucoContext,
            outcome,
            opponentFoldRateAtTimeOfCall: state.opponentModel.trucoFoldRate,
        };
        newAiCases = [...state.aiCases, newCase];

        const decay = 0.9;
        // Player did NOT fold, so decrease their fold rate.
        const newFoldRate = state.opponentModel.trucoFoldRate * decay;
        
        let newBluffSuccessRate = state.opponentModel.bluffSuccessRate;
        if (state.aiTrucoContext.isBluff) {
            // 1 if opponent caught the bluff, 0 otherwise
            const bluffOutcome = roundWinner === 'ai' ? 0 : 1; 
            newBluffSuccessRate = state.opponentModel.bluffSuccessRate * decay + (1 - decay) * bluffOutcome;
        }

        newOpponentModel = {
            trucoFoldRate: Math.max(0.05, newFoldRate),
            bluffSuccessRate: newBluffSuccessRate,
        };
      }
      
      const winnerNameRound = roundWinner === 'player' ? 'JUGADOR' : roundWinner === 'ai' ? 'IA' : 'EMPATE';
      const roundMessageLog = [...trickMessageLog, `Ganador de la ronda: ${winnerNameRound}. Gana ${points} punto(s).`];
        
      return {
        ...state,
        playerHand: newPlayerHand,
        aiHand: newAiHand,
        playerTricks: newPlayerTricks,
        aiTricks: newAiTricks,
        trickWinners: newTrickWinners,
        playerScore: newPlayerScore,
        aiScore: newAiScore,
        gamePhase: 'round_end',
        currentTurn: 'player',
        messageLog: roundMessageLog,
        playedCards: newPlayedCards,
        opponentHandProbabilities: updatedProbs,
        // Update learning state
        opponentModel: newOpponentModel,
        aiCases: newAiCases,
        aiTrucoContext: null, // Reset context
        aiBlurb: null,
      };
    } else {
      const nextTurn = trickWinner === 'tie' ? state.mano : trickWinner;
      return {
        ...state,
        playerHand: newPlayerHand,
        aiHand: newAiHand,
        playerTricks: newPlayerTricks,
        aiTricks: newAiTricks,
        trickWinners: newTrickWinners,
        currentTurn: nextTurn,
        currentTrick: state.currentTrick + 1,
        gamePhase: `trick_${state.currentTrick + 2}` as GamePhase,
        messageLog: trickMessageLog,
        playedCards: newPlayedCards,
        opponentHandProbabilities: updatedProbs,
        aiBlurb: null,
      };
    }
}