

import React, { useReducer, useEffect, useState, useRef } from 'react';
import { useGameReducer, initialState } from './hooks/useGameReducer';
import { getLocalAIMove } from './services/localAiService';
import { ActionType, Action, GameState, AiMove } from './types';
import Scoreboard from './components/Scoreboard';
import GameBoard from './components/GameBoard';
import PlayerHand from './components/PlayerHand';
import ActionBar from './components/ActionBar';
import MessageLog from './components/MessageLog';
import GameOverModal from './components/GameOverModal';
import AiLogPanel from './components/AiLogPanel';
import AiBlurb from './components/AiBlurb';
import PlayerBlurb from './components/PlayerBlurb';
import CentralMessage from './components/CentralMessage';
import { saveStateToStorage, loadStateFromStorage } from './services/storageService';
import DataModal from './components/DataModal';
import { getCardName } from './services/trucoLogic';
import { getRandomPhrase, FLOR_PHRASES } from './services/ai/phrases';
import MainMenu from './components/MainMenu';
import Tutorial from './components/Tutorial';
import Manual from './components/Manual';
import AssistantPanel from './components/AssistantPanel';
import { generateSuggestionSummary } from './services/suggestionService';

type GameMode = 'menu' | 'playing' | 'tutorial' | 'playing-with-help' | 'manual';

const App: React.FC = () => {
  const [state, dispatch] = useReducer(useGameReducer, initialState);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [isMessageVisible, setIsMessageVisible] = useState(false);
  const messageTimers = useRef<{ fadeOutTimerId?: number; clearTimerId?: number }>({});
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [assistantMove, setAssistantMove] = useState<AiMove | null>(null);

  useEffect(() => {
    const isPlaying = gameMode === 'playing' || gameMode === 'playing-with-help';
    if (isPlaying) {
        const persistedState = loadStateFromStorage();
        if (persistedState) {
            dispatch({ type: ActionType.LOAD_PERSISTED_STATE, payload: persistedState });
        } else {
            dispatch({ type: ActionType.START_NEW_ROUND });
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode]);


  useEffect(() => {
    const isPlaying = gameMode === 'playing' || gameMode === 'playing-with-help';
    if (isPlaying && state.round > 0) {
        saveStateToStorage(state);
    }
  }, [state, gameMode]);

  useEffect(() => {
    const isPlaying = gameMode === 'playing' || gameMode === 'playing-with-help';
    const isResolving = state.gamePhase === 'ENVIDO_ACCEPTED' || 
                        state.gamePhase === 'ENVIDO_DECLINED' || 
                        state.gamePhase === 'TRUCO_DECLINED' ||
                        state.gamePhase === 'FLOR_SHOWDOWN' ||
                        state.gamePhase === 'CONTRAFLOR_DECLINED';

    if (isPlaying && state.currentTurn === 'ai' && !state.isThinking && !state.winner && !isResolving) {
      const handleAiTurn = () => {
        dispatch({ type: ActionType.AI_THINKING, payload: true });
        
        const aiHandString = state.aiHand.map(getCardName).join(', ');
        const initialReasoning = `Es mi turno. Fase: ${state.gamePhase}.\nMi mano: [${aiHandString}].\nConsultando IA...`;
        dispatch({ type: ActionType.ADD_AI_REASONING_LOG, payload: { round: state.round, reasoning: initialReasoning } });

        try {
            const aiMove = getLocalAIMove(state);
        
            dispatch({ type: ActionType.ADD_AI_REASONING_LOG, payload: { round: state.round, reasoning: aiMove.reasoning } });
            
            setTimeout(() => {
              dispatch(aiMove.action);
            }, 700);
        } catch(error) {
            console.error("Error getting AI move from local AI:", error);
            const errorMsg = "Ocurrió un error con la IA. La IA pierde su turno.";
            dispatch({ type: ActionType.ADD_MESSAGE, payload: errorMsg });
            dispatch({ type: ActionType.ADD_AI_REASONING_LOG, payload: { round: state.round, reasoning: `Error IA Local: ${error}` } });
            dispatch({ type: ActionType.AI_THINKING, payload: false });
        }
      };
      
      const timeoutId = setTimeout(handleAiTurn, 1200);
      return () => clearTimeout(timeoutId);
    }
  }, [state.currentTurn, state.isThinking, state.winner, state.round, state, gameMode]);

  // New useEffect to generate suggestions for the player
  useEffect(() => {
    if (gameMode === 'playing-with-help' && state.currentTurn === 'player' && !state.winner) {
      const getPlayerSuggestion = (currentState: GameState): AiMove => {
          const mirroredState: GameState = {
              ...currentState,
              playerHand: currentState.aiHand,
              aiHand: currentState.playerHand,
              initialPlayerHand: currentState.initialAiHand,
              initialAiHand: currentState.initialPlayerHand,
              playerTricks: currentState.aiTricks,
              aiTricks: currentState.playerTricks,
              playerScore: currentState.aiScore,
              aiScore: currentState.playerScore,
              currentTurn: 'ai',
              playerHasFlor: currentState.aiHasFlor,
              aiHasFlor: currentState.playerHasFlor,
          };
          const suggestion = getLocalAIMove(mirroredState);
          
          if (suggestion.action.type === ActionType.PLAY_CARD) {
              if (suggestion.action.payload.player === 'ai') {
                  suggestion.action.payload.player = 'player';
              }
          }
           if (suggestion.action.type === ActionType.DECLARE_FLOR) {
              if (suggestion.action.payload?.player === 'ai') {
                  suggestion.action.payload.player = 'player';
              }
          }
          return suggestion;
      };
      
      try {
          const suggestion = getPlayerSuggestion(state);
          const summary = generateSuggestionSummary(suggestion, state);
          const suggestionWithSummary: AiMove = { ...suggestion, summary };
          setAssistantMove(suggestionWithSummary);
      } catch(error) {
          console.error("Error getting player suggestion:", error);
          setAssistantMove(null);
      }
    } else {
      setAssistantMove(null);
    }
  }, [gameMode, state, state.currentTurn, state.winner]);

  // New useEffect to handle delayed resolutions after an AI response
  useEffect(() => {
    const isPlaying = gameMode === 'playing' || gameMode === 'playing-with-help';
    if (!isPlaying) return;
    let resolutionAction: Action | null = null;
    switch (state.gamePhase) {
        case 'ENVIDO_ACCEPTED':
            resolutionAction = { type: ActionType.RESOLVE_ENVIDO_ACCEPT };
            break;
        case 'ENVIDO_DECLINED':
            resolutionAction = { type: ActionType.RESOLVE_ENVIDO_DECLINE };
            break;
        case 'TRUCO_DECLINED':
            resolutionAction = { type: ActionType.RESOLVE_TRUCO_DECLINE };
            break;
        case 'FLOR_SHOWDOWN':
            resolutionAction = { type: ActionType.RESOLVE_FLOR_SHOWDOWN };
            break;
        case 'CONTRAFLOR_DECLINED':
            resolutionAction = { type: ActionType.RESOLVE_CONTRAFLOR_DECLINE };
            break;
        default:
            break;
    }

    if (resolutionAction) {
        const timeoutId = setTimeout(() => {
            dispatch(resolutionAction!);
        }, 1200); // 1.2 second delay for a natural pause
        return () => clearTimeout(timeoutId);
    }
  }, [state.gamePhase, dispatch, gameMode]);

  // New useEffect to handle round end timer
  useEffect(() => {
    const isPlaying = gameMode === 'playing' || gameMode === 'playing-with-help';
    if (!isPlaying) return;
    let timerId: number;
    if (state.gamePhase === 'round_end') {
      timerId = window.setTimeout(() => {
        dispatch({ type: ActionType.PROCEED_TO_NEXT_ROUND });
      }, 5000); // 5 seconds
    }
    return () => clearTimeout(timerId);
  }, [state.gamePhase, dispatch, gameMode]);

  const clearMessageState = () => {
    dispatch({ type: ActionType.CLEAR_CENTRAL_MESSAGE });
    setLocalMessage(null);
  };

  const handleDismissMessage = () => {
      clearTimeout(messageTimers.current.fadeOutTimerId);
      clearTimeout(messageTimers.current.clearTimerId);
      setIsMessageVisible(false); // Start fade-out animation
      messageTimers.current.clearTimerId = window.setTimeout(clearMessageState, 500); // Clear state after fade-out
  };

  useEffect(() => {
    const isPlaying = gameMode === 'playing' || gameMode === 'playing-with-help';
    if (!isPlaying) return;
    if (state.centralMessage) {
        setLocalMessage(state.centralMessage);
        setIsMessageVisible(true);

        if (!state.isCentralMessagePersistent) {
            messageTimers.current.fadeOutTimerId = window.setTimeout(() => {
                setIsMessageVisible(false);
            }, 1500);

            messageTimers.current.clearTimerId = window.setTimeout(clearMessageState, 2000); // 1500ms visible + 500ms fadeout
        }

        return () => {
            clearTimeout(messageTimers.current.fadeOutTimerId);
            clearTimeout(messageTimers.current.clearTimerId);
        };
    }
  }, [state.centralMessage, state.isCentralMessagePersistent, dispatch, gameMode]);

  // Automatically clear the player's blurb after a short delay
  useEffect(() => {
    const isPlaying = gameMode === 'playing' || gameMode === 'playing-with-help';
    if (!isPlaying) return;
    if (state.playerBlurb?.isVisible) {
      const timerId = window.setTimeout(() => {
        dispatch({ type: ActionType.CLEAR_PLAYER_BLURB });
      }, 1500);
      return () => clearTimeout(timerId);
    }
  }, [state.playerBlurb, dispatch, gameMode]);

  const handlePlayerAction = () => {
    // If a persistent message is showing (like Envido results), clear it when the player acts.
    if (state.isCentralMessagePersistent) {
        handleDismissMessage();
    }
  };

  const handlePlayCard = (cardIndex: number) => {
    if (state.currentTurn === 'player') {
      handlePlayerAction();
      dispatch({ type: ActionType.PLAY_CARD, payload: { player: 'player', cardIndex } });
    }
  };

  const LogButton: React.FC<{onClick: () => void, children: React.ReactNode, className?: string}> = ({ onClick, children, className = '' }) => (
    <button onClick={onClick} className={`px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-lg font-semibold text-yellow-200 bg-black/40 border-2 border-yellow-800/80 shadow-md hover:bg-black/60 hover:border-yellow-600 transition-colors ${className}`}>
      {children}
    </button>
  );

  if (gameMode === 'menu') {
    return (
      <MainMenu
        onPlay={() => {
            dispatch({ type: ActionType.RESTART_GAME });
            setGameMode('playing');
        }}
        onPlayWithHelp={() => {
            dispatch({ type: ActionType.RESTART_GAME });
            setGameMode('playing-with-help');
        }}
        onLearn={() => setGameMode('tutorial')}
        onManual={() => setGameMode('manual')}
      />
    );
  }

  if (gameMode === 'tutorial') {
    return <Tutorial onExit={() => setGameMode('menu')} />;
  }
  
  if (gameMode === 'manual') {
    return <Manual onExit={() => setGameMode('menu')} />;
  }


  return (
    <div className="h-screen bg-green-900 text-white font-sans overflow-hidden" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')"}}>
      <div className="w-full h-full max-w-screen-2xl mx-auto flex flex-row gap-4 p-2 md:p-4">

        {/* Left Panel */}
        <div className="hidden lg:flex w-full max-w-xs flex-shrink-0">
          <MessageLog messages={state.messageLog} dispatch={dispatch} isModal={false} />
        </div>

        {/* Center Game Column */}
        <div className="flex-1 flex flex-col relative overflow-hidden h-full">
          <Scoreboard playerScore={state.playerScore} aiScore={state.aiScore} className="absolute top-0 left-0 z-40" />
          
          <div className="absolute top-1 right-1 z-50 flex gap-2 p-1">
            <button
              onClick={() => setGameMode('menu')}
              className="px-2 py-0.5 text-[10px] md:px-3 md:py-1 md:text-xs rounded-md border-2 bg-red-700/80 border-red-500 text-white transition-colors hover:bg-red-600/90"
            >
                MENÚ
            </button>
            <button 
                onClick={() => dispatch({ type: ActionType.TOGGLE_DATA_MODAL })}
                className="px-2 py-0.5 text-[10px] md:px-3 md:py-1 md:text-xs rounded-md border-2 bg-gray-700/50 border-gray-500 text-white transition-colors hover:bg-gray-600/70"
            >
                VER DATA
            </button>
            <button 
              onClick={() => dispatch({ type: ActionType.TOGGLE_DEBUG_MODE })}
              className={`px-2 py-0.5 text-[10px] md:px-3 md:py-1 md:text-xs rounded-md border-2 transition-colors ${state.isDebugMode ? 'bg-yellow-500 border-yellow-300 text-black font-bold' : 'bg-gray-700/50 border-gray-500 text-white'}`}
            >
              VER CARTAS
            </button>
          </div>

          {/* Main Game Layout */}
          <div className="relative z-10 flex flex-col flex-grow w-full max-w-4xl mx-auto h-full">
            
            {/* TOP: Title & AI Hand */}
            <div className="flex-shrink-0 flex flex-col items-center justify-start pt-1 md:pt-2">
                <div className="text-center">
                    <h1 className="text-3xl md:text-4xl font-cinzel font-bold tracking-wider text-yellow-300" style={{ textShadow: '3px 3px 5px rgba(0,0,0,0.8)' }}>TRUCO</h1>
                    <p className="text-xs md:text-sm text-gray-200 tracking-widest">Ronda {state.round} | Mano: {state.mano === 'player' ? 'Tú' : 'IA'}</p>
                </div>
                <div className="flex items-center">
                    <PlayerHand 
                        cards={state.aiHand} 
                        playerType="ai" 
                        isThinking={state.isThinking} 
                        isDebugMode={state.isDebugMode} 
                    />
                </div>
            </div>

            {/* AI Speech Blurb */}
            <AiBlurb text={state.aiBlurb?.text ?? ''} isVisible={!!state.aiBlurb?.isVisible} />
            
            {/* Player Speech Blurb */}
            <PlayerBlurb text={state.playerBlurb?.text ?? ''} isVisible={!!state.playerBlurb?.isVisible} />


            {/* Central Message Display */}
            <CentralMessage message={localMessage} isVisible={isMessageVisible} onDismiss={handleDismissMessage} />

            {/* MIDDLE: Board */}
            <div className="flex-grow flex items-center justify-center py-2 md:py-4 min-h-0">
                <GameBoard 
                  playerTricks={state.playerTricks} 
                  aiTricks={state.aiTricks}
                  trickWinners={state.trickWinners}
                  lastRoundWinner={state.lastRoundWinner}
                  gamePhase={state.gamePhase}
                  dispatch={dispatch}
                />
            </div>

            {/* PLAYER HAND AREA */}
            <div className="flex-shrink-0 w-full z-10 pb-2">
              <PlayerHand 
                  cards={state.playerHand} 
                  onCardPlay={handlePlayCard} 
                  playerType="player" 
                  isMyTurn={state.currentTurn === 'player' && state.playerTricks[state.currentTrick] === null && !state.gamePhase.includes('_called')}
              />
            </div>


            {/* BOTTOM: Status Bar */}
            <div className="flex-shrink-0 w-full z-20">
                <div className="bg-black/40 border-2 border-yellow-900/50 shadow-lg rounded-lg p-2 flex justify-between lg:justify-center items-center gap-4">
                    <LogButton onClick={() => dispatch({ type: ActionType.TOGGLE_GAME_LOG_EXPAND })} className="lg:hidden">
                      Registro
                    </LogButton>
                    <ActionBar dispatch={dispatch} gameState={state} onPlayerAction={handlePlayerAction} />
                    <LogButton onClick={() => dispatch({ type: ActionType.TOGGLE_AI_LOG_EXPAND })} className="lg:hidden">
                      Lógica IA
                    </LogButton>
                </div>
            </div>

          </div>
        </div>
        
        {/* Right Panel */}
        <div className="hidden lg:flex w-full max-w-xs flex-shrink-0 items-start justify-center">
          {state.isLogExpanded ? (
              <div className="w-full h-full animate-fade-in-scale">
                <AiLogPanel log={state.aiReasoningLog} dispatch={dispatch} isModal={false} />
              </div>
          ) : (
            <div className="pt-4">
              <button 
                onClick={() => dispatch({ type: ActionType.TOGGLE_AI_LOG_EXPAND })}
                className="px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-lg font-semibold text-cyan-200 bg-black/40 border-2 border-cyan-800/80 shadow-md hover:bg-black/60 hover:border-cyan-600 transition-colors flex items-center gap-2"
                aria-label="Mostrar Lógica de la IA"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
                <span>Lógica IA</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODALS for smaller screens */}
      <div className="lg:hidden">
        {state.isGameLogExpanded && <MessageLog messages={state.messageLog} dispatch={dispatch} isModal={true} />}
        {state.isLogExpanded && <AiLogPanel log={state.aiReasoningLog} dispatch={dispatch} isModal={true} />}
      </div>

      {state.isDataModalVisible && (
        <DataModal 
            gameState={state}
            dispatch={dispatch}
        />
      )}
      
      {state.winner && (
        <GameOverModal winner={state.winner} onPlayAgain={() => dispatch({ type: ActionType.RESTART_GAME })} />
      )}

      {gameMode === 'playing-with-help' && (
        <AssistantPanel suggestion={assistantMove} playerHand={state.playerHand} />
      )}
    </div>
  );
};

export default App;