import React from 'react';
import { Action, ActionType } from '../types';

interface MessageLogProps {
  messages: string[];
  dispatch: React.Dispatch<Action>;
  isModal: boolean;
}

const MessageLog: React.FC<MessageLogProps> = ({ messages, dispatch, isModal }) => {
  const groupedLog: { [key: string]: string[] } = {};
  let currentRound = 'Inicio del Juego';
  messages.forEach(msg => {
    if (msg.startsWith('--- Ronda')) {
      currentRound = msg.replace(/---/g, '').trim();
      groupedLog[currentRound] = [];
    } else {
      if (!groupedLog[currentRound]) {
        groupedLog[currentRound] = [];
      }
      groupedLog[currentRound].push(msg);
    }
  });

  const wrapperClasses = isModal
    ? "fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
    : "h-full w-full";
    
  const containerClasses = "bg-green-900/95 border-4 border-yellow-400/50 rounded-xl shadow-2xl w-full h-full flex flex-col" +
    (isModal ? " max-w-2xl max-h-[90vh]" : "");

  return (
    <div className={wrapperClasses}>
      <div className={containerClasses} style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')"}}>
        <div className="p-4 border-b-2 border-yellow-400/30 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-yellow-300 font-cinzel tracking-widest" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>
            Registro de Juego
          </h2>
          {isModal && (
            <button
              onClick={() => dispatch({ type: ActionType.TOGGLE_GAME_LOG_EXPAND })}
              className="text-yellow-200 text-2xl md:text-3xl font-bold hover:text-white transition-colors"
            >
              &times;
            </button>
          )}
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
};

export default MessageLog;
