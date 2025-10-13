
import React, { useState, useReducer, useEffect } from 'react';
import { tutorialSteps, TutorialStep } from '../services/tutorialService';
import { Action, ActionType, GameState, Card } from '../types';
import { initialState, useGameReducer } from '../hooks/useGameReducer';
import PlayerHand from './PlayerHand';
import CardComponent from './Card';
import { useLocalization } from '../context/LocalizationContext';
import TutorPanel from './TutorPanel';

interface TutorialProps {
  onExit: () => void;
}

const TutorialButton: React.FC<{ onClick: () => void; children: React.ReactNode; highlighted?: boolean, disabled?: boolean, className?: string }> = ({ onClick, children, highlighted, disabled, className }) => {
    const baseClasses = "px-4 py-2 text-sm lg:text-base rounded-lg font-bold text-white shadow-lg transition-transform transform hover:scale-105 border-b-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
    const highlightClass = highlighted && !disabled ? 'animate-pulse ring-4 ring-yellow-400 ring-opacity-75' : '';
    const colorClasses = 'bg-gradient-to-b from-yellow-600 to-yellow-700 border-yellow-900 hover:from-yellow-500 hover:to-yellow-600';
    return (
        <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${colorClasses} ${highlightClass} ${className}`}>
            {children}
        </button>
    )
}

const Tutorial: React.FC<TutorialProps> = ({ onExit }) => {
  const { t } = useLocalization();
  const [stepIndex, setStepIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const scenario = tutorialSteps[stepIndex];

  const [gameState, dispatch] = useReducer(useGameReducer, initialState);

  useEffect(() => {
    setFeedback(null);
    const createTutorialState = (step: TutorialStep): Partial<GameState> => ({
      playerHand: step.playerHand || [],
      aiHand: step.aiHand || [],
      initialPlayerHand: step.playerHand || [],
      initialAiHand: step.aiHand || [],
      playerTricks: [null, null, null],
      aiTricks: [null, null, null],
      trickWinners: [null, null, null],
      currentTrick: 0,
      round: 1,
      gamePhase: 'trick_1',
      currentTurn: 'player',
      isDebugMode: true,
      messageLog: [],
    });
    dispatch({ type: ActionType.LOAD_IMPORTED_DATA, payload: createTutorialState(scenario) });
  }, [stepIndex, scenario]);

  const handleNextStep = () => {
    if (stepIndex < tutorialSteps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onExit();
    }
  };
  
  const handlePrevStep = () => {
      if (stepIndex > 0) {
          setStepIndex(stepIndex - 1);
      }
  }

  const handleQuizAnswer = (selectedIndex: 0 | 1) => {
      if (selectedIndex === scenario.quizOptions?.correct) {
          setFeedback({ type: 'success', message: scenario.successMessageKey ? t(scenario.successMessageKey) : t('tutorial.feedback_correct') });
          setTimeout(handleNextStep, 1500);
      } else {
          setFeedback({ type: 'error', message: t('tutorial.feedback_try_again') });
          setTimeout(() => setFeedback(null), 1500);
      }
  };
  
  const handlePlayerAction = (action: Action) => {
      if (scenario.validateAction && scenario.validateAction(action)) {
          setFeedback({ type: 'success', message: scenario.successMessageKey ? t(scenario.successMessageKey) : t('tutorial.feedback_well_done') });
          setTimeout(handleNextStep, 1500);
      } else {
          setFeedback({ type: 'error', message: t('tutorial.feedback_wrong_action') });
          setTimeout(() => setFeedback(null), 2000);
      }
  }

  const renderStepContent = () => {
    // Layout A: Text-centric
    if (scenario.type === 'intro' || scenario.type === 'conclusion' || scenario.type === 'truco_intro') {
      return (
        <div className="flex-1 w-full flex justify-center items-center p-4">
          <TutorPanel title={t(scenario.titleKey)} message={t(scenario.tutorMessageKey)} extraContent={feedback && <p className={`mt-2 font-bold ${feedback.type === 'success' ? 'text-yellow-300' : 'text-red-400'}`}>{feedback.message}</p>} />
        </div>
      );
    }

    // Layout B: Text + Visuals
    if (scenario.type.startsWith('hierarchy')) {
      let content;
      if (scenario.type === 'hierarchy_intro') {
        const topCards: Card[] = [
          { rank: 1, suit: 'espadas' }, { rank: 1, suit: 'bastos' },
          { rank: 7, suit: 'espadas' }, { rank: 7, suit: 'oros' }
        ];
        content = <div className="flex flex-wrap justify-center gap-4">{topCards.map(c => <CardComponent key={`${c.rank}-${c.suit}`} card={c} />)}</div>;
      } else { // hierarchy_quiz
        content = <div className="flex flex-wrap justify-center gap-8">{scenario.quizOptions?.cards.map((card, index) => (<button key={index} onClick={() => handleQuizAnswer(index as 0 | 1)} className="transform transition-transform hover:scale-105"><CardComponent card={card} /></button>))}</div>;
      }
      return (
        <div className="flex-1 w-full flex flex-col justify-center items-center gap-8 p-4">
           <TutorPanel title={t(scenario.titleKey)} message={t(scenario.tutorMessageKey)} extraContent={feedback && <p className={`mt-2 font-bold ${feedback.type === 'success' ? 'text-yellow-300' : 'text-red-400'}`}>{feedback.message}</p>} />
          {content}
        </div>
      );
    }
    
    // Layout C: Practice Steps
    if (scenario.type.startsWith('envido') || scenario.type.startsWith('truco')) {
      return (
        <div className="flex-1 w-full flex flex-col justify-between items-center p-2">
            {/* AI Hand Area */}
            <div className="w-full h-[150px] flex-shrink-0">
                {gameState.aiHand.length > 0 && <PlayerHand cards={gameState.aiHand} playerType="ai" isDebugMode={true} />}
            </div>

            {/* Tutor Panel in the middle */}
             <TutorPanel title={t(scenario.titleKey)} message={t(scenario.tutorMessageKey)} extraContent={feedback && <p className={`mt-2 font-bold ${feedback.type === 'success' ? 'text-yellow-300' : 'text-red-400'}`}>{feedback.message}</p>} />

            {/* Player Hand Area */}
            <div className="w-full h-[240px] flex-shrink-0">
                {gameState.playerHand.length > 0 && <PlayerHand cards={gameState.playerHand} playerType="player" isMyTurn={true} onCardPlay={() => {}} />}
            </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-screen bg-green-900 text-white font-sans overflow-hidden flex flex-col" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')"}}>
      <div className="absolute top-2 right-2 z-50 flex gap-2">
          <button 
              onClick={onExit}
              className="px-4 py-2 text-sm rounded-md border-2 bg-red-700/80 border-red-500 text-white transition-colors hover:bg-red-600/90"
          >
              {t('tutorial.exit')}
          </button>
      </div>

      <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto overflow-y-auto">
        {renderStepContent()}
      </div>

      {/* BOTTOM: Action Bar */}
      <div className="flex-shrink-0 w-full z-20">
          <div className="bg-black/40 border-t-2 border-yellow-900/50 shadow-lg p-2 flex justify-center items-center gap-4 min-h-[64px]">
             <TutorialButton onClick={handlePrevStep} disabled={stepIndex === 0} className="!from-gray-600 !to-gray-700 !border-gray-900 hover:!from-gray-500 hover:!to-gray-600">
                  {t('tutorial.previous')}
              </TutorialButton>
              
              {scenario.highlightedAction === ActionType.CALL_ENVIDO && (
                  <TutorialButton highlighted={true} onClick={() => handlePlayerAction({type: ActionType.CALL_ENVIDO})}>{t('actionBar.envido')}</TutorialButton>
              )}
              {scenario.highlightedAction === ActionType.CALL_TRUCO && (
                   <TutorialButton highlighted={true} onClick={() => handlePlayerAction({type: ActionType.CALL_TRUCO})}>{t('actionBar.truco')}</TutorialButton>
              )}
              
              <TutorialButton onClick={handleNextStep}>
                  {scenario.isFinalStep ? t('tutorial.start_playing') : t('tutorial.next')}
              </TutorialButton>
          </div>
      </div>
    </div>
  );
};

export default Tutorial;
