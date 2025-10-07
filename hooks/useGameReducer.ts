// Fix: Moved the game reducer logic from the misnamed types.ts to its correct location here.
// This file now contains the full, correct reducer implementation for the game.
import { GameState, Action, ActionType, Player, GamePhase } from '../types';
import { createDeck, shuffleDeck, getEnvidoValue, determineTrickWinner, determineRoundWinner, getCardName } from '../services/trucoLogic';

export const initialState: GameState = {
  deck: [],
  playerHand: [],
  aiHand: [],
  initialPlayerHand: [],
  initialAiHand: [],
  playerTricks: [null, null, null],
  aiTricks: [null, null, null],
  trickWinners: [null, null, null],
  currentTrick: 0,
  playerScore: 0,
  aiScore: 0,
  round: 0,
  mano: 'player',
  currentTurn: 'player',
  gamePhase: 'initial',
  isThinking: false,
  winner: null,
  messageLog: ['Welcome to Truco AI!'],
  isDebugMode: false,
  aiReasoningLog: [{ round: 0, reasoning: 'AI is waiting for the game to start.' }],
  isLogExpanded: false,
  lastCaller: null,
  turnBeforeEnvido: null,
  hasEnvidoBeenCalledThisRound: false,
  envidoPointsOnOffer: 0,
  trucoLevel: 0,
  playerEnvidoFoldHistory: [],
};

export function useGameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case ActionType.TOGGLE_DEBUG_MODE:
      return { ...state, isDebugMode: !state.isDebugMode };
    
    case ActionType.ADD_AI_REASONING_LOG:
      return { ...state, aiReasoningLog: [...state.aiReasoningLog, action.payload] };

    case ActionType.TOGGLE_AI_LOG_EXPAND:
      return { ...state, isLogExpanded: !state.isLogExpanded };

    case ActionType.RESTART_GAME:
      return {
        ...initialState,
        mano: 'ai', // First game player is mano, next is AI
        currentTurn: 'ai',
        round: 0,
        messageLog: ['New Game Started! AI is mano.'],
        isDebugMode: state.isDebugMode, // Persist debug mode setting
        aiReasoningLog: [{ round: 0, reasoning: 'AI is waiting for the new round to start.' }],
        playerEnvidoFoldHistory: [], // Reset history on new game
      };

    case ActionType.START_NEW_ROUND: {
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

      return {
        ...state,
        deck: newDeck.slice(6),
        playerHand: newPlayerHand,
        aiHand: newAiHand,
        initialPlayerHand: [...newPlayerHand],
        initialAiHand: [...newAiHand],
        playerTricks: [null, null, null],
        aiTricks: [null, null, null],
        trickWinners: [null, null, null],
        currentTrick: 0,
        mano: newMano,
        currentTurn: newMano,
        gamePhase: 'trick_1',
        round: state.round + 1,
        messageLog: [`--- Round ${state.round + 1} ---`, `${newMano.toUpperCase()} is mano.`],
        turnBeforeEnvido: null,
        hasEnvidoBeenCalledThisRound: false,
        envidoPointsOnOffer: 0,
        trucoLevel: 0,
        lastCaller: null,
      };
    }
    
    case ActionType.PLAY_CARD: {
      const { player, cardIndex } = action.payload;
      const hand = player === 'player' ? state.playerHand : state.aiHand;
      
      if (cardIndex < 0 || cardIndex >= hand.length) {
          console.error("Attempted to play an invalid card index.", { player, cardIndex, hand });
          return state;
      }
      const cardPlayed = hand[cardIndex];
      
      const newPlayerHand = player === 'player' ? state.playerHand.filter((_, i) => i !== cardIndex) : state.playerHand;
      const newAiHand = player === 'ai' ? state.aiHand.filter((_, i) => i !== cardIndex) : state.aiHand;
      const newPlayerTricks = [...state.playerTricks];
      const newAiTricks = [...state.aiTricks];
      
      if (player === 'player') {
        newPlayerTricks[state.currentTrick] = cardPlayed;
      } else {
        newAiTricks[state.currentTrick] = cardPlayed;
      }
      
      const messageLog = [...state.messageLog, `${player.toUpperCase()} plays ${getCardName(cardPlayed)}`];
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
        };
      }

      const trickWinner = determineTrickWinner(newPlayerTricks[state.currentTrick]!, newAiTricks[state.currentTrick]!);
      const newTrickWinners = [...state.trickWinners];
      newTrickWinners[state.currentTrick] = trickWinner;
      
      const trickMessageLog = [...messageLog, `Trick ${state.currentTrick + 1} winner: ${trickWinner.toUpperCase()}`];
      const roundWinner = determineRoundWinner(newTrickWinners, state.mano);
      
      if (roundWinner) {
        const points = state.trucoLevel === 3 ? 4 : state.trucoLevel === 2 ? 3 : state.trucoLevel === 1 ? 2 : 1;
        let newPlayerScore = state.playerScore;
        let newAiScore = state.aiScore;
        
        if (roundWinner === 'player') newPlayerScore += points;
        else if (roundWinner === 'ai') newAiScore += points;
        
        const roundMessageLog = [...trickMessageLog, `Round winner: ${roundWinner.toUpperCase()}. Wins ${points} point(s).`];
        
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
        };
      }
    }
    
    // --- ENVIDO CALLS ---
    case ActionType.CALL_ENVIDO: {
      return { 
          ...state, 
          gamePhase: 'envido_called', 
          lastCaller: state.currentTurn, 
          currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
          turnBeforeEnvido: state.currentTurn,
          hasEnvidoBeenCalledThisRound: true,
          envidoPointsOnOffer: 2,
          messageLog: [...state.messageLog, `${state.currentTurn.toUpperCase()} calls ENVIDO!`],
        };
    }
    case ActionType.CALL_REAL_ENVIDO: {
      const isPlayerRespondingToAI = state.lastCaller === 'ai';
      const newFoldHistory = isPlayerRespondingToAI
          ? [...state.playerEnvidoFoldHistory, false]
          : state.playerEnvidoFoldHistory;
      return {
        ...state,
        gamePhase: 'envido_called',
        lastCaller: state.currentTurn,
        currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
        envidoPointsOnOffer: state.envidoPointsOnOffer + 3,
        messageLog: [...state.messageLog, `${state.currentTurn.toUpperCase()} escalates to REAL ENVIDO!`],
        playerEnvidoFoldHistory: newFoldHistory,
      };
    }
    case ActionType.CALL_FALTA_ENVIDO: {
        const isPlayerRespondingToAI = state.lastCaller === 'ai';
        const newFoldHistory = isPlayerRespondingToAI
            ? [...state.playerEnvidoFoldHistory, false]
            : state.playerEnvidoFoldHistory;
        const opponent = state.currentTurn === 'player' ? 'ai' : 'player';
        const opponentScore = opponent === 'player' ? state.playerScore : state.aiScore;
        const faltaPoints = 15 - opponentScore;
        return {
          ...state,
          gamePhase: 'envido_called',
          lastCaller: state.currentTurn,
          currentTurn: opponent,
          envidoPointsOnOffer: faltaPoints,
          messageLog: [...state.messageLog, `${state.currentTurn.toUpperCase()} calls FALTA ENVIDO!`],
          playerEnvidoFoldHistory: newFoldHistory,
        };
    }

    // --- TRUCO CALLS ---
    case ActionType.CALL_TRUCO: {
      return { 
          ...state, 
          gamePhase: 'truco_called', 
          lastCaller: state.currentTurn, 
          currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
          trucoLevel: 1,
          messageLog: [...state.messageLog, `${state.currentTurn.toUpperCase()} calls TRUCO!`],
        };
    }
    case ActionType.CALL_RETRUCO: {
       return { 
          ...state, 
          gamePhase: 'retruco_called', 
          lastCaller: state.currentTurn, 
          currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
          trucoLevel: 2,
          messageLog: [...state.messageLog, `${state.currentTurn.toUpperCase()} calls RETRUCO!`],
        };
    }
    case ActionType.CALL_VALE_CUATRO: {
       return { 
          ...state, 
          gamePhase: 'vale_cuatro_called', 
          lastCaller: state.currentTurn, 
          currentTurn: state.currentTurn === 'player' ? 'ai' : 'player',
          trucoLevel: 3,
          messageLog: [...state.messageLog, `${state.currentTurn.toUpperCase()} calls VALE CUATRO!`],
        };
    }
    
    // --- RESPONSES ---
    case ActionType.ACCEPT: {
        const messageLog = [...state.messageLog, `${state.currentTurn.toUpperCase()} accepts!`];

        if (state.gamePhase.includes('envido')) {
            const isPlayerRespondingToAI = state.lastCaller === 'ai';
            const newFoldHistory = isPlayerRespondingToAI
                ? [...state.playerEnvidoFoldHistory, false]
                : state.playerEnvidoFoldHistory;

            const playerEnvido = getEnvidoValue(state.initialPlayerHand);
            const aiEnvido = getEnvidoValue(state.initialAiHand);
            let envidoMessage = `Player has ${playerEnvido}. AI has ${aiEnvido}.`;

            let winner: Player | 'tie' = 'tie';
            if (playerEnvido > aiEnvido) winner = 'player';
            else if (aiEnvido > playerEnvido) winner = 'ai';
            else winner = state.mano;

            let newPlayerScore = state.playerScore;
            let newAiScore = state.aiScore;

            if (winner === 'player') {
                newPlayerScore += state.envidoPointsOnOffer;
                envidoMessage += ` Player wins ${state.envidoPointsOnOffer} points.`;
            } else {
                newAiScore += state.envidoPointsOnOffer;
                envidoMessage += ` AI wins ${state.envidoPointsOnOffer} points.`;
            }
            // IMPORTANT: After envido, return to trick play
            return {
                ...state,
                playerScore: newPlayerScore,
                aiScore: newAiScore,
                gamePhase: `trick_${state.currentTrick + 1}` as GamePhase,
                currentTurn: state.turnBeforeEnvido!, // Restore turn
                turnBeforeEnvido: null,
                messageLog: [...messageLog, envidoMessage],
                playerEnvidoFoldHistory: newFoldHistory,
            };
        }
        
        if (state.gamePhase.includes('truco')) {
            // Game continues, the turn goes to the player who accepted.
            return {
                ...state,
                gamePhase: `trick_${state.currentTrick + 1}` as GamePhase,
                messageLog,
            };
        }
        return state;
    }

    case ActionType.DECLINE: {
        const caller = state.lastCaller!;
        const messageLog = [...state.messageLog, `${state.currentTurn.toUpperCase()} declines!`];

        if (state.gamePhase.includes('envido')) {
            const isPlayerRespondingToAI = state.lastCaller === 'ai';
            const newFoldHistory = isPlayerRespondingToAI
                ? [...state.playerEnvidoFoldHistory, true]
                : state.playerEnvidoFoldHistory;

            // Declining envido gives 1 point to caller and play continues.
            const points = state.envidoPointsOnOffer > 2 ? state.envidoPointsOnOffer - 2 : 1; // Simplified: 1 point for any decline
            return {
                ...state,
                playerScore: caller === 'player' ? state.playerScore + 1 : state.playerScore,
                aiScore: caller === 'ai' ? state.aiScore + 1 : state.aiScore,
                gamePhase: `trick_${state.currentTrick + 1}` as GamePhase,
                currentTurn: state.turnBeforeEnvido!, // Restore turn
                turnBeforeEnvido: null,
                messageLog: [...messageLog, `${caller.toUpperCase()} wins 1 point.`],
                playerEnvidoFoldHistory: newFoldHistory,
            };
        }

        if (state.gamePhase.includes('truco')) {
            // Declining truco ends the round.
            const points = state.trucoLevel > 0 ? state.trucoLevel : 1;
            return {
                ...state,
                playerScore: caller === 'player' ? state.playerScore + points : state.playerScore,
                aiScore: caller === 'ai' ? state.aiScore + points : state.aiScore,
                messageLog: [...messageLog, `${caller.toUpperCase()} wins ${points} point(s).`],
                gamePhase: 'round_end',
                currentTurn: 'player', // Hand control to player for next round button
            }
        }
        return state;
    }
    
    case ActionType.AI_THINKING:
        return { ...state, isThinking: action.payload };
    
    case ActionType.ADD_MESSAGE:
        return { ...state, messageLog: [...state.messageLog, action.payload] };

    default:
      return state;
  }
}