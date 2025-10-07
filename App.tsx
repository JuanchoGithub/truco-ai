import React, { useReducer, useEffect } from 'react';
import { useGameReducer, initialState } from './hooks/useGameReducer';
import { getLocalAIMove } from './services/localAiService';
import { ActionType, Action } from './types';
import Scoreboard from './components/Scoreboard';
import GameBoard from './components/GameBoard';
import PlayerHand from './components/PlayerHand';
import ActionBar from './components/ActionBar';
import MessageLog from './components/MessageLog';
import GameOverModal from './components/GameOverModal';
import AiLogPanel from './components/AiLogPanel';
import AiBlurb from './components/AiBlurb';

const App: React.FC = () => {
  const [state, dispatch] = useReducer(useGameReducer, initialState);

  useEffect(() => {
    dispatch({ type: ActionType.START_NEW_ROUND });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.currentTurn === 'ai' && !state.isThinking && !state.winner) {
      const handleAiTurn = () => {
        dispatch({ type: ActionType.AI_THINKING, payload: true });
        
        const initialReasoning = `Es mi turno. Fase: ${state.gamePhase}. Mi mano: ${state.aiHand.length} cartas. Consultando IA...`;
        dispatch({ type: ActionType.ADD_AI_REASONING_LOG, payload: { round: state.round, reasoning: initialReasoning } });

        try {
            const aiMove = getLocalAIMove(state);
        
            dispatch({ type: ActionType.ADD_AI_REASONING_LOG, payload: { round: state.round, reasoning: aiMove.reasoning } });
            
            if (aiMove.trucoContext) {
              dispatch({ type: ActionType.SET_AI_TRUCO_CONTEXT, payload: aiMove.trucoContext });
            }
            
            setTimeout(() => {
              dispatch(aiMove.action);
              // The AI_THINKING payload is now set to false inside the response reducers
              // for a better user experience, so it stops when the response is shown.
              // dispatch({ type: ActionType.AI_THINKING, payload: false });
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
  }, [state.currentTurn, state.isThinking, state.winner, state.round, state]);

  // New useEffect to handle delayed resolutions after an AI response
  useEffect(() => {
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
        default:
            break;
    }

    if (resolutionAction) {
        const timeoutId = setTimeout(() => {
            dispatch(resolutionAction!);
        }, 1200); // 1.2 second delay for a natural pause
        return () => clearTimeout(timeoutId);
    }
  }, [state.gamePhase, dispatch]);


  const handlePlayCard = (cardIndex: number) => {
    if (state.currentTurn === 'player') {
      dispatch({ type: ActionType.PLAY_CARD, payload: { player: 'player', cardIndex } });
    }
  };

  const LogButton: React.FC<{onClick: () => void, children: React.ReactNode, className?: string}> = ({ onClick, children, className = '' }) => (
    <button onClick={onClick} className={`px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-lg font-semibold text-yellow-200 bg-black/40 border-2 border-yellow-800/80 shadow-md hover:bg-black/60 hover:border-yellow-600 transition-colors ${className}`}>
      {children}
    </button>
  );

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
          <button 
            onClick={() => dispatch({ type: ActionType.TOGGLE_DEBUG_MODE })}
            className={`absolute top-0 right-0 z-50 px-2 py-0.5 text-[10px] md:px-3 md:py-1 md:text-xs rounded-md border-2 transition-colors ${state.isDebugMode ? 'bg-yellow-500 border-yellow-300 text-black font-bold' : 'bg-gray-700/50 border-gray-500 text-white'}`}
          >
            VER CARTAS
          </button>

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

            {/* MIDDLE: Board */}
            <div className="flex-grow flex items-center justify-center py-2 md:py-4 min-h-0">
                <GameBoard 
                  playerTricks={state.playerTricks} 
                  aiTricks={state.aiTricks}
                  trickWinners={state.trickWinners}
                  lastRoundWinner={state.lastRoundWinner}
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
                <div className="bg-black/40 border-t-2 border-yellow-900/50 shadow-lg rounded-t-lg p-2 flex justify-between items-center gap-4">
                    <LogButton onClick={() => dispatch({ type: ActionType.TOGGLE_GAME_LOG_EXPAND })} className="lg:hidden">
                      Registro
                    </LogButton>
                    <ActionBar dispatch={dispatch} gameState={state} />
                    <LogButton onClick={() => dispatch({ type: ActionType.TOGGLE_AI_LOG_EXPAND })} className="lg:hidden">
                      Lógica IA
                    </LogButton>
                </div>
            </div>

          </div>
        </div>
        
        {/* Right Panel */}
        <div className="hidden lg:flex w-full max-w-xs flex-shrink-0">
          <AiLogPanel log={state.aiReasoningLog} dispatch={dispatch} isModal={false} />
        </div>
      </div>

      {/* MODALS for smaller screens */}
      <div className="lg:hidden">
        {state.isGameLogExpanded && <MessageLog messages={state.messageLog} dispatch={dispatch} isModal={true} />}
        {state.isLogExpanded && <AiLogPanel log={state.aiReasoningLog} dispatch={dispatch} isModal={true} />}
      </div>
      
      {state.winner && (
        <GameOverModal winner={state.winner} onPlayAgain={() => dispatch({ type: ActionType.RESTART_GAME })} />
      )}
    </div>
  );
};

export default App;