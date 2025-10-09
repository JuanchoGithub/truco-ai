import { GameState, Action, ActionType, GamePhase, Case, OpponentModel, PlayerEnvidoActionEntry, PlayerPlayOrderEntry, RoundSummary, Card } from '../../types';
import { createDeck, shuffleDeck, determineTrickWinner, determineRoundWinner, getCardName, hasFlor, getEnvidoValue, getCardHierarchy, calculateHandStrength, getCardCode, decodeCardFromCode } from '../../services/trucoLogic';
import { initializeProbabilities, updateProbsOnPlay } from '../../services/ai/inferenceService';
import { getRandomPhrase, TRICK_LOSE_PHRASES, TRICK_WIN_PHRASES } from '../../services/ai/phrases';
import { getCardCategory } from '../../services/cardAnalysis';

function updateOpponentModelFromHistory(state: GameState): OpponentModel {
    const newModel = JSON.parse(JSON.stringify(state.opponentModel)); // Deep copy to avoid mutation
    const DECAY = 0.95; // Give more weight to recent actions

    // 1. Analyze Envido History
    const envidoResponses = state.playerEnvidoHistory.filter(e => e.action === 'folded' || e.action === 'accepted' || e.action.startsWith('escalated'));
    if (envidoResponses.length > 0) {
        const folds = envidoResponses.filter(e => e.action === 'folded').length;
        const escalations = envidoResponses.filter(e => e.action.startsWith('escalated')).length;
        newModel.envidoBehavior.foldRate = newModel.envidoBehavior.foldRate * DECAY + (1 - DECAY) * (folds / envidoResponses.length);
        newModel.envidoBehavior.escalationRate = newModel.envidoBehavior.escalationRate * DECAY + (1 - DECAY) * (escalations / envidoResponses.length);
    }
    
    const envidoCalls = state.playerEnvidoHistory.filter(e => e.action === 'called' || e.action.startsWith('escalated'));
    if (envidoCalls.length > 2) {
        const totalPoints = envidoCalls.reduce((sum, e) => sum + e.envidoPoints, 0);
        const newThreshold = totalPoints / envidoCalls.length;
        newModel.envidoBehavior.callThreshold = newModel.envidoBehavior.callThreshold * DECAY + (1 - DECAY) * newThreshold;
    }

    // 2. Analyze Play Style History
    const manoTrick1Leads = state.playerPlayOrderHistory.filter(p => p.wasLeadingTrick && p.trick === 0 && state.mano === 'player');
    if (manoTrick1Leads.length > 2) {
        let ledWithHighestCount = 0;
        let baitAttempts = 0;
        for (const play of manoTrick1Leads) {
            const handBeforePlay_decoded = play.handBeforePlay.map(decodeCardFromCode);
            const playedCard_decoded = decodeCardFromCode(play.playedCard);
            
            const sortedHand = [...handBeforePlay_decoded].sort((a,b) => getCardHierarchy(b) - getCardHierarchy(a));
            const highestCard = sortedHand[0];
            const lowestCard = sortedHand[sortedHand.length - 1];
            
            if (highestCard.rank === playedCard_decoded.rank && highestCard.suit === playedCard_decoded.suit) {
                ledWithHighestCount++;
            }
            // Define baiting as: having a strong hand overall but leading with the weakest card
            if (calculateHandStrength(handBeforePlay_decoded) > 20 && lowestCard.rank === playedCard_decoded.rank && lowestCard.suit === playedCard_decoded.suit) {
                baitAttempts++;
            }
        }
        const newLeadRate = ledWithHighestCount / manoTrick1Leads.length;
        const newBaitRate = baitAttempts / manoTrick1Leads.length;
        newModel.playStyle.leadWithHighestRate = newModel.playStyle.leadWithHighestRate * DECAY + (1 - DECAY) * newLeadRate;
        newModel.playStyle.baitRate = newModel.playStyle.baitRate * DECAY + (1 - DECAY) * newBaitRate;
    }
    
    // 3. Analyze Truco Bluffing History
    let successfulBluffs = 0;
    let attemptedBluffs = 0;
    state.roundHistory.forEach(round => {
        // A round must be complete to judge success
        if (round.playerTrucoCall?.isBluff && round.roundWinner !== null) {
            attemptedBluffs++;
            // Player wins the round (via points or opponent folding)
            if (round.roundWinner === 'player') {
                successfulBluffs++;
            }
        }
    });
    newModel.trucoBluffs = { attempts: attemptedBluffs, successes: successfulBluffs };

    return newModel;
}

export function handleRestartGame(initialState: GameState, state: GameState): GameState {
  // Create a clean slate for the new game, but persist the AI's learning data
  // and user settings from the previous game.
  
  const newMano = state.mano === 'player' ? 'ai' : 'player'; // Alternate who is 'mano'

  const resetState: GameState = {
    ...initialState, // Use initialState to reset most fields to default
    
    // Explicitly carry over all learning and historical data
    opponentModel: state.opponentModel,
    aiCases: state.aiCases,
    playerEnvidoFoldHistory: state.playerEnvidoFoldHistory,
    playerTrucoCallHistory: state.playerTrucoCallHistory,
    playerEnvidoHistory: state.playerEnvidoHistory,
    playerPlayOrderHistory: state.playerPlayOrderHistory,
    playerCardPlayStats: state.playerCardPlayStats,
    roundHistory: state.roundHistory,
    
    // Preserve user settings like debug mode
    isDebugMode: state.isDebugMode,

    // Explicitly define the starting state for the new game
    playerScore: 0,
    aiScore: 0,
    round: 0, // handleStartNewRound will increment this to 1
    mano: newMano,
    currentTurn: newMano,
    winner: null,
    messageLog: [...state.messageLog, `--- Nuevo Juego ---`, `Un nuevo juego ha comenzado. ${newMano === 'player' ? 'Eres' : 'La IA es'} mano.`],
    aiReasoningLog: [{ round: 0, reasoning: 'La IA se está preparando para la nueva partida.' }],
  };

  // By calling handleStartNewRound immediately, we ensure a seamless transition
  // into the new game without getting stuck in an intermediate state, and we
  // guarantee that the preserved historical data is correctly used.
  return handleStartNewRound(resetState, { type: ActionType.START_NEW_ROUND });
}

export function handleStartNewRound(state: GameState, action: { type: ActionType.START_NEW_ROUND }): GameState {
  if (state.playerScore >= 15 || state.aiScore >= 15) {
    return { 
      ...state, 
      winner: state.playerScore >= 15 ? 'player' : 'ai', 
      gamePhase: 'game_over' 
    };
  }

  // Update opponent model with data from the completed round
  const updatedOpponentModel = state.round > 0 ? updateOpponentModelFromHistory(state) : state.opponentModel;
  
  // Alternate mano each round. For the very first round (round 0), mano is set by initialState or restartGame.
  const newMano = state.round === 0 ? state.mano : (state.mano === 'player' ? 'ai' : 'player');
  const newDeck = shuffleDeck(createDeck());
  const newPlayerHand = newDeck.slice(0, 3);
  const newAiHand = newDeck.slice(3, 6);
  const playerHasFlor = hasFlor(newPlayerHand);
  const aiHasFlor = hasFlor(newAiHand);
  const playerEnvidoPoints = getEnvidoValue(newPlayerHand);
  const aiEnvidoPoints = getEnvidoValue(newAiHand);

  // Initialize opponent hand probabilities
  const opponentUnseenCards = [...newDeck.slice(6), ...newPlayerHand];
  const initialProbs = initializeProbabilities(opponentUnseenCards);

  // Initialize the summary for the new round
  const newRoundSummary: RoundSummary = {
      round: state.round + 1,
      playerInitialHand: newPlayerHand.map(getCardCode),
      aiInitialHand: newAiHand.map(getCardCode),
      playerHandStrength: calculateHandStrength(newPlayerHand),
      aiHandStrength: calculateHandStrength(newAiHand),
      playerEnvidoPoints,
      aiEnvidoPoints,
      calls: [],
      playerTricks: [null, null, null],
      aiTricks: [null, null, null],
      trickWinners: [null, null, null],
      roundWinner: null,
      pointsAwarded: { player: 0; ai: 0 },
      playerTrucoCall: null,
  };
  
  const initialMessage = state.round === 0 
    ? state.messageLog // Use the message from handleRestartGame
    : [...state.messageLog, `--- Ronda ${state.round + 1} ---`, `${newMano === 'player' ? 'Eres' : 'La IA es'} mano.`];


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
    opponentModel: updatedOpponentModel,
    messageLog: initialMessage,
    turnBeforeInterrupt: null,
    pendingTrucoCaller: null,
    hasEnvidoBeenCalledThisRound: false,
    hasRealEnvidoBeenCalledThisSequence: false,
    hasFlorBeenCalledThisRound: false,
    envidoPointsOnOffer: 0,
    previousEnvidoPoints: 0,
    florPointsOnOffer: 0,
    trucoLevel: 0,
    lastCaller: null,
    playerCalledHighEnvido: false,
    playedCards: [],
    // Reset modeling state
    opponentHandProbabilities: initialProbs,
    playerEnvidoValue: null,
    aiEnvidoValue: null,
    playerActionHistory: [],
    aiBlurb: null,
    playerBlurb: null,
    lastRoundWinner: null,
    roundHistory: [...state.roundHistory, newRoundSummary],
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
    let newState = { ...state };

    // --- New Behavior Logging ---
    if (player === 'player') {
        const wasLeadingTrick = state.aiTricks[state.currentTrick] === null;
        const playOrderEntry: PlayerPlayOrderEntry = {
            round: state.round,
            trick: state.currentTrick,
            handBeforePlay: state.playerHand.map(getCardCode),
            playedCard: getCardCode(cardPlayed),
            wasLeadingTrick: wasLeadingTrick,
        };
        const newPlayOrderHistory = [...state.playerPlayOrderHistory, playOrderEntry];
        
        // Update Card Play Statistics
        const cardCategory = getCardCategory(cardPlayed);
        let newPlayerCardPlayStats = state.playerCardPlayStats;
        if (cardCategory) {
            newPlayerCardPlayStats = JSON.parse(JSON.stringify(state.playerCardPlayStats)); // Deep copy
            const stats = newPlayerCardPlayStats[cardCategory];
            stats.plays += 1;
            stats.byTrick[state.currentTrick] += 1;
            if (wasLeadingTrick) {
                stats.asLead += 1;
            } else {
                stats.asResponse += 1;
            }
        }

        // If this is the player's first card, it's their last chance to call Envido.
        // We log their choice not to.
        const envidoWasPossible = state.currentTrick === 0 && !state.hasEnvidoBeenCalledThisRound && !state.playerHasFlor && !state.aiHasFlor;
        let newEnvidoHistory = state.playerEnvidoHistory;
        if (envidoWasPossible) {
            const didNotCallEntry: PlayerEnvidoActionEntry = {
                round: state.round,
                envidoPoints: getEnvidoValue(state.initialPlayerHand),
                action: 'did_not_call',
                wasMano: state.mano === 'player',
            };
            newEnvidoHistory = [...state.playerEnvidoHistory, didNotCallEntry];
        }

        newState = { 
            ...newState, 
            playerPlayOrderHistory: newPlayOrderHistory,
            playerCardPlayStats: newPlayerCardPlayStats,
            playerEnvidoHistory: newEnvidoHistory,
            // Playing a card means the envido window for this trick is closed.
            // This is a failsafe to ensure we don't log 'did_not_call' multiple times.
            hasEnvidoBeenCalledThisRound: state.hasEnvidoBeenCalledThisRound || envidoWasPossible,
        };
    }
    // --- End Behavior Logging ---

    const newPlayedCards = [...newState.playedCards, cardPlayed];
    const newPlayerHand = player === 'player' ? newState.playerHand.filter((_, i) => i !== cardIndex) : newState.playerHand;
    const newAiHand = player === 'ai' ? newState.aiHand.filter((_, i) => i !== cardIndex) : newState.aiHand;
    const newPlayerTricks = [...newState.playerTricks];
    const newAiTricks = [...newState.aiTricks];
      
    if (player === 'player') {
      newPlayerTricks[newState.currentTrick] = cardPlayed;
    } else {
      newAiTricks[newState.currentTrick] = cardPlayed;
    }

    // Update opponent model if player played a card
    let updatedProbs = newState.opponentHandProbabilities;
    if (player === 'player' && updatedProbs) {
      updatedProbs = updateProbsOnPlay(updatedProbs, cardPlayed, newPlayerHand.length);
    }
      
    const messageLog = [...newState.messageLog, `${player === 'player' ? 'Jugador' : 'IA'} juega ${getCardName(cardPlayed)}`];
    const isTrickComplete = newPlayerTricks[newState.currentTrick] !== null && newAiTricks[newState.currentTrick] !== null;

    if (!isTrickComplete) {
      const nextTurn = player === 'player' ? 'ai' : 'player';
      return {
        ...newState,
        playerHand: newPlayerHand,
        aiHand: newAiHand,
        playerTricks: newPlayerTricks,
        aiTricks: newAiTricks,
        currentTurn: nextTurn,
        messageLog: messageLog,
        playedCards: newPlayedCards,
        opponentHandProbabilities: updatedProbs,
        aiBlurb: null,
        playerBlurb: null,
        lastRoundWinner: null, // Clear winner on new card play
        isThinking: player === 'ai' ? false : newState.isThinking,
      };
    }

    const trickWinner = determineTrickWinner(newPlayerTricks[newState.currentTrick]!, newAiTricks[newState.currentTrick]!);
    const newTrickWinners = [...newState.trickWinners];
    newTrickWinners[newState.currentTrick] = trickWinner;
    
    // Update player card stats with win/loss
    if (player === 'player') {
        const cardCategory = getCardCategory(cardPlayed);
        if (cardCategory && trickWinner === 'player') {
            newState.playerCardPlayStats[cardCategory].wins += 1;
        }
    }
    
    const winnerNameTrick = trickWinner === 'player' ? 'JUGADOR' : trickWinner === 'ai' ? 'IA' : 'EMPATE';
    const trickMessageLog = [...messageLog, `Ganador de la mano ${newState.currentTrick + 1}: ${winnerNameTrick}`];
    
    let trickOutcomeBlurb = null;
    if (Math.random() < 0.4) { // 40% chance to say something
        if (trickWinner === 'ai') {
            trickOutcomeBlurb = { text: getRandomPhrase(TRICK_WIN_PHRASES), isVisible: true };
        } else if (trickWinner === 'player') {
            trickOutcomeBlurb = { text: getRandomPhrase(TRICK_LOSE_PHRASES), isVisible: true };
        }
    }
    
    const roundWinner = determineRoundWinner(newTrickWinners, newState.mano);
      
    if (roundWinner) {
      const trucoPointMapping = [1, 2, 3, 4];
      const points = trucoPointMapping[newState.trucoLevel];
        
      let newPlayerScore = newState.playerScore;
      let newAiScore = newState.aiScore;
        
      if (roundWinner === 'player') newPlayerScore += points;
      else if (roundWinner === 'ai') newAiScore += points;
      
      let newOpponentModel = newState.opponentModel;
      let newAiCases = newState.aiCases;
      
      if (newState.aiTrucoContext) {
        const outcome = roundWinner === 'ai' ? 'win' : 'loss';
        const newCase: Case = {
            ...newState.aiTrucoContext,
            outcome,
            opponentFoldRateAtTimeOfCall: newState.opponentModel.trucoFoldRate,
        };
        newAiCases = [...newState.aiCases, newCase];

        const decay = 0.9;
        // FIX: Corrected typo from `trucoFoldrate` to `trucoFoldRate`.
        const newFoldRate = newState.opponentModel.trucoFoldRate * decay;
        
        let newBluffSuccessRate = newState.opponentModel.bluffSuccessRate;
        if (newState.aiTrucoContext.isBluff) {
            const bluffReward = roundWinner === 'ai' ? 1 : 0; // 1 if AI wins (bluff "succeeds")
            newBluffSuccessRate = newState.opponentModel.bluffSuccessRate * decay + (1 - decay) * bluffReward;
        }

        newOpponentModel = {
            ...newOpponentModel,
            trucoFoldRate: Math.max(0.05, newFoldRate),
            bluffSuccessRate: newBluffSuccessRate,
        };
      }
      
      const winnerNameRound = roundWinner === 'player' ? 'JUGADOR' : roundWinner === 'ai' ? 'IA' : 'EMPATE';
      const roundMessageLog = [...trickMessageLog, `Ganador de la ronda: ${winnerNameRound}. Gana ${points} ${points === 1 ? 'punto' : 'puntos'}.`];
      
      // Finalize the round history
      const newRoundHistory = [...newState.roundHistory];
      const currentRoundSummary = newRoundHistory.find(r => r.round === newState.round);
      if (currentRoundSummary) {
          currentRoundSummary.trickWinners = newTrickWinners;
          currentRoundSummary.roundWinner = roundWinner;
          if (roundWinner === 'player') currentRoundSummary.pointsAwarded.player += points;
          if (roundWinner === 'ai') currentRoundSummary.pointsAwarded.ai += points;
          currentRoundSummary.playerTricks = newPlayerTricks.map(c => c ? getCardCode(c) : null);
          currentRoundSummary.aiTricks = newAiTricks.map(c => c ? getCardCode(c) : null);
      }
        
      return {
        ...newState,
        playerHand: newPlayerHand,
        aiHand: newAiHand,
        playerTricks: newPlayerTricks,
        aiTricks: newAiTricks,
        trickWinners: newTrickWinners,
        playerScore: newPlayerScore,
        aiScore: newAiScore,
        messageLog: roundMessageLog,
        playedCards: newPlayedCards,
        opponentHandProbabilities: updatedProbs,
        opponentModel: newOpponentModel,
        aiCases: newAiCases,
        aiTrucoContext: null,
        lastRoundWinner: roundWinner,
        aiBlurb: trickOutcomeBlurb,
        playerBlurb: null,
        isThinking: player === 'ai' ? false : newState.isThinking,
        gamePhase: 'round_end',
        currentTurn: null,
        roundHistory: newRoundHistory,
      };

    } else {
      const nextTurn = trickWinner === 'tie' ? newState.mano : trickWinner;
      return {
        ...newState,
        playerHand: newPlayerHand,
        aiHand: newAiHand,
        playerTricks: newPlayerTricks,
        aiTricks: newAiTricks,
        trickWinners: newTrickWinners,
        currentTurn: nextTurn,
        currentTrick: newState.currentTrick + 1,
        gamePhase: `trick_${newState.currentTrick + 2}` as GamePhase,
        messageLog: trickMessageLog,
        playedCards: newPlayedCards,
        // Fix: Corrected typo from 'updatedProps' to 'updatedProbs'.
        opponentHandProbabilities: updatedProbs,
        aiBlurb: trickOutcomeBlurb,
        playerBlurb: null,
        lastRoundWinner: null, // Clear winner on new card play
        isThinking: player === 'ai' ? false : newState.isThinking,
      };
    }
}