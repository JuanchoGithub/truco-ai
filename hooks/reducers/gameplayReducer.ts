import { GameState, Action, ActionType, GamePhase, Case, OpponentModel, PlayerEnvidoActionEntry, PlayerPlayOrderEntry, RoundSummary, Card, PointNote, MessageObject } from '../../types';
import { createDeck, shuffleDeck, determineTrickWinner, determineRoundWinner, getCardName, hasFlor, getEnvidoValue, getCardHierarchy, calculateHandStrength, getCardCode, decodeCardFromCode } from '../../services/trucoLogic';
import { initializeProbabilities, updateProbsOnPlay } from '../../services/ai/inferenceService';
import { getRandomPhrase, PHRASE_KEYS } from '../../services/ai/phrases';
import { getCardCategory } from '../../services/cardAnalysis';

function updateOpponentModelFromHistory(state: GameState): OpponentModel {
    const newModel = JSON.parse(JSON.stringify(state.opponentModel)); // Deep copy to avoid mutation
    const DECAY = 0.95; // Give more weight to recent actions

    // 1. Analyze Envido History with context
    const envidoActions = state.playerEnvidoHistory;
    if (envidoActions.length > 2) {
        const manoActions = envidoActions.filter(e => e.wasMano);
        const pieActions = envidoActions.filter(e => !e.wasMano);

        const updateContext = (actions: PlayerEnvidoActionEntry[], context: 'mano' | 'pie') => {
            if (actions.length < 2) return;
            const responses = actions.filter(e => e.action === 'folded' || e.action === 'accepted' || e.action.startsWith('escalated'));
            if (responses.length > 0) {
                const folds = responses.filter(e => e.action === 'folded').length;
                const escalations = responses.filter(e => e.action.startsWith('escalated')).length;
                newModel.envidoBehavior[context].foldRate = newModel.envidoBehavior[context].foldRate * DECAY + (1 - DECAY) * (folds / responses.length);
                newModel.envidoBehavior[context].escalationRate = newModel.envidoBehavior[context].escalationRate * DECAY + (1 - DECAY) * (escalations / responses.length);
            }
            const calls = actions.filter(e => e.action === 'called' || e.action.startsWith('escalated'));
            if (calls.length > 1) {
                const totalPoints = calls.reduce((sum, e) => sum + e.envidoPoints, 0);
                const newThreshold = totalPoints / calls.length;
                newModel.envidoBehavior[context].callThreshold = newModel.envidoBehavior[context].callThreshold * DECAY + (1 - DECAY) * newThreshold;
            }
        };

        updateContext(manoActions, 'mano');
        updateContext(pieActions, 'pie');
    }

    // 2. Analyze Truco Fold Rate
    const trucoFolds = state.playerTrucoFoldHistory;
    if (trucoFolds.length > 2) { // Need some data to start learning
        const folds = trucoFolds.filter(didFold => didFold).length;
        const newFoldRate = folds / trucoFolds.length;
        newModel.trucoFoldRate = newModel.trucoFoldRate * DECAY + (1 - DECAY) * newFoldRate;
    }
    
    // 3. Analyze Play Style History (Remains as is, as it's already contextual)
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
            if (calculateHandStrength(handBeforePlay_decoded) > 20 && lowestCard.rank === playedCard_decoded.rank && lowestCard.suit === playedCard_decoded.suit) {
                baitAttempts++;
            }
        }
        const newLeadRate = ledWithHighestCount / manoTrick1Leads.length;
        const newBaitRate = baitAttempts / manoTrick1Leads.length;
        newModel.playStyle.leadWithHighestRate = newModel.playStyle.leadWithHighestRate * DECAY + (1 - DECAY) * newLeadRate;
        newModel.playStyle.baitRate = newModel.playStyle.baitRate * DECAY + (1 - DECAY) * newBaitRate;
    }
    
    // 4. Analyze Truco Bluffing History with context
    const manoBluffs = { attempts: 0, successes: 0 };
    const pieBluffs = { attempts: 0, successes: 0 };

    state.roundHistory.forEach(round => {
        if (round.playerTrucoCall?.isBluff && round.roundWinner !== null) {
            const context = round.mano === 'player' ? 'mano' : 'pie';
            if (context === 'mano') {
                manoBluffs.attempts++;
                if (round.roundWinner === 'player') manoBluffs.successes++;
            } else {
                pieBluffs.attempts++;
                if (round.roundWinner === 'player') pieBluffs.successes++;
            }
        }
    });

    newModel.trucoBluffs.mano = { attempts: manoBluffs.attempts, successes: manoBluffs.successes };
    newModel.trucoBluffs.pie = { attempts: pieBluffs.attempts, successes: pieBluffs.successes };
    
    // 5. Analyze "Envido Primero" Rate
    if (state.envidoPrimeroOpportunities > 2) { // Only update if we have enough data points
        const newRate = state.envidoPrimeroCalls / state.envidoPrimeroOpportunities;
        newModel.playStyle.envidoPrimeroRate = newModel.playStyle.envidoPrimeroRate * DECAY + (1 - DECAY) * newRate;
    }

    // 6. NEW: Analyze Counter Tendency
    const trickResponses = state.playerPlayOrderHistory.filter(p => !p.wasLeadingTrick && p.trick < 2);
    if (trickResponses.length > 3) {
        let counterAttempts = 0;
        let counterSuccesses = 0;
        for (const response of trickResponses) {
            const aiCardPlayedCode = state.roundHistory
                .find(r => r.round === response.round)?.aiTricks[response.trick];
            if (aiCardPlayedCode) {
                const aiCard = decodeCardFromCode(aiCardPlayedCode);
                // If AI led with a reasonably strong card (hierarchy >= 10)
                if (getCardHierarchy(aiCard) >= 10) {
                    counterAttempts++;
                    const playerCard = decodeCardFromCode(response.playedCard);
                    if (getCardHierarchy(playerCard) > getCardHierarchy(aiCard)) {
                        counterSuccesses++;
                    }
                }
            }
        }
        if (counterAttempts > 2) {
            const newCounterTendency = counterSuccesses / counterAttempts;
            newModel.playStyle.counterTendency = newModel.playStyle.counterTendency * DECAY + (1 - DECAY) * newCounterTendency;
        }
    }

    // 7. NEW: Analyze Chain Bluff Rate
    const trucoCallsInHistory = state.roundHistory.filter(r => r.playerTrucoCall !== null);
    if (trucoCallsInHistory.length > 3) {
        let chainBluffAttempts = 0;
        let chainBluffs = 0;
        for (const round of trucoCallsInHistory) {
            const firstPlay = state.playerPlayOrderHistory.find(p => p.round === round.round && p.trick === 0 && p.wasLeadingTrick);
            if (firstPlay) {
                chainBluffAttempts++;
                const playedCard = decodeCardFromCode(firstPlay.playedCard);
                // A "weak lead" is a card with hierarchy < 8 (weaker than false aces) coupled with a bluff call
                if (round.playerTrucoCall!.isBluff && getCardHierarchy(playedCard) < 8) {
                    chainBluffs++;
                }
            }
        }
        if (chainBluffAttempts > 2) {
            const newChainBluffRate = chainBluffs / chainBluffAttempts;
            newModel.playStyle.chainBluffRate = newModel.playStyle.chainBluffRate * DECAY + (1 - DECAY) * newChainBluffRate;
        }
    }

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
    playerTrucoFoldHistory: state.playerTrucoFoldHistory,
    playerEnvidoHistory: state.playerEnvidoHistory,
    playerPlayOrderHistory: state.playerPlayOrderHistory,
    playerCardPlayStats: state.playerCardPlayStats,
    roundHistory: [], // Reset round history for a new game
    envidoPrimeroOpportunities: state.envidoPrimeroOpportunities,
    envidoPrimeroCalls: state.envidoPrimeroCalls,
    
    // Preserve user settings like debug mode
    isDebugMode: state.isDebugMode,

    // Explicitly define the starting state for the new game
    playerScore: 0,
    aiScore: 0,
    round: 0, // handleStartNewRound will increment this to 1
    mano: newMano,
    currentTurn: newMano,
    winner: null,
    messageLog: [...state.messageLog, { key: 'game.new_game_log', type: 'round_separator' }, { key: 'game.new_game_started', options: { player: newMano } }],
    aiReasoningLog: [{ round: 0, reasoning: [{ key: 'ai_logic.initial_state' }] }],
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
      mano: newMano,
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
      pointsAwarded: {
          player: 0,
          ai: 0,
          by: {
              flor: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } },
              envido: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } },
              truco: { player: 0, ai: 0, note: { key: 'gameBoard.note_truco_simple' } },
          }
      },
      playerTrucoCall: null,
  };
  
  const manoMessageKey = newMano === 'player' ? 'game.you_are_mano' : 'game.ai_is_mano';
  const initialMessage = state.round === 0 
    ? state.messageLog // Use the message from handleRestartGame
    : [...state.messageLog, { key: 'game.new_round_log', type: 'round_separator', options: { round: state.round + 1 } }, { key: manoMessageKey }];


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
    hasFaltaEnvidoBeenCalledThisSequence: false,
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
    aiDecisionContext: null, // Clear decision context for new round
    aiBlurb: null,
    playerBlurb: null,
    lastRoundWinner: null,
    centralMessage: null,
    isCentralMessagePersistent: false,
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

        // If this is the player's turn in the first trick and they haven't called envido, log 'did_not_call'.
        // This only happens once per round when the opportunity first arises.
        const envidoWasPossible = state.currentTrick === 0 && !state.hasEnvidoBeenCalledThisRound && !state.playerHasFlor && !state.aiHasFlor;
        const hasAlreadyLoggedEnvidoAction = state.playerEnvidoHistory.some(e => e.round === state.round);

        let newEnvidoHistory = state.playerEnvidoHistory;
        if (envidoWasPossible && !hasAlreadyLoggedEnvidoAction) {
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
      
    const messageLog: (string | MessageObject)[] = [...newState.messageLog, { key: 'game.player_plays_card', options: { player, cardName: getCardName(cardPlayed) } }];
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

    // FIX: Only close the Envido window after the first trick is *complete*.
    const updatedHasEnvidoBeenCalled = state.currentTrick === 0 ? true : state.hasEnvidoBeenCalledThisRound;
    
    // Update player card stats with win/loss
    if (player === 'player') {
        const cardCategory = getCardCategory(cardPlayed);
        if (cardCategory && trickWinner === 'player') {
            newState.playerCardPlayStats[cardCategory].wins += 1;
        }
    }
    
    const trickMessageLog = [...messageLog, { key: 'game.trick_winner', options: { trickNumber: newState.currentTrick + 1, winner: trickWinner } }];
    
    let trickOutcomeBlurb: { titleKey: string; text: string; isVisible: boolean; } | null = null;
    if (Math.random() < 0.4) { // 40% chance to say something
        if (trickWinner === 'ai') {
            trickOutcomeBlurb = { titleKey: 'blurb_titles.trick_result', text: getRandomPhrase(PHRASE_KEYS.TRICK_WIN), isVisible: true };
        } else if (trickWinner === 'player') {
            trickOutcomeBlurb = { titleKey: 'blurb_titles.trick_result', text: getRandomPhrase(PHRASE_KEYS.TRICK_LOSE), isVisible: true };
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
      
      let newAiCases = newState.aiCases;
      
      if (newState.aiDecisionContext) {
        const outcome = roundWinner === 'ai' ? 'win' : 'loss';
        const { deceptionType } = newState.aiDecisionContext;

        // Simplified Active Learning: only retain deceptive plays or a small fraction of normal plays.
        if (deceptionType !== 'none' || Math.random() < 0.1) {
            const newCase: Case = {
                ...newState.aiDecisionContext,
                outcome,
            };
            newAiCases = [...newState.aiCases, newCase];
        }
      }
      
      const roundMessageLog = [...trickMessageLog, { key: 'game.round_winner_points', options: { winner: roundWinner, points } }];
      
      // Finalize the round history
      const newRoundHistory = [...newState.roundHistory];
      const currentRoundSummary = newRoundHistory.find(r => r.round === newState.round);
      if (currentRoundSummary) {
          if (!currentRoundSummary.pointsAwarded.by) {
            currentRoundSummary.pointsAwarded.by = { flor: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } }, envido: { player: 0, ai: 0, note: { key: 'gameBoard.note_not_called' } }, truco: { player: 0, ai: 0, note: { key: 'gameBoard.note_truco_simple' } } };
          }
          currentRoundSummary.trickWinners = newTrickWinners;
          currentRoundSummary.roundWinner = roundWinner;
          if (roundWinner === 'player') {
              currentRoundSummary.pointsAwarded.player += points;
              currentRoundSummary.pointsAwarded.by.truco.player = points;
          }
          if (roundWinner === 'ai') {
              currentRoundSummary.pointsAwarded.ai += points;
              currentRoundSummary.pointsAwarded.by.truco.ai = points;
          }
          const trucoLevelKeys = ["gameBoard.note_truco_simple", "gameBoard.note_truco_truco", "gameBoard.note_truco_retruco", "gameBoard.note_truco_vale_cuatro"];
          currentRoundSummary.pointsAwarded.by.truco.note = { key: trucoLevelKeys[newState.trucoLevel] };
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
        aiCases: newAiCases,
        aiDecisionContext: null,
        lastRoundWinner: roundWinner,
        aiBlurb: trickOutcomeBlurb,
        playerBlurb: null,
        isThinking: player === 'ai' ? false : newState.isThinking,
        gamePhase: 'round_end',
        currentTurn: null,
        roundHistory: newRoundHistory,
        hasEnvidoBeenCalledThisRound: updatedHasEnvidoBeenCalled,
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
        hasEnvidoBeenCalledThisRound: updatedHasEnvidoBeenCalled,
      };
    }
}