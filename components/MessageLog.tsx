
import React from 'react';
import { Action, ActionType } from '../types';

interface MessageLogProps {
  messages: string[];
  isExpanded: boolean;
  dispatch: React.Dispatch<Action>;
}

const MessageLog: React.FC<MessageLogProps> = ({ messages, isExpanded, dispatch }) => {
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

  if (!isExpanded) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-green-900/95 border-4 border-yellow-400/50 rounded-xl shadow-2xl w-full max-w-2xl h-full max-h-[90vh] flex flex-col" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')"}}>
        <div className="p-4 border-b-2 border-yellow-400/30 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-bold text-yellow-300 font-cinzel tracking-widest" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>
            Registro de Juego
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
};

export default MessageLog;
