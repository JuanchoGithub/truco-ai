
import React from 'react';
import { AiReasoningEntry, Action, ActionType } from '../types';

interface AiLogPanelProps {
  log: AiReasoningEntry[];
  isExpanded: boolean;
  dispatch: React.Dispatch<Action>;
  className?: string;
}

const AiLogPanel: React.FC<AiLogPanelProps> = ({ log, isExpanded, dispatch, className = '' }) => {
  const latestEntry = log[log.length - 1];

  const groupedLog: { [key: number]: string[] } = log.reduce((acc, entry) => {
    if (!acc[entry.round]) {
      acc[entry.round] = [];
    }
    acc[entry.round].push(entry.reasoning);
    return acc;
  }, {} as { [key: number]: string[] });

  if (isExpanded) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-blue-900/95 border-4 border-cyan-400/50 rounded-xl shadow-2xl w-full max-w-2xl h-full max-h-[90vh] flex flex-col">
          <div className="p-4 border-b-2 border-cyan-400/30 flex justify-between items-center">
            <h2 className="text-xl md:text-2xl font-bold text-cyan-300 font-cinzel tracking-widest" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>
              AI Reasoning Log
            </h2>
            <button
              onClick={() => dispatch({ type: ActionType.TOGGLE_AI_LOG_EXPAND })}
              className="text-cyan-200 text-2xl md:text-3xl font-bold hover:text-white transition-colors"
            >
              &times;
            </button>
          </div>
          <div className="p-4 flex-grow overflow-y-auto">
            {Object.keys(groupedLog).reverse().map(roundKey => {
              const roundNumber = parseInt(roundKey, 10);
              if (roundNumber === 0) return null; // Don't show "Round 0"
              
              return (
              <div key={`round-${roundNumber}`} className="mb-4">
                <h3 className="text-base md:text-lg font-bold text-yellow-300 border-b border-yellow-300/30 mb-2 pb-1">
                  Round {roundNumber}
                </h3>
                <div className="space-y-2">
                    {groupedLog[roundNumber].map((reasoning, index) => (
                        <div key={index} className="bg-black/30 p-2 rounded-md">
                            <p className="text-xs md:text-sm text-cyan-100 whitespace-pre-wrap font-mono">
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
  }

  return (
    <div 
      onClick={() => dispatch({ type: ActionType.TOGGLE_AI_LOG_EXPAND })}
      className={`bg-black/30 p-2 md:p-3 rounded-lg shadow-xl border-2 border-yellow-700/30 w-44 md:w-56 shadow-inner shadow-black/30 cursor-pointer hover:border-yellow-500 transition-colors flex flex-col ${className}`}
    >
      <h3 className="text-base md:text-md font-bold text-center mb-2 text-yellow-300 font-cinzel tracking-widest flex-shrink-0" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>
        AI Log
      </h3>
      <div className="flex-grow overflow-y-hidden text-[10px] md:text-xs pr-1 md:pr-2 text-amber-100 whitespace-pre-wrap font-mono">
        <p className="text-gray-300 text-center text-[10px] md:text-xs mb-1 italic">Click to expand</p>
        <p className="opacity-80">{latestEntry?.reasoning}</p>
      </div>
    </div>
  );
};

export default AiLogPanel;
