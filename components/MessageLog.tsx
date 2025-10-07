
import React, { useRef, useEffect } from 'react';

interface MessageLogProps {
  messages: string[];
  className?: string;
}

const MessageLog: React.FC<MessageLogProps> = ({ messages, className = '' }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className={`bg-black/30 p-2 md:p-3 rounded-lg shadow-xl border-2 border-yellow-700/30 w-44 md:w-56 shadow-inner shadow-black/30 flex flex-col ${className}`}>
      <h3 className="text-base md:text-md font-bold text-center mb-2 text-yellow-300 font-cinzel tracking-widest flex-shrink-0" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>Game Log</h3>
      <div ref={logContainerRef} className="flex-grow overflow-y-auto text-xs md:text-sm pr-1 md:pr-2 text-amber-50">
        {messages.map((msg, index) => (
          <p key={index} className={`mb-1 ${msg.startsWith('---') ? 'text-yellow-400 font-bold' : ''}`}>
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
};

export default MessageLog;
