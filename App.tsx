import React, { useReducer, useEffect } from 'react';
import { useGameReducer, initialState } from './hooks/useGameReducer';
import { getLocalAIMove } from './services/localAiService';
import { ActionType } from './types';
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
              dispatch({ type: ActionType.AI_THINKING, payload: false });
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


  const handlePlayCard = (cardIndex: number) => {
    if (state.currentTurn === 'player') {
      dispatch({ type: ActionType.PLAY_CARD, payload: { player: 'player', cardIndex } });
    }
  };

  const LogButton: React.FC<{onClick: () => void, children: React.ReactNode}> = ({ onClick, children }) => (
    <button onClick={onClick} className="px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-lg font-semibold text-yellow-200 bg-black/40 border-2 border-yellow-800/80 shadow-md hover:bg-black/60 hover:border-yellow-600 transition-colors">
      {children}
    </button>
  );

  return (
    <div className="h-screen bg-green-900 text-white font-sans flex flex-col p-2 md:p-4 relative overflow-hidden" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')"}}>
       {/* Corner Overlays */}
       <Scoreboard playerScore={state.playerScore} aiScore={state.aiScore} className="absolute top-2 left-2 md:top-4 md:left-4 z-40" />
       <button 
        onClick={() => dispatch({ type: ActionType.TOGGLE_DEBUG_MODE })}
        className={`absolute top-2 right-2 md:top-4 md:right-4 z-50 px-2 py-0.5 text-[10px] md:px-3 md:py-1 md:text-xs rounded-md border-2 transition-colors ${state.isDebugMode ? 'bg-yellow-500 border-yellow-300 text-black font-bold' : 'bg-gray-700/50 border-gray-500 text-white'}`}
       >
        VER CARTAS
       </button>
      
      {/* Main Game Layout */}
      <div className="relative z-10 flex flex-col flex-grow w-full max-w-screen-xl mx-auto h-full">
        
        {/* TOP: Title & AI Hand */}
        <div className="flex-shrink-0 h-[150px] md:h-[170px] flex flex-col items-center justify-start pt-1 md:pt-2">
            <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-cinzel font-bold tracking-wider text-yellow-300" style={{ textShadow: '3px 3px 5px rgba(0,0,0,0.8)' }}>TRUCO</h1>
                <p className="text-xs md:text-sm text-gray-200 tracking-widest">Ronda {state.round} | Mano: {state.mano === 'player' ? 'Tú' : 'IA'}</p>
            </div>
            <div className="flex-grow flex items-center">
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
        <div className="flex-shrink-0 flex items-start justify-center py-2 md:py-4">
            <GameBoard 
              playerTricks={state.playerTricks} 
              aiTricks={state.aiTricks}
              currentTrick={state.currentTrick}
              trickWinners={state.trickWinners}
              mano={state.mano}
            />
        </div>

        {/* Spacer to push player hand and action bar to bottom */}
        <div className="flex-grow" />

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
                <LogButton onClick={() => dispatch({ type: ActionType.TOGGLE_GAME_LOG_EXPAND })}>
                  Registro
                </LogButton>
                <ActionBar dispatch={dispatch} gameState={state} />
                <LogButton onClick={() => dispatch({ type: ActionType.TOGGLE_AI_LOG_EXPAND })}>
                  Lógica IA
                </LogButton>
             </div>
        </div>

      </div>

      {/* MODALS */}
      {state.winner && (
        <GameOverModal winner={state.winner} onPlayAgain={() => dispatch({ type: ActionType.RESTART_GAME })} />
      )}
      <MessageLog messages={state.messageLog} isExpanded={state.isGameLogExpanded} dispatch={dispatch} />
      <AiLogPanel log={state.aiReasoningLog} isExpanded={state.isLogExpanded} dispatch={dispatch} />

    </div>
  );
};

export default App;