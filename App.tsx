
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
        
        const initialReasoning = `It is my turn to act. Phase: ${state.gamePhase}. My hand: ${state.aiHand.length} cards.`;
        dispatch({ type: ActionType.ADD_AI_REASONING_LOG, payload: { round: state.round, reasoning: initialReasoning } });

        const aiMove = getLocalAIMove(state);
        
        if (aiMove) {
          dispatch({ type: ActionType.ADD_AI_REASONING_LOG, payload: { round: state.round, reasoning: aiMove.reasoning } });
          
          setTimeout(() => {
            dispatch(aiMove.action);
            dispatch({ type: ActionType.AI_THINKING, payload: false });
          }, 700);
        } else {
           const confusionMsg = "AI is confused and cannot determine a move.";
           dispatch({ type: ActionType.ADD_MESSAGE, payload: confusionMsg });
           dispatch({ type: ActionType.ADD_AI_REASONING_LOG, payload: { round: state.round, reasoning: confusionMsg } });
           dispatch({ type: ActionType.AI_THINKING, payload: false });
        }
      };
      
      const timeoutId = setTimeout(handleAiTurn, 1200);
      return () => clearTimeout(timeoutId);
    }
  }, [state.currentTurn, state.isThinking, state.winner, state.round, dispatch, state.gamePhase, state.aiHand]);


  const handlePlayCard = (cardIndex: number) => {
    if (state.currentTurn === 'player') {
      dispatch({ type: ActionType.PLAY_CARD, payload: { player: 'player', cardIndex } });
    }
  };

  return (
    <div className="min-h-screen bg-green-900 text-white font-sans flex flex-col p-2 md:p-4 relative overflow-hidden" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')"}}>
       {/* Corner Overlays */}
       <Scoreboard playerScore={state.playerScore} aiScore={state.aiScore} className="absolute top-2 left-2 md:top-4 md:left-4 z-20" />
       <button 
        onClick={() => dispatch({ type: ActionType.TOGGLE_DEBUG_MODE })}
        className={`absolute top-2 right-2 md:top-4 md:right-4 z-50 px-2 py-0.5 text-[10px] md:px-3 md:py-1 md:text-xs rounded-md border-2 transition-colors ${state.isDebugMode ? 'bg-yellow-500 border-yellow-300 text-black font-bold' : 'bg-gray-700/50 border-gray-500 text-white'}`}
       >
        DEBUG CARDS
       </button>
      
      {/* Main Centered Content */}
      <div className="relative z-10 flex flex-col flex-grow w-full max-w-screen-xl mx-auto h-full">
        
        {/* TOP: Title & AI Hand */}
        <div className="flex-shrink-0 h-[180px] md:h-[220px] flex flex-col items-center justify-start pt-0 md:pt-2">
            <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-cinzel font-bold tracking-wider text-yellow-300" style={{ textShadow: '3px 3px 5px rgba(0,0,0,0.8)' }}>TRUCO</h1>
                <p className="text-xs md:text-sm text-gray-200 tracking-widest">Round {state.round} | Mano: {state.mano === 'player' ? 'You' : 'AI'}</p>
            </div>
            <div className="mt-2 md:mt-4 flex-grow flex items-center">
                 <PlayerHand 
                    cards={state.aiHand} 
                    playerType="ai" 
                    isThinking={state.isThinking} 
                    isDebugMode={state.isDebugMode} 
                />
            </div>
        </div>

        {/* MIDDLE: Board */}
        <div className="flex-grow flex items-center justify-center py-2 md:py-4">
            <GameBoard 
              playerTricks={state.playerTricks} 
              aiTricks={state.aiTricks}
              currentTrick={state.currentTrick}
              trickWinners={state.trickWinners}
            />
        </div>

        {/* BOTTOM: Player Hand & Actions */}
        <div className="flex-shrink-0 h-[240px] md:h-[280px] flex flex-col items-center justify-end pb-2">
             <div className="mb-2 md:mb-4 flex-grow flex flex-row items-end justify-center gap-2 md:gap-4 w-full">
                <MessageLog messages={state.messageLog} className="h-[180px] md:h-[200px]" />
                <PlayerHand 
                    cards={state.playerHand} 
                    onCardPlay={handlePlayCard} 
                    playerType="player" 
                    isMyTurn={state.currentTurn === 'player'}
                />
                <AiLogPanel log={state.aiReasoningLog} isExpanded={state.isLogExpanded} dispatch={dispatch} className="h-[180px] md:h-[200px]" />
             </div>
             <ActionBar dispatch={dispatch} gameState={state} />
        </div>

      </div>

      {state.winner && (
        <GameOverModal winner={state.winner} onPlayAgain={() => dispatch({ type: ActionType.RESTART_GAME })} />
      )}
    </div>
  );
};

export default App;
