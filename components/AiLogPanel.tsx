import React, { useState, useEffect } from 'react';
import { AiReasoningEntry, Action, ActionType, MessageObject, Card, RoundSummary } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import { getCardName } from '../services/trucoLogic';

interface AiLogPanelProps {
  log: AiReasoningEntry[];
  dispatch: React.Dispatch<Action>;
  isModal: boolean;
  roundHistory: RoundSummary[];
  currentRound: number;
}

const AiLogPanel: React.FC<AiLogPanelProps> = ({ log, dispatch, isModal, roundHistory, currentRound }) => {
  const { t } = useLocalization();
  const [selectedRound, setSelectedRound] = useState(currentRound);

  useEffect(() => {
    // When the game progresses to a new round, update the selected round to the current one.
    if (currentRound !== selectedRound) {
        setSelectedRound(currentRound);
    }
  }, [currentRound]);

  const handleRoundChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRound(Number(e.target.value));
  };

  const roundLog = log.filter(entry => entry.round === selectedRound);

  const getRoundScore = (roundNumber: number): string => {
    if (roundHistory.length === 0) return '';
    
    // Sum points awarded in all rounds *before* the selected one to find the starting score.
    let roundStartPlayerScore = 0;
    let roundStartAiScore = 0;
    for (const summary of roundHistory) {
      if (summary.round < roundNumber) {
        roundStartPlayerScore += summary.pointsAwarded.player;
        roundStartAiScore += summary.pointsAwarded.ai;
      }
    }

    return `(${t('common.you_short')}: ${roundStartPlayerScore} - ${t('common.ai')}: ${roundStartAiScore})`;
  };

  const displayRounds = Array.from(new Set([currentRound, ...roundHistory.map(r => r.round)]))
    .filter(r => r > 0) // Exclude round 0
    .sort((a, b) => b - a) // Sort descending
    .slice(0, 5); // Get the last 5 relevant rounds
  
  const renderReasoning = (reasoningArray: (string | MessageObject)[]): string => {
    return reasoningArray.map(reason => {
        if (typeof reason === 'string') return reason;

        const options: { [key: string]: any } = { ...reason.options };

        // Handle nested translations for specific keys
        if (options.statusKey) {
            options.status = t(`ai_logic.statuses.${options.statusKey}`);
        }
        
        // Handle player names or other identifiers that need translation within options
        if (options.player) {
            options.player = options.player === 'ai' ? t('common.ai') : t('common.player');
        }

        // Handle card objects, arrays of cards, and suits
        for (const key in options) {
            if (options[key] && typeof options[key] === 'object') {
                if (Array.isArray(options[key])) { // Handle hand: Card[]
                    options[key] = options[key].map((c: any) => getCardName(c)).join(', ');
                } else if ('rank' in options[key] && 'suit' in options[key]) { // Handle card: Card
                    options[key] = getCardName(options[key] as Card);
                }
            } else if (key === 'suit' && typeof options[key] === 'string') {
                options[key] = t(`common.card_suits.${options[key]}`);
            }
        }

        return t(reason.key, options);
    }).join('\n');
  };

  const wrapperClasses = isModal
    ? "fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
    : "h-full w-full";

  const containerClasses = "bg-blue-900/95 border-4 border-cyan-400/50 rounded-xl shadow-2xl w-full h-full flex flex-col" +
    (isModal ? " max-w-2xl max-h-[90vh]" : "");

  return (
    <div className={wrapperClasses}>
      <div className={containerClasses}>
        <div className="p-4 border-b-2 border-cyan-400/30 flex justify-between items-center flex-shrink-0 gap-2">
          <h2 className="text-xl lg:text-2xl font-bold text-cyan-300 font-cinzel tracking-widest flex-shrink-0" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>
            {t('logPanel.ai_log_title')}
          </h2>
          {displayRounds.length > 0 && (
            <select value={selectedRound} onChange={handleRoundChange} className="bg-blue-900/80 border border-cyan-400/50 text-white text-sm rounded-md p-1 w-full max-w-[200px] flex-shrink">
                {displayRounds.map(roundNumber => (
                    <option key={roundNumber} value={roundNumber}>
                        {t('common.round')} {roundNumber} {getRoundScore(roundNumber)}
                    </option>
                ))}
            </select>
          )}
          <button
            onClick={() => dispatch({ type: ActionType.TOGGLE_AI_LOG_EXPAND })}
            className="text-cyan-200 font-bold hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
            aria-label={isModal ? t('common.close') : t('logPanel.hide_ai_log')}
          >
            {isModal ? (
              <span className="text-2xl lg:text-3xl">&times;</span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
        <div className="p-4 flex-grow overflow-y-auto">
          {roundLog.length > 0 ? (
            <div className="space-y-2">
              {roundLog.map((entry, index) => (
                <div key={index} className="bg-black/30 p-2 rounded-md">
                  <p className="text-xs lg:text-sm text-cyan-100 whitespace-pre-wrap font-mono">
                    {renderReasoning(entry.reasoning)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center">{t('logPanel.no_log_for_round')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiLogPanel;