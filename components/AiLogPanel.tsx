
import React from 'react';
import { AiReasoningEntry, Action, ActionType } from '../types';
import { useLocalization } from '../context/LocalizationContext';

interface AiLogPanelProps {
  log: AiReasoningEntry[];
  dispatch: React.Dispatch<Action>;
  isModal: boolean;
}

const AiLogPanel: React.FC<AiLogPanelProps> = ({ log, dispatch, isModal }) => {
  const { t } = useLocalization();
  const groupedLog: { [key: number]: string[] } = log.reduce((acc, entry) => {
    if (!acc[entry.round]) {
      acc[entry.round] = [];
    }
    acc[entry.round].push(entry.reasoning);
    return acc;
  }, {} as { [key: number]: string[] });

  const wrapperClasses = isModal
    ? "fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
    : "h-full w-full";

  const containerClasses = "bg-blue-900/95 border-4 border-cyan-400/50 rounded-xl shadow-2xl w-full h-full flex flex-col" +
    (isModal ? " max-w-2xl max-h-[90vh]" : "");

  return (
    <div className={wrapperClasses}>
      <div className={containerClasses}>
        <div className="p-4 border-b-2 border-cyan-400/30 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl lg:text-2xl font-bold text-cyan-300 font-cinzel tracking-widest" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>
            {t('logPanel.ai_log_title')}
          </h2>
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
          {Object.keys(groupedLog).reverse().map(roundKey => {
            const roundNumber = parseInt(roundKey, 10);
            if (roundNumber === 0) return null; // Don't show "Round 0"
            
            return (
            <div key={`round-${roundNumber}`} className="mb-4">
              <h3 className="text-base lg:text-lg font-bold text-yellow-300 border-b border-yellow-300/30 mb-2 pb-1">
                {t('common.round')} {roundNumber}
              </h3>
              <div className="space-y-2">
                  {groupedLog[roundNumber].map((reasoning, index) => (
                      <div key={index} className="bg-black/30 p-2 rounded-md">
                          <p className="text-xs lg:text-sm text-cyan-100 whitespace-pre-wrap font-mono">
                              {reasoning}
                          </p>
                      </div>
                  ))}
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
};

export default AiLogPanel;
