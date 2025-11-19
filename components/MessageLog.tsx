
import React, { useEffect, useRef } from 'react';
import { Action, ActionType, MessageObject } from '../types';
import { useLocalization } from '../context/LocalizationContext';

interface MessageLogProps {
  messages: (string | MessageObject)[];
  dispatch: React.Dispatch<Action>;
  isModal: boolean;
}

const MessageLog: React.FC<MessageLogProps> = ({ messages, dispatch, isModal }) => {
  const { t, translatePlayerName, language } = useLocalization();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [messages]);

  const getMessageStyle = (message: string): string => {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('truco') || lowerMessage.includes('retruco') || lowerMessage.includes('vale cuatro')) return 'text-amber-300 font-bold';
      if (lowerMessage.includes('envido')) return 'text-cyan-300 font-bold';
      if (lowerMessage.includes('flor') || lowerMessage.includes('contraflor')) return 'text-purple-300 font-bold';
      if (lowerMessage.includes('quiere') || lowerMessage.includes('querés')) return 'text-green-400 font-semibold';
      if (lowerMessage.includes('no quiere') || lowerMessage.includes('no querés')) return 'text-red-400 font-semibold';
      if (lowerMessage.includes('gana') || lowerMessage.includes('wins')) return 'text-yellow-100 font-bold bg-white/5 px-1 rounded';
      return 'text-stone-300'; // default color
  };

  const renderMessage = (msg: string | MessageObject): string => {
    if (typeof msg === 'string') return msg;
    
    let finalKey = msg.key;
    const options = { ...msg.options };

    if (language === 'es-AR') {
        const actorIsPlayer = options.acceptor === 'player' || options.decliner === 'player';
        if (actorIsPlayer) {
            if (msg.key === 'log.accept') finalKey = 'log.accept_voseo';
            else if (msg.key === 'log.decline') finalKey = 'log.decline_voseo';
        }
    }
    
    const playerKeys: (keyof typeof options)[] = ['winner', 'winnerName', 'acceptor', 'acceptorName', 'decliner', 'declinerName', 'caller', 'player'];
    for (const key of playerKeys) {
        if (options[key]) {
            options[key] = translatePlayerName(options[key] as string);
        }
    }
    return t(finalKey, options);
  };


  const groupedLog: { [key: string]: string[] } = {};
  let currentRound = t('logPanel.game_start');
  messages.forEach(msg => {
    const isSeparator = typeof msg === 'object' && msg.type === 'round_separator';
    const messageString = renderMessage(msg);

    if (isSeparator) {
      currentRound = messageString.replace(/---/g, '').trim();
      groupedLog[currentRound] = [];
    } else {
      if (!groupedLog[currentRound]) {
        groupedLog[currentRound] = [];
      }
      groupedLog[currentRound].push(messageString);
    }
  });

  const wrapperClasses = isModal
    ? "fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm"
    : "h-full w-full";
    
  const containerClasses = "bg-stone-900/95 border-l-4 border-r-4 border-amber-700/40 shadow-2xl w-full h-full flex flex-col " +
    (isModal ? " max-w-2xl max-h-[80vh] rounded-xl border-t-4 border-b-4" : "");

  return (
    <div className={wrapperClasses}>
      <div className={containerClasses}>
        {/* Header */}
        <div className="p-3 bg-stone-950 border-b border-amber-700/30 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg lg:text-xl font-bold text-amber-500 font-cinzel tracking-widest uppercase flex items-center gap-2">
             <span>📜</span> {t('logPanel.game_log_title')}
          </h2>
          {isModal && (
            <button
              onClick={() => dispatch({ type: ActionType.TOGGLE_GAME_LOG_EXPAND })}
              className="text-stone-500 hover:text-amber-400 transition-colors"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4 flex-grow overflow-y-auto font-lora" ref={scrollRef}>
          {Object.keys(groupedLog).reverse().map((roundKey, rIndex) => (
            <div key={`round-${roundKey}`} className={`mb-6 ${rIndex > 0 ? 'opacity-70' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                 <div className="h-px flex-grow bg-gradient-to-r from-transparent via-amber-700/50 to-transparent"></div>
                 <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest whitespace-nowrap font-cinzel">
                    {roundKey}
                 </h3>
                 <div className="h-px flex-grow bg-gradient-to-r from-transparent via-amber-700/50 to-transparent"></div>
              </div>
              <div className="space-y-1.5 pl-2 border-l-2 border-stone-800 ml-2">
                  {groupedLog[roundKey].map((message, index) => {
                      const styleClass = getMessageStyle(message);
                      return (
                      <p key={index} className={`text-sm pl-2 leading-relaxed ${styleClass}`}>
                          {message}
                      </p>
                      );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MessageLog;
