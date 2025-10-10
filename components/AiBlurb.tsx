import React from 'react';
import { Action, ActionType } from '../types';

interface AiBlurbProps {
  text: string;
  isVisible: boolean;
  dispatch: React.Dispatch<Action>;
}

const AiBlurb: React.FC<AiBlurbProps> = ({ text, isVisible, dispatch }) => {
  const handleDismiss = () => {
    dispatch({ type: ActionType.CLEAR_AI_BLURB });
  };

  return (
    <div
      onClick={handleDismiss}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDismiss(); }}
      role={isVisible ? 'button' : undefined}
      tabIndex={isVisible ? 0 : -1}
      className={`absolute top-[70px] lg:top-[80px] left-1/2 -translate-x-1/2 w-80 lg:w-96 p-4 bg-black/80 border-2 border-cyan-400 rounded-lg shadow-lg shadow-cyan-500/30 transition-all duration-500 ease-in-out font-vt323 text-cyan-200 text-lg lg:text-xl text-center z-40 ${
        isVisible ? 'opacity-100 translate-y-0 cursor-pointer' : 'opacity-0 -translate-y-5 pointer-events-none'
      }`}
      style={{ textShadow: '0 0 5px currentColor' }}
    >
      {/* Speech bubble tail pointing down */}
      <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-cyan-400"></div>
      <p>"{text}"</p>
    </div>
  );
};

export default AiBlurb;
