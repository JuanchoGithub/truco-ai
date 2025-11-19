
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

const TutorialButton: React.FC<{ onClick: () => void; children: React.ReactNode; highlighted?: boolean, disabled?: boolean, variant?: 'primary' | 'secondary' }> = ({ onClick, children, highlighted, disabled, variant = 'primary' }) => {
    const baseClasses = "px-6 py-3 text-sm lg:text-base rounded-lg font-bold uppercase tracking-wider shadow-lg transition-all transform hover:-translate-y-1 border-b-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
    const highlightClass = highlighted && !disabled ? 'animate-pulse ring-4 ring-amber-300 ring-opacity-75' : '';
    
    const colorClasses = variant === 'primary' 
        ? 'bg-gradient-to-b from-amber-600 to-amber-700 border-amber-900 text-white hover:from-amber-500 hover:to-amber-600'
        : 'bg-gradient-to-b from-stone-600 to-stone-700 border-stone-900 text-stone-100 hover:from-stone-500 hover:to-stone-600';

    return (
        <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${colorClasses} ${highlightClass}`}>
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
        <div className="flex-1 w-full flex flex-col justify-center items-center p-4">
          <div className="mb-8 transform scale-125">
            <span className="text-6xl">🎓</span>
          </div>
          <TutorPanel title={t(scenario.titleKey)} message={t(scenario.tutorMessageKey)} extraContent={feedback && <p className={`mt-2 font-bold ${feedback.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>{feedback.message}</p>} />
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
        content = <div className="flex flex-wrap justify-center gap-4 animate-drop-in">{topCards.map(c => <CardComponent key={`${c.rank}-${c.suit}`} card={c} />)}</div>;
      } else { // hierarchy_quiz
        content = <div className="flex flex-wrap justify-center gap-8 animate-drop-in">{scenario.quizOptions?.cards.map((card, index) => (<button key={index} onClick={() => handleQuizAnswer(index as 0 | 1)} className="transform transition-transform hover:scale-110 hover:-translate-y-2"><CardComponent card={card} /></button>))}</div>;
      }
      return (
        <div className="flex-1 w-full flex flex-col justify-center items-center gap-8 p-4">
           <TutorPanel title={t(scenario.titleKey)} message={t(scenario.tutorMessageKey)} extraContent={feedback && <p className={`mt-2 font-bold ${feedback.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>{feedback.message}</p>} />
          {content}
        </div>
      );
    }
    
    // Layout C: Practice Steps
    if (scenario.type.startsWith('envido') || scenario.type.startsWith('truco')) {
      return (
        <div className="flex-1 w-full flex flex-col justify-between items-center p-2">
            <div className="w-full h-[150px] flex-shrink-0 flex items-center justify-center">
                 {/* Simple placeholder for AI hand visualization if needed */}
                 <div className="text-white/30 text-sm font-cinzel uppercase tracking-widest">Mano del Oponente</div>
            </div>

             <TutorPanel title={t(scenario.titleKey)} message={t(scenario.tutorMessageKey)} extraContent={feedback && <p className={`mt-2 font-bold ${feedback.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>{feedback.message}</p>} />

            <div className="w-full h-[240px] flex-shrink-0">
                {gameState.playerHand.length > 0 && <PlayerHand cards={gameState.playerHand} playerType="player" isMyTurn={true} onCardPlay={() => {}} />}
            </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-[100dvh] bg-green-950 text-white font-sans overflow-hidden flex flex-col relative">
      <div className="absolute inset-0 table-vignette pointer-events-none z-0"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-40 z-0"></div>

      <div className="relative z-30 w-full p-4 flex justify-between items-start">
          <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
              <span className="text-amber-400 font-bold font-cinzel tracking-widest">TUTORIAL</span>
              <span className="mx-2 text-white/50">|</span>
              <span className="text-white text-sm">{stepIndex + 1} / {tutorialSteps.length}</span>
          </div>
          <button 
              onClick={onExit}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white border border-white/20 hover:border-white/50 rounded-lg transition-colors"
          >
              {t('tutorial.exit')}
          </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col w-full max-w-4xl mx-auto overflow-y-auto">
        {renderStepContent()}
      </div>

      {/* BOTTOM: Action Bar */}
      <div className="relative z-30 flex-shrink-0 w-full bg-stone-900 border-t-4 border-amber-700/50 p-4 flex justify-center items-center gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
             <TutorialButton onClick={handlePrevStep} disabled={stepIndex === 0} variant="secondary">
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
  );
};

export default Tutorial;
