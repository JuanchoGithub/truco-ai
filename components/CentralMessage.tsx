
import React from 'react';

interface CentralMessageProps {
  message: string | null;
  isVisible: boolean;
  onDismiss: () => void;
}

const CentralMessage: React.FC<CentralMessageProps> = ({ message, isVisible, onDismiss }) => {
  if (!message && !isVisible) { // Remain mounted during fade-out
    return null;
  }
  
  const animationClass = isVisible ? 'animate-fade-in-scale' : 'animate-fade-out-scale';

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
      <div
        className={`text-center p-4 rounded-lg bg-black/80 border-2 border-yellow-300 shadow-2xl shadow-black ${animationClass} ${isVisible ? 'pointer-events-auto cursor-pointer' : ''}`}
        onClick={onDismiss}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onDismiss()}
        role="button"
        tabIndex={0}
      >
        <h3 className="text-lg lg:text-2xl font-cinzel text-white font-bold tracking-wider" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          {message}
        </h3>
      </div>
    </div>
  );
};

export default CentralMessage;
