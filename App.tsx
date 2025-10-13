
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
import { saveStateToStorage, loadStateFromStorage, clearStateFromStorage } from './services/storageService';
import DataModal from './components/DataModal';
import { getCardName } from './services/trucoLogic';
// Fix: Removed unused import causing an error.
import MainMenu from './components/MainMenu';
import Tutorial from './components/Tutorial';
import Manual from './components/Manual';
import AssistantPanel from './components/AssistantPanel';
import { generateSuggestionSummary } from './services/suggestionService';
import { speechService } from './services/speechService';
import Simulation from './components/Simulation';
import GameMenu from './components/GameMenu';
import SoundHint from './components/SoundHint';
import { useLocalization } from './context/LocalizationContext';

type GameMode = 'menu' | 'playing' | 'tutorial' | 'playing-with-help' | 'manual' | 'simulation';

const App: React.FC = () => {
  const { t } = useLocalization();
  const [state, dispatch] = useReducer(useGameReducer, initialState);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [isMessageVisible, setIsMessageVisible] = useState(false);
  const messageTimers = useRef<{ fadeOutTimerId?: number; clearTimerId?: number }>({});
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [assistantMove, setAssistantMove] = useState<AiMove | null>(null);
  const lastSpokenSummary = useRef<string | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('trucoAiSoundEnabled');
    return saved !== null ? JSON.parse(saved) : false; // Default to false
  });
  const [showSoundHint, setShowSoundHint] = useState(false);

  useEffect(() => {
    const hintShown = localStorage.getItem('trucoAiSoundHintShown');
    if (!hintShown && gameMode.startsWith('playing')) {
      const timer = setTimeout(() => {
        setShowSoundHint(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameMode]);

  const handleDismissSoundHint = () => {
    setShowSoundHint(false);
    localStorage.setItem('trucoAiSoundHintShown', 'true');
  };

  useEffect(() => {
    localStorage.setItem('trucoAiSoundEnabled', JSON.stringify(isSoundEnabled));
  }, [isSoundEnabled]);

  useEffect(() => {
    const isPlaying = gameMode === 'playing' || gameMode === 'playing-with-help';
    if (isPlaying) {
        const persistedState = loadStateFromStorage(gameMode);
        if (persistedState) {
            dispatch({ type: ActionType.LOAD_PERSISTED_STATE, payload: persistedState });
        } else {
            // This handles two cases:
            // 1. User clicks "Continue Game" but the save file was deleted between menu load and click.
            // 2. A brand new user starts a game in a mode for which no save file exists.
            // It does NOT run for "New Game" because `handleStartGame` already dispatched RESTART_GAME,
            // so the state is already initialized with round > 0.
            if (state.round === 0) {
                 dispatch({ type: ActionType.RESTART_GAME });
            }
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode]);


  useEffect(() => {
    const isPlaying = gameMode === 'playing' || gameMode === 'playing-with-help';
    if (isPlaying && state.round > 0) {
        saveStateToStorage(state, gameMode);
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
    const isResolving = state.gamePhase.includes('_ACCEPTED') ||
                        state.gamePhase.includes('_DECLINED') ||
                        state.gamePhase.includes('_SHOWDOWN');

    const canSuggest = gameMode === 'playing-with-help' &&
                       state.currentTurn === 'player' &&
                       state.playerHand.length > 0 &&
                       !state.winner &&
                       !state.isThinking &&
                       !isResolving &&
                       !state.centralMessage;

    if (canSuggest) {
      const getPlayerSuggestion = (currentState: GameState): AiMove => {
          const mirroredTrickWinners = currentState.trickWinners.map(winner => {
              if (winner === 'player') return 'ai';
              if (winner === 'ai') return 'player';
              return winner; // 'tie' or null
          });

          const mirroredState: GameState = {
              ...currentState,
              playerHand: currentState.aiHand,
              aiHand: currentState.playerHand,
              initialPlayerHand: currentState.initialAiHand,
              initialAiHand: currentState.initialPlayerHand,
              playerTricks: currentState.aiTricks,
              aiTricks: currentState.playerTricks,
              trickWinners: mirroredTrickWinners,
              playerScore: currentState.aiScore,
              aiScore: currentState.playerScore,
              currentTurn: 'ai',
              playerHasFlor: currentState.aiHasFlor,
              aiHasFlor: currentState.playerHasFlor,
              mano: currentState.mano === 'player' ? 'ai' : 'player',
              lastRoundWinner: currentState.lastRoundWinner === 'player' ? 'ai' : currentState.lastRoundWinner === 'ai' ? 'player' : currentState.lastRoundWinner,
              // Flip context-sensitive properties
              lastCaller: currentState.lastCaller === 'player' ? 'ai' : (currentState.lastCaller === 'ai' ? 'player' : null),
              turnBeforeInterrupt: currentState.turnBeforeInterrupt === 'player' ? 'ai' : (currentState.turnBeforeInterrupt === 'ai' ? 'player' : null),
              pendingTrucoCaller: currentState.pendingTrucoCaller === 'player' ? 'ai' : (currentState.pendingTrucoCaller === 'ai' ? 'player' : null),
              // Mirror the revealed envido values. The assistant AI needs to see the real AI's score as the opponent's score.
              playerEnvidoValue: currentState.aiEnvidoValue, // The assistant's opponent (real AI) has aiEnvidoValue
              aiEnvidoValue: currentState.playerEnvidoValue, // The assistant AI itself has playerEnvidoValue
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
  }, [gameMode, state]);

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

  // Effect to trigger AI speech for opponent or assistant
  useEffect(() => {
    const isPlaying = gameMode === 'playing' || gameMode === 'playing-with-help';
    if (!isPlaying) {
      speechService.cancel(); // Stop speech if we exit to menu
      lastSpokenSummary.current = null; // Reset on exit
      return;
    }

    if (isSoundEnabled) {
      if (gameMode === 'playing-with-help' && assistantMove?.summary) {
        // Only speak if the summary text has actually changed.
        if (assistantMove.summary !== lastSpokenSummary.current) {
            speechService.speak(assistantMove.summary);
            lastSpokenSummary.current = assistantMove.summary;
        }
      } else if (gameMode === 'playing' && state.aiBlurb?.isVisible && state.aiBlurb.text) {
        speechService.speak(state.aiBlurb.text);
        // Clear last summary so the assistant speaks again if mode is switched back.
        lastSpokenSummary.current = null;
      } else {
        // When there's no active suggestion (e.g., turn ended), reset the tracker.
        if (gameMode === 'playing-with-help' && !assistantMove?.summary) {
            lastSpokenSummary.current = null;
        }
      }
    }
  }, [state.aiBlurb, assistantMove, isSoundEnabled, gameMode]);

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
    <button onClick={onClick} className={`px-3 py-1.5 text-xs lg:px-4 lg:py-2 lg:text-sm rounded-lg font-semibold text-yellow-200 bg-black/40 border-2 border-yellow-800/80 shadow-md hover:bg-black/60 hover:border-yellow-600 transition-colors ${className}`}>
      {children}
    </button>
  );

  const handleStartGame = (mode: 'playing' | 'playing-with-help', continueGame: boolean) => {
    if (!continueGame) {
        clearStateFromStorage(mode);
        dispatch({ type: ActionType.RESTART_GAME });
    }
    setGameMode(mode);
  };

  if (gameMode === 'menu') {
    return (
      <MainMenu
        onStartGame={handleStartGame}
        onLearn={() => setGameMode('tutorial')}
        onManual={() => setGameMode('manual')}
        onSimulate={() => setGameMode('simulation')}
      />
    );
  }

  if (gameMode === 'tutorial') {
    return <Tutorial onExit={() => setGameMode('menu')} />;
  }
  
  if (gameMode === 'manual') {
    return <Manual onExit={() => setGameMode('menu')} />;
  }
  
  if (gameMode === 'simulation') {
    return <Simulation onExit={() => setGameMode('menu')} />;
  }


  return (
    <div className="h-screen bg-green-900 text-white font-sans overflow-hidden" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')"}}>
      <div className="w-full h-full max-w-screen-2xl mx-auto flex flex-row gap-4 p-2 lg:p-4">

        {/* Left Panel */}
        <div className="hidden lg:flex w-full max-w-xs flex-shrink-0">
          <MessageLog messages={state.messageLog} dispatch={dispatch} isModal={false} />
        </div>

        {/* Center Game Column */}
        <div className="flex-1 flex flex-col relative overflow-hidden h-full">
          <Scoreboard playerScore={state.playerScore} aiScore={state.aiScore} className="absolute top-0 left-0 z-40" />
          
          <div className="absolute top-2 right-2 z-50">
              <GameMenu
                gameMode={gameMode as 'playing' | 'playing-with-help'}
                isSoundEnabled={isSoundEnabled}
                isDebugMode={state.isDebugMode}
                onToggleSound={() => {
                  setIsSoundEnabled(!isSoundEnabled);
                  if (showSoundHint) handleDismissSoundHint();
                }}
                onToggleDebug={() => dispatch({ type: ActionType.TOGGLE_DEBUG_MODE })}
                onShowData={() => dispatch({ type: ActionType.TOGGLE_DATA_MODAL })}
                onGoToMainMenu={() => setGameMode('menu')}
              />
              <SoundHint isVisible={showSoundHint} onDismiss={handleDismissSoundHint} />
          </div>

          {/* Main Game Layout */}
          <div className="relative flex flex-col flex-grow w-full max-w-4xl mx-auto h-full">
            
            {/* TOP: Title & AI Hand */}
            <div className="flex-shrink-0 flex flex-col items-center justify-start pt-1 lg:pt-2">
                <div className="text-center">
                    <h1 className="text-3xl lg:text-4xl font-cinzel font-bold tracking-wider text-yellow-300" style={{ textShadow: '3px 3px 5px rgba(0,0,0,0.8)' }}>TRUCO</h1>
                    <p className="text-xs lg:text-sm text-gray-200 tracking-widest">
                        {t('game.round_info', { round: state.round, player: state.mano === 'player' ? t('common.you') : t('common.ai') })}
                    </p>
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
            <AiBlurb text={state.aiBlurb?.text ?? ''} isVisible={!!state.aiBlurb?.isVisible} dispatch={dispatch} />
            
            {/* Player Speech Blurb */}
            <PlayerBlurb text={state.playerBlurb?.text ?? ''} isVisible={!!state.playerBlurb?.isVisible} />


            {/* Central Message Display */}
            <CentralMessage message={localMessage} isVisible={isMessageVisible} onDismiss={handleDismissMessage} />

            {/* MIDDLE: Board */}
            <div className="flex-grow flex items-center justify-center py-2 lg:py-4 min-h-0">
                <GameBoard 
                  gameState={state}
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
                      {t('logPanel.game_log_button')}
                    </LogButton>
                    <ActionBar dispatch={dispatch} gameState={state} onPlayerAction={handlePlayerAction} />
                    <LogButton onClick={() => dispatch({ type: ActionType.TOGGLE_AI_LOG_EXPAND })} className="lg:hidden">
                      {t('logPanel.ai_log_button')}
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
                className="px-3 py-1.5 text-xs lg:px-4 lg:py-2 lg:text-sm rounded-lg font-semibold text-cyan-200 bg-black/40 border-2 border-cyan-800/80 shadow-md hover:bg-black/60 hover:border-cyan-600 transition-colors flex items-center gap-2"
                aria-label="Mostrar Lógica de la IA"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
                <span>{t('logPanel.ai_log_button')}</span>
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
        <GameOverModal 
            winner={state.winner} 
            onPlayAgain={() => dispatch({ type: ActionType.RESTART_GAME })}
            reason={state.gameOverReason} 
        />
      )}

      {gameMode === 'playing-with-help' && (
        <AssistantPanel suggestion={assistantMove} playerHand={state.playerHand} />
      )}
    </div>
  );
};

export default App;
