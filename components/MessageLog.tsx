
import React, { useRef, useEffect } from 'react';
import { Action, ActionType } from '../types';

interface MessageLogProps {
  messages: string[];
  isExpanded: boolean;
  dispatch: React.Dispatch<Action>;
  className?: string;
}

const MessageLog: React.FC<MessageLogProps> = ({ messages, isExpanded, dispatch, className = '' }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const groupedLog: { [key: string]: string[] } = {};
  let currentRound = 'Game Start';
  messages.forEach(msg => {
    if (msg.startsWith('--- Round')) {
      currentRound = msg.replace(/---/g, '').trim();
      groupedLog[currentRound] = [];
    } else {
      if (!groupedLog[currentRound]) {
        groupedLog[currentRound] = [];
      }
      groupedLog[currentRound].push(msg);
    }
  });


  if (isExpanded) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-green-900/95 border-4 border-yellow-400/50 rounded-xl shadow-2xl w-full max-w-2xl h-full max-h-[90vh] flex flex-col" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')"}}>
          <div className="p-4 border-b-2 border-yellow-400/30 flex justify-between items-center">
            <h2 className="text-xl md:text-2xl font-bold text-yellow-300 font-cinzel tracking-widest" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>
              Full Game Log
            </h2>
            <button
              onClick={() => dispatch({ type: ActionType.TOGGLE_GAME_LOG_EXPAND })}
              className="text-yellow-200 text-2xl md:text-3xl font-bold hover:text-white transition-colors"
            >
              &times;
            </button>
          </div>
          <div className="p-4 flex-grow overflow-y-auto">
            {Object.keys(groupedLog).reverse().map(roundKey => (
              <div key={`round-${roundKey}`} className="mb-4">
                <h3 className="text-base md:text-lg font-bold text-yellow-300 border-b border-yellow-300/30 mb-2 pb-1">
                  {roundKey}
                </h3>
                <div className="space-y-1 pl-2">
                    {groupedLog[roundKey].map((message, index) => (
                        <p key={index} className="text-xs md:text-sm text-amber-50 whitespace-pre-wrap">
                            {message}
                        </p>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => dispatch({ type: ActionType.TOGGLE_GAME_LOG_EXPAND })}
      className={`bg-black/30 p-2 md:p-3 rounded-lg shadow-xl border-2 border-yellow-700/30 w-52 md:w-64 shadow-inner shadow-black/30 cursor-pointer hover:border-yellow-500 transition-colors flex flex-col ${className}`}
    >
      <h3 className="text-base md:text-md font-bold text-center mb-2 text-yellow-300 font-cinzel tracking-widest flex-shrink-0" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>Game Log</h3>
      <div ref={logContainerRef} className="flex-grow overflow-y-auto text-xs md:text-sm pr-1 md:pr-2 text-amber-50">
        <p className="text-gray-300 text-center text-[10px] md:text-xs mb-1 italic">Click to expand</p>
        {messages.slice(-10).map((msg, index) => (
          <p key={index} className={`mb-1 ${msg.startsWith('---') ? 'text-yellow-400 font-bold' : ''}`}>
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
};

export default MessageLog;