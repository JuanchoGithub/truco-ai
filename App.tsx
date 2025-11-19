
import React, { useReducer, useEffect, useState, useRef } from 'react';
import { useGameReducer, initialState } from './hooks/useGameReducer';
import { getLocalAIMove } from './services/localAiService';
import { ActionType, Action, GameState, AiMove, MessageObject, MatchLog } from './types';
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
import { saveStateToStorage, loadStateFromStorage, clearStateFromStorage, loadMatchLogs, MATCH_LOG_KEY } from './services/storageService';
import DataModal from './components/DataModal';
import { getCardName } from './services/trucoLogic';
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
  const { t, translatePlayerName, language } = useLocalization();
  const [state, dispatch] = useReducer(useGameReducer, initialState);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [isMessageVisible, setIsMessageVisible] = useState(false);
  const messageTimers = useRef<{ fadeOutTimerId?: number; clearTimerId?: number }>({});
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [assistantMove, setAssistantMove] = useState<AiMove | null>(null);
  const lastSpokenSummary = useRef<string | null>(null);
  const [isOpponentSoundEnabled, setIsOpponentSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('trucoAiOpponentSoundEnabled');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [isAssistantSoundEnabled, setIsAssistantSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('trucoAiAssistantSoundEnabled');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [showSoundHint, setShowSoundHint] = useState(false);
  const justStartedNewGame = useRef(false);

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
    localStorage.setItem('trucoAiOpponentSoundEnabled', JSON.stringify(isOpponentSoundEnabled));
    speechService.setOpponentSoundEnabled(isOpponentSoundEnabled);
  }, [isOpponentSoundEnabled]);

  useEffect(() => {
    localStorage.setItem('trucoAiAssistantSoundEnabled', JSON.stringify(isAssistantSoundEnabled));
    speechService.setAssistantSoundEnabled(isAssistantSoundEnabled);
  }, [isAssistantSoundEnabled]);

  useEffect(() => {
    const isPlaying = gameMode === 'playing' || gameMode === 'playing-with-help';
    if (isPlaying) {
        if (justStartedNewGame.current) {
            justStartedNewGame.current = false;
            return;
        }
        
        const persistedState = loadStateFromStorage(gameMode);
        if (persistedState) {
            dispatch({ type: ActionType.LOAD_PERSISTED_STATE, payload: persistedState });
        } else {
            if (state.round === 0) {
                 dispatch({ type: ActionType.RESTART_GAME });
            }
        }
    }
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
        const initialReasoning: MessageObject[] = [
            { key: 'ai_logic.turn_info', options: { gamePhase: state.gamePhase } },
            { key: 'ai_logic.hand_info', options: { hand: aiHandString } },
            { key: 'ai_logic.consulting' }
        ];
        dispatch({ type: ActionType.ADD_AI_REASONING_LOG, payload: { round: state.round, reasoning: initialReasoning } });

        try {
            const aiMove = getLocalAIMove(state);
        
            dispatch({ type: ActionType.ADD_AI_REASONING_LOG, payload: { round: state.round, reasoning: aiMove.reasoning } });
            
            setTimeout(() => {
              dispatch(aiMove.action);
            }, 700);
        } catch(error) {
            console.error("Error getting AI move from local AI:", error);
            dispatch({ type: ActionType.ADD_MESSAGE, payload: { key: 'game.error_ai' } });
            dispatch({ type: ActionType.ADD_AI_REASONING_LOG, payload: { round: state.round, reasoning: [`Error IA Local: ${error}`] } });
            dispatch({ type: ActionType.AI_THINKING, payload: false });
        }
      };
      
      const timeoutId = setTimeout(handleAiTurn, 1200);
      return () => clearTimeout(timeoutId);
    }
  }, [state.currentTurn, state.isThinking, state.winner, state.round, state, gameMode]);

  useEffect(() => {
    const isResolving = state.gamePhase.includes('_ACCEPTED') ||
                        state.gamePhase.includes('_DECLINED') ||
                        state.gamePhase.includes('_SHOWDOWN');
                        
    const isPlayerRespondingToCall = state.gamePhase.includes('_called');

    const canSuggest = gameMode === 'playing-with-help' &&
                       state.currentTurn === 'player' &&
                       (state.playerHand.length > 0 || isPlayerRespondingToCall) &&
                       !state.winner &&
                       !state.isThinking &&
                       !isResolving &&
                       !state.centralMessage;

    if (canSuggest) {
      const getPlayerSuggestion = (currentState: GameState): AiMove => {
          const mirroredTrickWinners = currentState.trickWinners.map(winner => {
              if (winner === 'player') return 'ai';
              if (winner === 'ai') return 'player';
              return winner;
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
              opponentModel: initialState.opponentModel,
              lastCaller: currentState.lastCaller === 'player' ? 'ai' : (currentState.lastCaller === 'ai' ? 'player' : null),
              turnBeforeInterrupt: currentState.turnBeforeInterrupt === 'player' ? 'ai' : (currentState.turnBeforeInterrupt === 'ai' ? 'player' : null),
              pendingTrucoCaller: currentState.pendingTrucoCaller === 'player' ? 'ai' : (currentState.pendingTrucoCaller === 'ai' ? 'player' : null),
              playerEnvidoValue: currentState.aiEnvidoValue,
              aiEnvidoValue: currentState.playerEnvidoValue,
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
          let suggestionWithSummary: AiMove = { ...suggestion, summary };
          
          if (suggestionWithSummary.alternatives) {
              suggestionWithSummary.alternatives = suggestionWithSummary.alternatives.map(alt => ({
                  ...alt,
                  summary: generateSuggestionSummary(alt, state)
              }));
          }

          setAssistantMove(suggestionWithSummary);
      } catch(error) {
          console.error("Error getting player suggestion:", error);
          setAssistantMove(null);
      }
    } else {
      setAssistantMove(null);
    }
  }, [gameMode, state]);

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
        }, 1200);
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
      setIsMessageVisible(false);
      messageTimers.current.clearTimerId = window.setTimeout(clearMessageState, 500);
  };

  useEffect(() => {
    const isPlaying = gameMode === 'playing' || gameMode === 'playing-with-help';
    if (!isPlaying) return;
    if (state.centralMessage) {
        const options = { ...state.centralMessage.options };
        if (options.winnerName) {
            options.winnerName = translatePlayerName(options.winnerName);
        }
        if (options.winner) {
            options.winnerName = translatePlayerName(options.winner);
        }
        const translatedMessage = t(state.centralMessage.key, options);
        setLocalMessage(translatedMessage);
        setIsMessageVisible(true);

        if (!state.isCentralMessagePersistent) {
            messageTimers.current.fadeOutTimerId = window.setTimeout(() => {
                setIsMessageVisible(false);
            }, 1500);

            messageTimers.current.clearTimerId = window.setTimeout(clearMessageState, 2000);
        }

        return () => {
            clearTimeout(messageTimers.current.fadeOutTimerId);
            clearTimeout(messageTimers.current.clearTimerId);
        };
    }
  }, [state.centralMessage, state.isCentralMessagePersistent, dispatch, gameMode, t, translatePlayerName]);

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

  useEffect(() => {
    const isPlaying = gameMode === 'playing' || gameMode === 'playing-with-help';
    if (!isPlaying) {
      speechService.cancel();
      lastSpokenSummary.current = null;
      return;
    }

    if (gameMode === 'playing-with-help' && assistantMove) {
        const allMoves = [assistantMove, ...(assistantMove.alternatives || [])]
            .filter((value, index, self) => 
                index === self.findIndex((t) => (
                    JSON.stringify(t.action) === JSON.stringify(value.action)
                ))
            );

        const suggestionsKey = allMoves.map(m => m.action.type).join('_');

        if (suggestionsKey !== lastSpokenSummary.current) {
            let fullSpeechText = t('assistantPanel.speech_intro');

            allMoves.forEach((move, index) => {
                const categoryKey = `assistantPanel.strategy_${move.strategyCategory || 'safe'}_title`;
                const categoryTitle = t(categoryKey);
                const moveSummary = move.summary || '';
                
                fullSpeechText += ` ${t('assistantPanel.speech_option', { number: index + 1 })}. ${categoryTitle}. ${moveSummary}.`;
            });
            
            speechService.speak(fullSpeechText, 'assistant');
            lastSpokenSummary.current = suggestionsKey;
        }
    } else if (gameMode === 'playing' && state.aiBlurb?.isVisible && state.aiBlurb.text) {
        speechService.speak(state.aiBlurb.text, 'opponent');
        lastSpokenSummary.current = null;
    } else {
        if (gameMode === 'playing-with-help' && !assistantMove) {
            lastSpokenSummary.current = null;
        }
    }
  }, [state.aiBlurb, assistantMove, gameMode, t]);

  const handlePlayerAction = () => {
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
    <button onClick={onClick} className={`px-3 py-2 text-xs lg:text-sm rounded-lg font-bold uppercase tracking-wider text-yellow-100 bg-gradient-to-t from-stone-800 to-stone-700 border border-yellow-600/50 shadow-md hover:bg-stone-600 hover:text-white transition-all ${className}`}>
      {children}
    </button>
  );

  const saveCurrentGame = () => {
    const roundsForThisMatch = state.roundHistory.slice(state.matchStartRoundIndex);
    const reasoningForThisMatch = state.aiReasoningLog.slice(state.matchStartAiLogIndex);

    if (state.round > 0 && roundsForThisMatch.length > 0) {
        const newLog: MatchLog = {
            matchId: Date.now(),
            date: new Date().toLocaleString(language),
            playerScore: state.playerScore,
            aiScore: state.aiScore,
            aiReasoningLog: reasoningForThisMatch,
            roundHistory: roundsForThisMatch,
        };
        const existingLogs = loadMatchLogs() || [];
        const updatedLogs = [newLog, ...existingLogs].slice(0, 5);
        localStorage.setItem(MATCH_LOG_KEY, JSON.stringify(updatedLogs));
    }
  };

  const handleStartGame = (mode: 'playing' | 'playing-with-help', continueGame: boolean, options: { isFlorEnabled: boolean }) => {
    if (continueGame) {
      setGameMode(mode);
    } else {
      saveCurrentGame();
      dispatch({ type: ActionType.RESTART_GAME, payload: { isFlorEnabled: options.isFlorEnabled } });
      justStartedNewGame.current = true;
      setGameMode(mode);
    }
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
    return <Manual onExit={() => setGameMode('menu')} isFlorEnabled={state.isFlorEnabled} />;
  }
  
  if (gameMode === 'simulation') {
    return <Simulation onExit={() => setGameMode('menu')} />;
  }

  const translatedGameOverReason = state.gameOverReason 
    ? t(state.gameOverReason.key, state.gameOverReason.options) 
    : null;

  const handlePlayAgain = () => {
    saveCurrentGame();
    dispatch({ type: ActionType.RESTART_GAME, payload: { isFlorEnabled: state.isFlorEnabled } });
  };

  const isSoundOnForMenu = gameMode === 'playing' ? isOpponentSoundEnabled : isAssistantSoundEnabled;
  const toggleSoundForMenu = gameMode === 'playing' ?
      () => setIsOpponentSoundEnabled(v => !v) :
      () => setIsAssistantSoundEnabled(v => !v);

  // Determine if AI cards should be revealed based on central message key
  const showOpponentCards = state.isDebugMode || (
      !!state.centralMessage && (
        state.centralMessage.key === 'centralMessage.envido_result' ||
        state.centralMessage.key === 'centralMessage.tie_envido' ||
        state.centralMessage.key === 'centralMessage.flor_result'
      )
  );

  return (
    <div className="h-[100dvh] w-full bg-felt text-white font-sans overflow-hidden flex flex-col relative">
      {/* Vignette Overlay */}
      <div className="absolute inset-0 table-vignette z-0 pointer-events-none" />

      <div className="flex-grow flex flex-row h-full max-w-[1600px] mx-auto w-full relative z-10">

        {/* Left Panel (Desktop Only) - Logs */}
        <div className="hidden xl:flex w-72 flex-col border-r-4 border-yellow-900/30 bg-black/20 backdrop-blur-sm">
          <MessageLog messages={state.messageLog} dispatch={dispatch} isModal={false} />
        </div>

        {/* Center Game Area */}
        <div className="flex-1 flex flex-col relative h-full">
          
          {/* Header: Score & Menu */}
          <div className="flex justify-between items-start p-2 lg:p-4 absolute top-0 w-full z-30 pointer-events-none">
             <div className="pointer-events-auto">
               <Scoreboard playerScore={state.playerScore} aiScore={state.aiScore} />
             </div>
             <div className="pointer-events-auto flex flex-col items-end gap-2">
               <GameMenu
                  gameMode={gameMode as 'playing' | 'playing-with-help'}
                  isSoundEnabled={isSoundOnForMenu}
                  isDebugMode={state.isDebugMode}
                  onToggleSound={() => {
                    toggleSoundForMenu();
                    if (showSoundHint) handleDismissSoundHint();
                  }}
                  onToggleDebug={() => dispatch({ type: ActionType.TOGGLE_DEBUG_MODE })}
                  onShowData={() => dispatch({ type: ActionType.TOGGLE_DATA_MODAL })}
                  onGoToMainMenu={() => setGameMode('menu')}
                  onOpenMenu={handleDismissSoundHint}
                />
                <SoundHint isVisible={showSoundHint} onDismiss={handleDismissSoundHint} />
             </div>
          </div>

          {/* Game Play Area */}
          <div className="flex-grow flex flex-col justify-between w-full max-w-4xl mx-auto h-full">
            
            {/* TOP: Title & AI Hand */}
            <div className="flex-shrink-0 flex flex-col items-center justify-start pt-2 lg:pt-6">
                <h1 className="hidden lg:block text-4xl font-cinzel font-bold tracking-widest text-yellow-400/80 mb-2 drop-shadow-lg">TRUCO</h1>
                <div className="flex items-center justify-center w-full">
                    <PlayerHand 
                        cards={state.aiHand} 
                        playerType="ai" 
                        isThinking={state.isThinking} 
                        isDebugMode={showOpponentCards} 
                    />
                </div>
            </div>

            {/* Overlay Messages (Blurbs, Central) */}
            <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
               <CentralMessage message={localMessage} isVisible={isMessageVisible} onDismiss={handleDismissMessage} />
               <AiBlurb 
                  titleKey={state.aiBlurb?.titleKey ?? ''}
                  text={state.aiBlurb?.text ?? ''} 
                  isVisible={!!state.aiBlurb?.isVisible} 
                  dispatch={dispatch} 
               />
               <PlayerBlurb text={state.playerBlurb?.text ?? ''} isVisible={!!state.playerBlurb?.isVisible} />
            </div>

            {/* MIDDLE: Board (The Mat) */}
            <div className="flex-grow flex items-center justify-center py-2 lg:py-4 min-h-0 relative z-10">
                <GameBoard gameState={state} dispatch={dispatch} />
            </div>

            {/* BOTTOM: Player Hand & Controls */}
            <div className="flex-shrink-0 w-full z-50 flex flex-col items-center bg-gradient-to-t from-black/90 via-black/60 to-transparent pb-0 pt-8 lg:pt-4">
              <div className="w-full max-w-2xl -mb-8 z-20">
                 <PlayerHand 
                    cards={state.playerHand} 
                    onCardPlay={handlePlayCard} 
                    playerType="player" 
                    isMyTurn={state.currentTurn === 'player' && state.playerTricks[state.currentTrick] === null && !state.gamePhase.includes('_called')}
                />
              </div>

              <div className="w-full bg-stone-900 border-t-[6px] border-yellow-800 shadow-[0_-4px_20px_rgba(0,0,0,0.7)] px-2 py-2 lg:px-6 lg:py-4 flex items-center justify-between gap-2 lg:justify-center relative z-30">
                  {/* Mobile Log Buttons */}
                  <LogButton onClick={() => dispatch({ type: ActionType.TOGGLE_GAME_LOG_EXPAND })} className="xl:hidden">
                    {t('logPanel.game_log_button')}
                  </LogButton>
                  
                  {/* Action Bar (Center) */}
                  <div className="flex-grow flex justify-center max-w-md lg:max-w-none">
                    <ActionBar dispatch={dispatch} gameState={state} onPlayerAction={handlePlayerAction} />
                  </div>

                  {/* Mobile AI Log Button */}
                  <LogButton onClick={() => dispatch({ type: ActionType.TOGGLE_AI_LOG_EXPAND })} className="xl:hidden">
                    {t('logPanel.ai_log_button')}
                  </LogButton>
              </div>
            </div>

          </div>
        </div>
        
        {/* Right Panel (Desktop Only) - AI Logic */}
        <div className="hidden xl:flex w-80 flex-shrink-0 flex-col border-l-4 border-yellow-900/30 bg-black/20 backdrop-blur-sm">
            <AiLogPanel 
                log={state.aiReasoningLog} 
                dispatch={dispatch} 
                isModal={false} 
                roundHistory={state.roundHistory}
                currentRound={state.round}
            />
        </div>
      </div>

      {/* MODALS for smaller screens */}
      <div className="xl:hidden">
        {state.isGameLogExpanded && <MessageLog messages={state.messageLog} dispatch={dispatch} isModal={true} />}
        {state.isLogExpanded && <AiLogPanel 
            log={state.aiReasoningLog} 
            dispatch={dispatch} 
            isModal={true} 
            roundHistory={state.roundHistory}
            currentRound={state.round}
        />}
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
            onPlayAgain={handlePlayAgain}
            reason={translatedGameOverReason} 
        />
      )}

      {gameMode === 'playing-with-help' && (
        <AssistantPanel suggestion={assistantMove} playerHand={state.playerHand} />
      )}
    </div>
  );
};

export default App;
