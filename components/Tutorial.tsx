
import React, { useState, useReducer, useEffect } from 'react';
import { tutorialScenarios, TutorialStep } from '../services/tutorialService';
import { Action, ActionType, GameState } from '../types';
import { initialState, useGameReducer } from '../hooks/useGameReducer';

import GameBoard from './GameBoard';
import PlayerHand from './PlayerHand';
import TutorPanel from './TutorPanel';

interface TutorialProps {
  onExit: () => void;
}

const TutorialButton: React.FC<{ onClick: () => void; children: React.ReactNode; highlighted?: boolean }> = ({ onClick, children, highlighted }) => {
    const baseClasses = "px-4 py-2 text-sm lg:text-base rounded-lg font-bold text-white shadow-lg transition-transform transform hover:scale-105 border-b-4";
    const highlightClass = highlighted ? 'animate-pulse' : '';
    return (
        <button onClick={onClick} className={`${baseClasses} ${highlightClass} bg-gradient-to-b from-yellow-600 to-yellow-700 border-yellow-900 hover:from-yellow-500 hover:to-yellow-600`}>
            {children}
        </button>
    )
}

const Tutorial: React.FC<TutorialProps> = ({ onExit }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const scenario = tutorialScenarios[stepIndex];

  // This reducer is just used to hold a GameState-like object for component compatibility.
  // We manually reset its state on each step.
  const [gameState, dispatch] = useReducer(useGameReducer, initialState);

  useEffect(() => {
    const createTutorialState = (step: TutorialStep): Partial<GameState> => ({
      playerHand: step.playerHand,
      aiHand: step.aiHand,
      initialPlayerHand: step.playerHand,
      initialAiHand: step.aiHand,
      playerTricks: step.playerTricks || [null, null, null],
      aiTricks: step.aiTricks || [null, null, null],
      trickWinners: step.trickWinners || [null, null, null],
      currentTrick: step.currentTrick || 0,
      round: 1,
      gamePhase: 'trick_1',
      currentTurn: 'player',
      isDebugMode: true,
      messageLog: [],
    });
    dispatch({ type: ActionType.LOAD_IMPORTED_DATA, payload: createTutorialState(scenario) });
  }, [stepIndex, scenario]);

  const handleNextStep = () => {
    if (stepIndex < tutorialScenarios.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onExit();
    }
  };

  const handlePlayerAction = (action: Action) => {
    if (scenario.validateAction && scenario.validateAction(action)) {
      if (scenario.nextStepOnSuccess) {
        // We don't need a formal alert, the step will just advance.
        handleNextStep();
      }
    } else {
        // Maybe add a subtle shake or visual feedback later if an action is wrong.
    }
  };

  const isLastStep = stepIndex === tutorialScenarios.length - 1;

  return (
    <div className="h-screen bg-green-900 text-white font-sans overflow-hidden" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')"}}>
      <div className="w-full h-full max-w-screen-2xl mx-auto flex flex-col relative p-2 lg:p-4">
        
        <div className="absolute top-1 right-1 z-50 flex gap-2 p-1">
            <button 
                onClick={onExit}
                className="px-4 py-2 text-sm rounded-md border-2 bg-red-700/80 border-red-500 text-white transition-colors hover:bg-red-600/90"
            >
                Salir del Tutorial
            </button>
        </div>

        {/* TOP: AI Hand - Always visible for learning */}
        <div className="flex-shrink-0 flex flex-col items-center justify-start pt-1 lg:pt-2">
            <PlayerHand 
                cards={gameState.aiHand} 
                playerType="ai" 
                isDebugMode={true} 
            />
        </div>
        
        <TutorPanel 
            title={scenario.title}
            message={scenario.tutorMessage}
            extraContent={scenario.extraContent}
        />

        {/* MIDDLE: Board */}
        <div className="flex-grow flex items-center justify-center py-2 lg:py-4 min-h-0">
            <GameBoard 
                playerTricks={gameState.playerTricks} 
                aiTricks={gameState.aiTricks}
                trickWinners={gameState.trickWinners}
                lastRoundWinner={null}
                gamePhase={gameState.gamePhase}
                dispatch={() => {}} // Dispatch is a no-op in tutorial
            />
        </div>

        {/* PLAYER HAND AREA */}
        <div className="flex-shrink-0 w-full z-10 pb-2">
            <PlayerHand 
                cards={gameState.playerHand} 
                onCardPlay={() => {}} // Card playing is disabled for these scenarios
                playerType="player" 
                isMyTurn={true}
            />
        </div>

        {/* BOTTOM: Action Bar */}
        <div className="flex-shrink-0 w-full z-20">
            <div className="bg-black/40 border-2 border-yellow-900/50 shadow-lg rounded-lg p-2 flex justify-center items-center gap-4 min-h-[64px]">
                {isLastStep ? (
                    <button onClick={onExit} className="px-6 py-3 text-lg rounded-lg font-bold text-white shadow-lg transition-transform transform hover:scale-105 border-b-4 bg-gradient-to-b from-green-600 to-green-700 border-green-900 hover:from-green-500 hover:to-green-600">
                        ¡Empezar a Jugar!
                    </button>
                ) : (
                    <>
                        {scenario.highlightedAction === 'envido' && (
                            <TutorialButton highlighted={true} onClick={() => handlePlayerAction({type: ActionType.CALL_ENVIDO})}>Envido</TutorialButton>
                        )}
                        {scenario.highlightedAction === 'truco' && (
                             <TutorialButton highlighted={true} onClick={() => handlePlayerAction({type: ActionType.CALL_TRUCO})}>Truco</TutorialButton>
                        )}
                        <button onClick={handleNextStep} className="px-4 py-2 text-sm lg:text-base rounded-lg font-bold text-white shadow-lg transition-transform transform hover:scale-105 border-b-4 bg-gray-600 border-gray-800 hover:bg-gray-500">Siguiente</button>
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
