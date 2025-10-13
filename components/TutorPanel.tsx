
import React from 'react';

interface TutorPanelProps {
  title: string;
  message: string;
  extraContent?: React.ReactNode;
}

const TutorPanel: React.FC<TutorPanelProps> = ({ title, message, extraContent }) => {
  return (
    <div className="relative w-[90%] max-w-2xl p-4 my-4 bg-black/80 border-2 border-green-400 rounded-lg shadow-lg shadow-green-500/30 font-vt323 text-green-200 text-lg lg:text-xl text-center z-30 animate-fade-in-scale">
        <div className="absolute top-[-20px] left-10 w-16 h-16 rounded-full bg-green-900 border-2 border-green-400 flex items-center justify-center text-3xl">
          🤖
        </div>
        <h3 className="text-xl lg:text-2xl font-bold text-white mb-2 font-cinzel">{title}</h3>
        <p className="mb-3">{message}</p>
        {extraContent && <div className="mt-4 border-t border-green-400/50 pt-3">{extraContent}</div>}
    </div>
  );
};

export default TutorPanel;
